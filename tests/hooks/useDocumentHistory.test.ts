/**
 * Tests for useDocumentHistory hook
 * Covers undo/redo, commit, restore, and persistence
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDocumentHistory } from '@/features/editor/hooks/useDocumentHistory';

// Mock sessionStorage
const mockStorage: Record<string, string> = {};

beforeEach(() => {
  vi.clearAllMocks();
  // Clear mock storage
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  
  // Mock sessionStorage
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  });
});

describe('useDocumentHistory', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  describe('initialization', () => {
    it('starts with initial text', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial text', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.text).toBe('Initial text');
    });

    it('starts with empty history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.history).toEqual([]);
      expect(result.current.redoStack).toEqual([]);
    });

    it('canUndo is false initially', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe('updateText', () => {
    it('updates text immediately', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.updateText('New text');
      });
      
      expect(result.current.text).toBe('New text');
    });

    it('calls onSave callback', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.updateText('New text');
      });
      
      expect(mockOnSave).toHaveBeenCalledWith('New text');
    });

    it('does not add to history (for typing)', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.updateText('New text');
      });
      
      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('commit', () => {
    it('updates text and adds to history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Committed text', 'Made an edit', 'User');
      });
      
      expect(result.current.text).toBe('Committed text');
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].description).toBe('Made an edit');
      expect(result.current.history[0].author).toBe('User');
    });

    it('stores previous content for undo', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('New', 'Change', 'Agent');
      });
      
      expect(result.current.history[0].previousContent).toBe('Original');
      expect(result.current.history[0].newContent).toBe('New');
    });

    it('calls onSave', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('New', 'Desc', 'User');
      });
      
      expect(mockOnSave).toHaveBeenCalledWith('New');
    });

    it('canUndo becomes true after commit', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.canUndo).toBe(false);
      
      act(() => {
        result.current.commit('New', 'Change', 'User');
      });
      
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('undo', () => {
    it('reverts to previous content', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit 1', 'User');
      });
      
      expect(result.current.text).toBe('Changed');
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.text).toBe('Original');
    });

    it('works when there is history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit', 'User');
      });
      
      act(() => {
        result.current.undo();
      });
      
      // Verify undo worked by checking state
      expect(result.current.text).toBe('Original');
      expect(result.current.history).toHaveLength(0);
    });

    it('returns false when nothing to undo', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      let success;
      act(() => {
        success = result.current.undo();
      });
      
      expect(success).toBe(false);
    });

    it('moves item to redo stack', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit', 'User');
      });
      
      expect(result.current.redoStack).toHaveLength(0);
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.redoStack).toHaveLength(1);
      expect(result.current.canRedo).toBe(true);
    });

    it('removes item from history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit 1', 'User');
        result.current.commit('V2', 'Edit 2', 'User');
      });
      
      expect(result.current.history).toHaveLength(2);
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.history).toHaveLength(1);
    });

    it('calls onSave with previous content', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit', 'User');
      });
      
      mockOnSave.mockClear();
      
      act(() => {
        result.current.undo();
      });
      
      expect(mockOnSave).toHaveBeenCalledWith('Original');
    });
  });

  describe('redo', () => {
    it('restores undone content', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit', 'User');
      });
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.text).toBe('Original');
      expect(result.current.canRedo).toBe(true);
      
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.text).toBe('Changed');
    });

    it('works when there is redo stack', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit', 'User');
      });
      
      act(() => {
        result.current.undo();
      });
      
      expect(result.current.canRedo).toBe(true);
      
      act(() => {
        result.current.redo();
      });
      
      // Verify redo worked
      expect(result.current.text).toBe('Changed');
      expect(result.current.canRedo).toBe(false);
    });

    it('returns false when nothing to redo', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      let success;
      act(() => {
        success = result.current.redo();
      });
      
      expect(success).toBe(false);
    });

    it('moves item back to history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('Changed', 'Edit', 'User');
      });
      
      act(() => {
        result.current.undo();
      });
      
      // After undo, history is empty and item is in redo stack
      expect(result.current.redoStack).toHaveLength(1);
      
      act(() => {
        result.current.redo();
      });
      
      expect(result.current.history).toHaveLength(1);
      expect(result.current.redoStack).toHaveLength(0);
    });
  });

  describe('restore', () => {
    it('restores to specific history item', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('V0', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit 1', 'User');
        result.current.commit('V2', 'Edit 2', 'User');
      });
      
      const firstItemId = result.current.history[0].id;
      
      act(() => {
        result.current.restore(firstItemId);
      });
      
      // restore commits a new version with the old content
      expect(result.current.text).toBe('V1');
    });

    it('does nothing if id not found', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit', 'User');
      });
      
      const historyBefore = result.current.history.length;
      
      act(() => {
        result.current.restore('nonexistent-id');
      });
      
      expect(result.current.history.length).toBe(historyBefore);
    });
  });

  describe('reset', () => {
    it('sets new text and clears history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit', 'User');
        result.current.commit('V2', 'Edit 2', 'User');
      });
      
      expect(result.current.history).toHaveLength(2);
      
      act(() => {
        result.current.reset('Brand new');
      });
      
      expect(result.current.text).toBe('Brand new');
      expect(result.current.history).toHaveLength(0);
    });

    it('calls onSave', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      mockOnSave.mockClear();
      
      act(() => {
        result.current.reset('New doc');
      });
      
      expect(mockOnSave).toHaveBeenCalledWith('New doc');
    });
  });

  describe('clearHistory', () => {
    it('clears history and redo stack', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit', 'User');
        result.current.undo();
      });
      
      expect(result.current.history.length + result.current.redoStack.length).toBeGreaterThan(0);
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(result.current.history).toHaveLength(0);
      expect(result.current.redoStack).toHaveLength(0);
    });

    it('clears persisted history from sessionStorage', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Original', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit', 'User');
      });
      
      act(() => {
        result.current.clearHistory();
      });
      
      expect(sessionStorage.removeItem).toHaveBeenCalled();
    });
  });

  describe('hasUnsavedChanges', () => {
    it('is false when no history', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('is true after commit', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('New', 'Edit', 'User');
      });
      
      expect(result.current.hasUnsavedChanges).toBe(true);
    });
  });

  describe('chapter switching', () => {
    it('resets text when initial text changes', () => {
      const { result, rerender } = renderHook(
        ({ text, id }) => useDocumentHistory(text, id, mockOnSave),
        { initialProps: { text: 'Chapter 1 content', id: 'ch1' } }
      );
      
      expect(result.current.text).toBe('Chapter 1 content');
      
      rerender({ text: 'Chapter 2 content', id: 'ch2' });
      
      expect(result.current.text).toBe('Chapter 2 content');
    });

    it('clears history when switching chapters', () => {
      const { result, rerender } = renderHook(
        ({ text, id }) => useDocumentHistory(text, id, mockOnSave),
        { initialProps: { text: 'Chapter 1', id: 'ch1' } }
      );
      
      act(() => {
        result.current.commit('Edit', 'Change', 'User');
      });
      
      expect(result.current.history).toHaveLength(1);
      
      rerender({ text: 'Chapter 2', id: 'ch2' });
      
      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('persistence', () => {
    it('persists history to sessionStorage', () => {
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      act(() => {
        result.current.commit('V1', 'Edit', 'User');
      });
      
      expect(sessionStorage.setItem).toHaveBeenCalled();
    });

    it('restores history from sessionStorage on mount', () => {
      const storedHistory = [
        { id: '1', timestamp: Date.now(), description: 'Old edit', author: 'User', previousContent: 'a', newContent: 'b' }
      ];
      mockStorage['draftsmith_history_chapter-1'] = JSON.stringify(storedHistory);
      
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].description).toBe('Old edit');
    });

    it('handles invalid stored JSON gracefully', () => {
      mockStorage['draftsmith_history_chapter-1'] = 'not valid json';
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { result } = renderHook(() => 
        useDocumentHistory('Initial', 'chapter-1', mockOnSave)
      );
      
      expect(result.current.history).toHaveLength(0);
      
      consoleSpy.mockRestore();
    });
  });
});
