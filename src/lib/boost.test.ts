import { describe, it, expect } from 'vitest';
import { BOOST_TIERS as frontendTiers } from './boost';
// Deliberate: keeps the frontend and edge-function copies of BOOST_TIERS in
// sync (see comments in both files). Both files are plain TS with zero
// imports, so importing the Deno-side copy directly into a Vitest test
// works fine.
import { BOOST_TIERS as backendTiers } from '../../supabase/functions/_shared/boost';

describe('BOOST_TIERS sync', () => {
  it('keeps src/lib/boost.ts and supabase/functions/_shared/boost.ts numerically identical', () => {
    // These are two independent copies (Next.js code can't import from
    // supabase/functions/, so they can't share a single module) — this
    // test is the guard against them drifting apart. If this fails, you
    // changed one file and not the other.
    expect(frontendTiers).toEqual(backendTiers);
  });
});
