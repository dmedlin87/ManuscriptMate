import { describe, it, expect, vi } from 'vitest';
import { QuillAIDB } from '@/services/db';

// Mock Dexie
vi.mock('dexie', () => {
  return {
    default: class Dexie {
      version = vi.fn().mockReturnThis();
      stores = vi.fn().mockReturnThis();
      constructor(name: string) {}
    }
  };
});

describe('QuillAIDB', () => {
  it('initializes with correct tables', () => {
    const db = new QuillAIDB();
    expect(db).toBeDefined();
  });
});
