import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const extractEntitiesMock = vi.fn();
const mergeIntoIndexMock = vi.fn();
const updateManuscriptIndexMock = vi.fn();
const createEmptyIndexMock = vi.fn(() => ({ characters: {}, lastUpdated: {} }));

const project = {
  id: 'project-1',
  manuscriptIndex: { characters: {}, lastUpdated: {} }
};

vi.mock('@/services/manuscriptIndexer', () => ({
  extractEntities: (...args: unknown[]) => extractEntitiesMock(...args),
  mergeIntoIndex: (...args: unknown[]) => mergeIntoIndexMock(...args),
  createEmptyIndex: () => createEmptyIndexMock()
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

  it('does not index when chapterId is null', async () => {
    const onContradiction = vi.fn();

    renderHook(() => useManuscriptIndexer('some text worth indexing', null as any, onContradiction));

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(extractEntitiesMock).not.toHaveBeenCalled();
    expect(updateManuscriptIndexMock).not.toHaveBeenCalled();
  });

  it('skips reindexing on chapter change when content hash has not changed', async () => {
    const onContradiction = vi.fn();

    const { rerender } = renderHook(
      ({ text, chapter }) => useManuscriptIndexer(text, chapter, onContradiction),
      {
        initialProps: { text: 'stable text that hashes the same', chapter: 'c1' }
      }
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(extractEntitiesMock).toHaveBeenCalledTimes(1);

    extractEntitiesMock.mockClear();
    mergeIntoIndexMock.mockClear();
    updateManuscriptIndexMock.mockClear();

    await act(async () => {
      rerender({ text: 'stable text that hashes the same', chapter: 'c2' });
      await Promise.resolve();
    });

    expect(extractEntitiesMock).not.toHaveBeenCalled();
    expect(mergeIntoIndexMock).not.toHaveBeenCalled();
    expect(updateManuscriptIndexMock).not.toHaveBeenCalled();
  });

  it('uses createEmptyIndex when project has no manuscriptIndex', async () => {
    const onContradiction = vi.fn();
    (project as any).manuscriptIndex = undefined;
    createEmptyIndexMock.mockClear();

    renderHook(() => useManuscriptIndexer('text to index', 'c1', onContradiction));

    await act(async () => {
      await Promise.resolve();
    });

    expect(createEmptyIndexMock).toHaveBeenCalled();

    (project as any).manuscriptIndex = { characters: {}, lastUpdated: {} };
  });

  it('logs error when indexing fails with non-AbortError', async () => {
    const onContradiction = vi.fn();
    const error = new Error('boom');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    extractEntitiesMock.mockRejectedValueOnce(error);

    renderHook(() => useManuscriptIndexer('once upon a failure', 'c1', onContradiction));

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Indexing failed:', error);

    consoleErrorSpy.mockRestore();
  });

  it('does not log when indexing is aborted', async () => {
    const onContradiction = vi.fn();
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    extractEntitiesMock.mockRejectedValueOnce(abortError);

    renderHook(() => useManuscriptIndexer('once upon an abort', 'c1', onContradiction));

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
