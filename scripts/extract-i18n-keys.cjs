#!/usr/bin/env node
/**
 * Quick-and-dirty extractor for i18next t() keys used in the source.
 * Run: node scripts/extract-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'test-results' || entry.name === '.playwright-mcp') continue;
      walk(full, files);
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name) && !entry.name.endsWith('.test.tsx') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

const nsKeys = {};

for (const file of walk(SRC_DIR)) {
  const content = fs.readFileSync(file, 'utf8');
  // match t('ns:key', ...) or t("ns:key", ...)
  const regex = /t\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const fullKey = m[1];
    const [ns, ...rest] = fullKey.split(':');
    const key = rest.join(':');
    if (!key) continue;
    nsKeys[ns] = nsKeys[ns] || new Set();
    nsKeys[ns].add(key);
  }
}

function loadJson(ns) {
  const enPath = path.join(__dirname, '..', 'src', 'i18n', 'locales', 'en', `${ns}.json`);
  if (!fs.existsSync(enPath)) return {};
  return JSON.parse(fs.readFileSync(enPath, 'utf8'));
}

function hasKey(obj, dotted) {
  const parts = dotted.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

const missing = [];
for (const [ns, keys] of Object.entries(nsKeys)) {
  const en = loadJson(ns);
  for (const key of keys) {
    if (!hasKey(en, key)) {
      missing.push({ ns, key });
    }
  }
}

console.log(`Used namespaces: ${Object.keys(nsKeys).join(', ')}`);
console.log(`Missing keys: ${missing.length}`);
for (const { ns, key } of missing) {
  console.log(`${ns}:${key}`);
}

if (missing.length > 0) {
  process.exit(1);
}
