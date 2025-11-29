import { describe, it, expect } from 'vitest';
import { INTENSITY_MODIFIERS } from '@/services/gemini/critiquePrompts';

describe('critiquePrompts', () => {
  it('defines modifiers for all intensity levels', () => {
    expect(INTENSITY_MODIFIERS.developmental).toBeDefined();
    expect(INTENSITY_MODIFIERS.standard).toBeDefined();
    expect(INTENSITY_MODIFIERS.intensive).toBeDefined();
    expect(INTENSITY_MODIFIERS.developmental).toContain('DEVELOPMENTAL');
  });
});
