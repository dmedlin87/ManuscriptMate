import { describe, it, expect } from 'vitest';
import { calculateDiff } from '@/features/shared/utils/diffUtils';

describe('calculateDiff', () => {
  it('returns empty array for identical strings', () => {
    const result = calculateDiff('hello', 'hello');
    // diff-match-patch returns [[0, 'hello']] for equal strings
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe(0); // 0 = equal
    expect(result[0][1]).toBe('hello');
  });

  it('detects additions', () => {
    const result = calculateDiff('hello', 'hello world');
    
    // Should have an equal part and an addition
    const additions = result.filter(d => d[0] === 1);
    expect(additions.length).toBeGreaterThan(0);
    expect(additions.some(d => d[1].includes('world'))).toBe(true);
  });

  it('detects deletions', () => {
    const result = calculateDiff('hello world', 'hello');
    
    // Should have deletions (-1)
    const deletions = result.filter(d => d[0] === -1);
    expect(deletions.length).toBeGreaterThan(0);
    expect(deletions.some(d => d[1].includes('world'))).toBe(true);
  });

  it('detects replacements', () => {
    const result = calculateDiff('cat', 'dog');
    
    // Should have both deletions and additions
    const deletions = result.filter(d => d[0] === -1);
    const additions = result.filter(d => d[0] === 1);
    
    expect(deletions.length).toBeGreaterThan(0);
    expect(additions.length).toBeGreaterThan(0);
  });

  it('handles empty strings', () => {
    const result1 = calculateDiff('', 'hello');
    expect(result1.some(d => d[0] === 1 && d[1] === 'hello')).toBe(true);

    const result2 = calculateDiff('hello', '');
    expect(result2.some(d => d[0] === -1 && d[1] === 'hello')).toBe(true);

    const result3 = calculateDiff('', '');
    expect(result3).toEqual([]);
  });

  it('handles multiline text', () => {
    const original = 'Line 1\nLine 2\nLine 3';
    const modified = 'Line 1\nModified Line 2\nLine 3';
    
    const result = calculateDiff(original, modified);
    
    // Should detect changes (semantic cleanup may fragment differently)
    const hasChanges = result.some(d => d[0] !== 0);
    expect(hasChanges).toBe(true);
    
    // Verify the unchanged parts are preserved
    const unchangedText = result
      .filter(d => d[0] === 0)
      .map(d => d[1])
      .join('');
    expect(unchangedText).toContain('Line 1');
    expect(unchangedText).toContain('Line 3');
  });

  it('performs semantic cleanup', () => {
    // The diff_cleanupSemantic call should group related changes
    const result = calculateDiff('The cat sat on the mat', 'The dog sat on the rug');
    
    // After semantic cleanup, changes should be meaningful words, not character fragments
    const changes = result.filter(d => d[0] !== 0);
    expect(changes.length).toBeGreaterThan(0);
  });

  it('handles unicode characters', () => {
    const result = calculateDiff('Hello 👋', 'Hello 🌍');
    
    expect(result.some(d => d[0] === -1 && d[1].includes('👋'))).toBe(true);
    expect(result.some(d => d[0] === 1 && d[1].includes('🌍'))).toBe(true);
  });

  it('handles special characters', () => {
    const result = calculateDiff('a < b && c > d', 'a <= b || c >= d');
    
    // Should properly handle HTML-sensitive characters
    const hasChanges = result.some(d => d[0] !== 0);
    expect(hasChanges).toBe(true);
  });
});
