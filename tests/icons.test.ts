/**
 * Coverage-preservation test for src/lib/icons.ts.
 *
 * Audit v2 P2-A moved SPEAKER_SVG into a shared module. Because callers
 * (level-filter, selection-tooltip) render it into Shadow DOM without going
 * through Vitest-covered code paths, v8 saw the export as uncovered and CI
 * coverage dropped by 0.11pp. A tiny direct import is enough to lift it back.
 */

import { describe, it, expect } from 'vitest';
import { SPEAKER_SVG } from '../src/lib/icons';

describe('icons.SPEAKER_SVG', () => {
  it('is a valid SVG string with viewBox and aria-hidden', () => {
    expect(SPEAKER_SVG).toContain('<svg');
    expect(SPEAKER_SVG).toContain('viewBox="0 0 24 24"');
    expect(SPEAKER_SVG).toContain('aria-hidden="true"');
    expect(SPEAKER_SVG).toContain('</svg>');
  });

  it('is inert markup (no <script> / event handlers)', () => {
    expect(SPEAKER_SVG).not.toMatch(/<script/i);
    expect(SPEAKER_SVG).not.toMatch(/\son\w+\s*=/i);
  });
});
