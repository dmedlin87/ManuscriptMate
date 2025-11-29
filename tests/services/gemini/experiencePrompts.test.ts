import { describe, it, expect } from 'vitest';
import { EXPERIENCE_MODIFIERS } from '@/services/gemini/experiencePrompts';

describe('experiencePrompts', () => {
  it('defines modifiers for all experience levels', () => {
    expect(EXPERIENCE_MODIFIERS.novice).toBeDefined();
    expect(EXPERIENCE_MODIFIERS.intermediate).toBeDefined();
    expect(EXPERIENCE_MODIFIERS.pro).toBeDefined();
    expect(EXPERIENCE_MODIFIERS.novice).toContain('NOVICE');
  });
});
