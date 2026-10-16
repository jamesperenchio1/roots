#!/usr/bin/env node
/* Verifies that every statically-referenced translation key exists in both locales,
 * and that en/th have identical key sets. Usage: node scripts/check-i18n.cjs [--json] */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const localeDir = path.join(root, 'src/i18n/locales');
const langs = ['en', 'th'];

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

const keys = {};
for (const lang of langs) {
  keys[lang] = {};
  for (const f of fs.readdirSync(path.join(localeDir, lang))) {
    if (!f.endsWith('.json')) continue;
    keys[lang][f.replace('.json', '')] = flatten(JSON.parse(fs.readFileSync(path.join(localeDir, lang, f), 'utf8')));
  }
}

// plural suffixes are resolved by i18next at runtime
const plural = /_(zero|one|two|few|many|other|plural)$/;
const has = (lang, ns, key) => {
  const set = keys[lang][ns];
  if (!set) return false;
  if (set.has(key)) return true;
  for (const suf of ['_one', '_other', '_plural', '_zero', '_two', '_few', '_many']) if (set.has(key + suf)) return true;
  return false;
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'locales') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

const missing = [];
const callRe = /\bt\(\s*(['"`])([^'"`$\n]+?)\1/g;
for (const file of walk(path.join(root, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  const nsMatches = [...src.matchAll(/useTranslation\(\s*(\[[^\]]*\]|['"][\w-]+['"])/g)];
  let fileNs = ['common'];
  if (nsMatches.length) {
    fileNs = [...nsMatches[0][1].matchAll(/['"]([\w-]+)['"]/g)].map((x) => x[1]);
  }
  const defaultNs = fileNs[0];
  const rel = path.relative(root, file);
  for (const m of src.matchAll(callRe)) {
    let [ns, key] = m[2].includes(':') ? m[2].split(/:(.+)/) : [defaultNs, m[2]];
    if (!m[2].includes(':') && fileNs.length > 1) {
      // i18next falls back across the namespaces passed to useTranslation()
      const found = fileNs.find((n) => keys.en[n] && has('en', n, key) && has('th', n, key));
      if (found) continue;
    }
    if (key.endsWith('.') || !/^[\w.-]+$/.test(key) || !keys.en[ns]) {
      if (m[2].includes(':') && !keys.en[ns]) missing.push({ file: rel, ref: m[2], reason: 'unknown namespace' });
      continue;
    }
    // Skip things that obviously aren't i18n calls (e.g. Date helpers named t)
    for (const lang of langs) {
      if (!has(lang, ns, key)) missing.push({ file: rel, ref: `${ns}:${key}`, reason: `missing in ${lang}` });
    }
  }
}

const parity = [];
for (const ns of Object.keys(keys.en)) {
  for (const k of keys.en[ns]) if (!keys.th[ns]?.has(k) && !plural.test(k)) parity.push(`th missing ${ns}:${k}`);
  for (const k of keys.th[ns] || []) if (!keys.en[ns].has(k) && !plural.test(k)) parity.push(`en missing ${ns}:${k}`);
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ missing, parity }, null, 2));
} else {
  const uniq = [...new Set(missing.map((m) => `${m.ref}  (${m.reason})  ${m.file}`))];
  uniq.forEach((l) => console.log(l));
  parity.forEach((l) => console.log(l));
  console.log(`\n${uniq.length} missing references, ${parity.length} parity gaps`);
}
process.exit(missing.length || parity.length ? 1 : 0);
