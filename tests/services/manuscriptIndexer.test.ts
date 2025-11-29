import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmptyIndex, mergeIntoIndex, extractEntities } from '@/services/manuscriptIndexer';
import { ManuscriptIndex } from '@/types/schema';

// Mock GoogleGenAI
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: mockGenerateContent,
    },
  })),
  Type: {
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
  },
}));

describe('createEmptyIndex', () => {
  it('returns an empty ManuscriptIndex', () => {
    const index = createEmptyIndex();
    
    expect(index).toEqual({
      characters: {},
      lastUpdated: {}
    });
  });

  it('returns a new object each time', () => {
    const index1 = createEmptyIndex();
    const index2 = createEmptyIndex();
    
    expect(index1).not.toBe(index2);
  });
});

describe('mergeIntoIndex', () => {
  it('adds new character to empty index', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [{
        name: 'Alice',
        attributes: { eye_color: 'blue' },
        position: 100
      }]
    };

    const { updatedIndex, contradictions } = mergeIntoIndex(
      emptyIndex,
      extraction,
      'chapter-1'
    );

    expect(contradictions).toHaveLength(0);
    expect(updatedIndex.characters['Alice']).toBeDefined();
    expect(updatedIndex.characters['Alice'].name).toBe('Alice');
    expect(updatedIndex.characters['Alice'].firstMention.chapterId).toBe('chapter-1');
    expect(updatedIndex.characters['Alice'].attributes.eye_color).toHaveLength(1);
    expect(updatedIndex.characters['Alice'].attributes.eye_color[0].value).toBe('blue');
  });

  it('adds mention for existing character', () => {
    const existingIndex: ManuscriptIndex = {
      characters: {
        'Alice': {
          name: 'Alice',
          attributes: { eye_color: [{ value: 'blue', chapterId: 'chapter-1', position: 50 }] },
          firstMention: { chapterId: 'chapter-1', position: 50 },
          mentions: [{ chapterId: 'chapter-1', position: 50 }]
        }
      },
      lastUpdated: { 'chapter-1': Date.now() }
    };

    const extraction = {
      characters: [{
        name: 'Alice',
        attributes: { eye_color: 'blue' }, // Same value
        position: 200
      }]
    };

    const { updatedIndex, contradictions } = mergeIntoIndex(
      existingIndex,
      extraction,
      'chapter-2'
    );

    expect(contradictions).toHaveLength(0);
    expect(updatedIndex.characters['Alice'].mentions).toHaveLength(2);
    expect(updatedIndex.characters['Alice'].attributes.eye_color).toHaveLength(2);
  });

  it('detects contradictions for different attribute values', () => {
    const existingIndex: ManuscriptIndex = {
      characters: {
        'Alice': {
          name: 'Alice',
          attributes: { eye_color: [{ value: 'blue', chapterId: 'chapter-1', position: 50 }] },
          firstMention: { chapterId: 'chapter-1', position: 50 },
          mentions: [{ chapterId: 'chapter-1', position: 50 }]
        }
      },
      lastUpdated: { 'chapter-1': Date.now() }
    };

    const extraction = {
      characters: [{
        name: 'Alice',
        attributes: { eye_color: 'green' }, // Different value!
        position: 200
      }]
    };

    const { updatedIndex, contradictions } = mergeIntoIndex(
      existingIndex,
      extraction,
      'chapter-2'
    );

    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].type).toBe('character_attribute');
    expect(contradictions[0].characterName).toBe('Alice');
    expect(contradictions[0].attribute).toBe('eye_color');
    expect(contradictions[0].originalValue).toBe('blue');
    expect(contradictions[0].newValue).toBe('green');
  });

  it('ignores case differences in attribute values', () => {
    const existingIndex: ManuscriptIndex = {
      characters: {
        'Alice': {
          name: 'Alice',
          attributes: { eye_color: [{ value: 'Blue', chapterId: 'chapter-1', position: 50 }] },
          firstMention: { chapterId: 'chapter-1', position: 50 },
          mentions: [{ chapterId: 'chapter-1', position: 50 }]
        }
      },
      lastUpdated: { 'chapter-1': Date.now() }
    };

    const extraction = {
      characters: [{
        name: 'Alice',
        attributes: { eye_color: 'blue' }, // Same value, different case
        position: 200
      }]
    };

    const { contradictions } = mergeIntoIndex(
      existingIndex,
      extraction,
      'chapter-2'
    );

    expect(contradictions).toHaveLength(0);
  });

  it('handles multiple characters in one extraction', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [
        { name: 'Alice', attributes: { age: '25' }, position: 100 },
        { name: 'Bob', attributes: { age: '30' }, position: 200 },
        { name: 'Charlie', attributes: {}, position: 300 }
      ]
    };

    const { updatedIndex, contradictions } = mergeIntoIndex(
      emptyIndex,
      extraction,
      'chapter-1'
    );

    expect(contradictions).toHaveLength(0);
    expect(Object.keys(updatedIndex.characters)).toHaveLength(3);
    expect(updatedIndex.characters['Alice']).toBeDefined();
    expect(updatedIndex.characters['Bob']).toBeDefined();
    expect(updatedIndex.characters['Charlie']).toBeDefined();
  });

  it('updates lastUpdated timestamp', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [{ name: 'Alice', attributes: {}, position: 100 }]
    };

    const before = Date.now();
    const { updatedIndex } = mergeIntoIndex(emptyIndex, extraction, 'chapter-1');
    const after = Date.now();

    expect(updatedIndex.lastUpdated['chapter-1']).toBeGreaterThanOrEqual(before);
    expect(updatedIndex.lastUpdated['chapter-1']).toBeLessThanOrEqual(after);
  });

  it('handles characters with empty attributes', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [{ name: 'Mysterious Stranger', attributes: {}, position: 500 }]
    };

    const { updatedIndex, contradictions } = mergeIntoIndex(
      emptyIndex,
      extraction,
      'chapter-1'
    );

    expect(contradictions).toHaveLength(0);
    expect(updatedIndex.characters['Mysterious Stranger']).toBeDefined();
    expect(updatedIndex.characters['Mysterious Stranger'].name).toBe('Mysterious Stranger');
  });

  it('does not mutate original index', () => {
    const originalIndex = createEmptyIndex();
    const extraction = {
      characters: [{ name: 'Alice', attributes: { age: '25' }, position: 100 }]
    };

    mergeIntoIndex(originalIndex, extraction, 'chapter-1');

    expect(originalIndex.characters).toEqual({});
    expect(originalIndex.lastUpdated).toEqual({});
  });

  it('handles characters without attributes property', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [{ name: 'NoAttrs', attributes: null, position: 100 }]
    };

    const { updatedIndex, contradictions } = mergeIntoIndex(
      emptyIndex,
      extraction as any,
      'chapter-1'
    );

    expect(contradictions).toHaveLength(0);
    expect(updatedIndex.characters['NoAttrs']).toBeDefined();
  });

  it('trims character name keys', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [{ name: '  Spacy Name  ', attributes: {}, position: 100 }]
    };

    const { updatedIndex } = mergeIntoIndex(emptyIndex, extraction, 'chapter-1');

    expect(updatedIndex.characters['Spacy Name']).toBeDefined();
  });

  it('handles multiple attribute types per character', () => {
    const emptyIndex = createEmptyIndex();
    const extraction = {
      characters: [{
        name: 'Alice',
        attributes: { eye_color: 'blue', hair_color: 'blonde', age: '25' },
        position: 100
      }]
    };

    const { updatedIndex } = mergeIntoIndex(emptyIndex, extraction, 'chapter-1');

    expect(updatedIndex.characters['Alice'].attributes.eye_color).toHaveLength(1);
    expect(updatedIndex.characters['Alice'].attributes.hair_color).toHaveLength(1);
    expect(updatedIndex.characters['Alice'].attributes.age).toHaveLength(1);
  });
});

describe('extractEntities', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('returns empty result for text shorter than 50 characters', async () => {
    const result = await extractEntities('Short text', 'chapter-1');
    
    expect(result).toEqual({ characters: [] });
  });

  it('returns empty result for empty text', async () => {
    const result = await extractEntities('', 'chapter-1');
    
    expect(result).toEqual({ characters: [] });
  });

  it('successfully extracts entities from valid text', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          characters: [
            { name: 'Hero', attributes: { class: 'Warrior' }, position: 10 }
          ]
        })
      }
    });

    const text = 'This is a long enough text to trigger the extraction logic. Hero enters the scene.';
    const result = await extractEntities(text, 'chapter-1');

    expect(result.characters).toHaveLength(1);
    expect(result.characters[0].name).toBe('Hero');
    expect(result.characters[0].attributes.class).toBe('Warrior');
  });

  it('handles JSON parsing errors gracefully', async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Invalid JSON'
      }
    });

    const text = 'This is a long enough text to trigger the extraction logic. It causes an error.';
    const result = await extractEntities(text, 'chapter-1');

    expect(result).toEqual({ characters: [] });
  });
});
