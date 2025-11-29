import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const analyzeDraftMock = vi.fn();
const trackUsageMock = vi.fn();
const updateChapterAnalysisMock = vi.fn();
const updateProjectLoreMock = vi.fn();
const commitMock = vi.fn();

vi.mock('@/services/gemini/analysis', () => ({
  analyzeDraft: (...args: unknown[]) => analyzeDraftMock(...args)
}));

vi.mock('@/features/shared/context/UsageContext', () => ({
  useUsage: () => ({ trackUsage: trackUsageMock })
}));

const magicActionsMock = {
  handleRewrite: vi.fn(),
};

vi.mock('@/features/editor/hooks/useMagicEditor', () => ({
  useMagicEditor: () => ({
    state: {
      magicVariations: [],
      activeMagicMode: null,
      magicHelpResult: null,
      magicHelpType: null,
      isMagicLoading: false,
      magicError: null,
    },
    actions: magicActionsMock,
  })
}));

import { useDraftSmithEngine } from '@/features/shared/hooks/useDraftSmithEngine';

const baseResult = {
  result: {
    settingAnalysis: { issues: [] },
    characters: [],
  },
  usage: { promptTokenCount: 1, totalTokenCount: 2 }
};

const project = {
  id: 'project-1',
  setting: { timePeriod: 'now', location: 'earth' },
  manuscriptIndex: undefined,
};

describe('useDraftSmithEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    analyzeDraftMock.mockResolvedValue(baseResult);
    updateChapterAnalysisMock.mockResolvedValue(undefined);
    updateProjectLoreMock.mockResolvedValue(undefined);
  });

  const getCurrentText = () => 'chapter text';

  const buildHook = () => renderHook(() => useDraftSmithEngine({
    getCurrentText,
    currentProject: project,
    activeChapterId: 'chapter-1',
    updateChapterAnalysis: updateChapterAnalysisMock,
    updateProjectLore: updateProjectLoreMock,
    commit: commitMock,
    selectionRange: null,
    clearSelection: vi.fn(),
  }));

  it('runs analysis and updates project data', async () => {
    const { result } = buildHook();

    await act(async () => {
      await result.current.actions.runAnalysis();
    });

    expect(analyzeDraftMock).toHaveBeenCalledWith(
      'chapter text',
      project.setting,
      project.manuscriptIndex,
      expect.any(AbortSignal)
    );
    expect(trackUsageMock).toHaveBeenCalledWith(baseResult.usage);
    expect(updateChapterAnalysisMock).toHaveBeenCalledWith('chapter-1', baseResult.result);
    expect(updateProjectLoreMock).toHaveBeenCalledWith('project-1', {
      characters: [],
      worldRules: []
    });
    expect(result.current.state.isAnalyzing).toBe(false);
    expect(result.current.state.analysisError).toBeNull();
  });

  it('creates and accepts pending diffs from agent actions', async () => {
    const { result } = buildHook();

    await act(async () => {
      const message = await result.current.actions.handleAgentAction('update_manuscript', {
        search_text: 'chapter',
        replacement_text: 'story',
        description: 'desc'
      });
      expect(message).toContain('Waiting for user review');
    });

    expect(result.current.state.pendingDiff).toMatchObject({
      original: 'chapter text',
      modified: 'story text',
      description: 'desc',
      author: 'Agent'
    });

    await act(async () => {
      result.current.actions.acceptDiff();
    });

    expect(commitMock).toHaveBeenCalledWith('story text', 'desc', 'Agent');
    expect(result.current.state.pendingDiff).toBeNull();
  });

  it('rejects pending diffs without committing', async () => {
    const { result } = buildHook();

    await act(async () => {
      await result.current.actions.handleAgentAction('update_manuscript', {
        search_text: 'chapter',
        replacement_text: 'story',
        description: 'desc'
      });
    });

    await act(() => {
      result.current.actions.rejectDiff();
    });

    expect(commitMock).not.toHaveBeenCalled();
    expect(result.current.state.pendingDiff).toBeNull();
  });
});
