import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const extractEntitiesMock = vi.fn();
const mergeIntoIndexMock = vi.fn();
const updateManuscriptIndexMock = vi.fn();

const project = {
  id: 'project-1',
  manuscriptIndex: { characters: {}, lastUpdated: {} }
};

vi.mock('@/services/manuscriptIndexer', () => ({
  extractEntities: (...args: unknown[]) => extractEntitiesMock(...args),
  mergeIntoIndex: (...args: unknown[]) => mergeIntoIndexMock(...args),
  createEmptyIndex: () => ({ characters: {}, lastUpdated: {} })
}));

vi.mock('@/features/project', () => ({
  useProjectStore: () => ({
    currentProject: project,
    updateManuscriptIndex: (...args: unknown[]) => updateManuscriptIndexMock(...args),
  })
}));

import { useManuscriptIndexer } from '@/features/shared/hooks/useManuscriptIndexer';

const updatedIndex = { characters: { hero: {} }, lastUpdated: {} };

describe('useManuscriptIndexer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    extractEntitiesMock.mockResolvedValue({ characters: [] });
    mergeIntoIndexMock.mockReturnValue({ updatedIndex, contradictions: [] });
    updateManuscriptIndexMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('indexes manuscript after idle period', async () => {
    const onContradiction = vi.fn();
    renderHook(({ text, chapter }) => useManuscriptIndexer(text, chapter, onContradiction), {
      initialProps: { text: 'once upon', chapter: 'c1' }
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(extractEntitiesMock).toHaveBeenCalledWith('once upon', 'c1', expect.any(AbortSignal));
    expect(mergeIntoIndexMock).toHaveBeenCalledWith(project.manuscriptIndex, { characters: [] }, 'c1');
    expect(updateManuscriptIndexMock).toHaveBeenCalledWith('project-1', updatedIndex);
    expect(onContradiction).not.toHaveBeenCalled();
  });

  it('reindexes immediately on chapter change', async () => {
    const onContradiction = vi.fn();
    const { rerender } = renderHook(({ text, chapter }) => useManuscriptIndexer(text, chapter, onContradiction), {
      initialProps: { text: 'initial text', chapter: 'c1' }
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    extractEntitiesMock.mockClear();
    mergeIntoIndexMock.mockReturnValue({ updatedIndex, contradictions: [{ id: 1 }] });

    await act(async () => {
      rerender({ text: 'new text', chapter: 'c2' });
      await Promise.resolve();
    });

    expect(extractEntitiesMock).toHaveBeenCalledWith('new text', 'c2', expect.any(AbortSignal));
    expect(onContradiction).toHaveBeenCalledWith([{ id: 1 }]);
  });
});
