import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEmptyAppBrainState,
  buildAgentContext,
  buildCompressedContext,
  buildNavigationContext,
  buildEditingContext,
  buildAgentContextWithMemory,
  createContextBuilder,
} from '@/services/appBrain';
import * as memoryService from '@/services/memory';

// Mock dependencies used inside contextBuilder
vi.mock('@/services/appBrain/eventBus', () => {
  return {
    eventBus: {
      getRecentEvents: vi.fn(() => []),
      formatRecentEventsForAI: vi.fn(() => '[RECENT USER ACTIVITY]\nEvent A\n'),
    },
  };
});

vi.mock('@/services/commands/history', () => {
  return {
    getCommandHistory: () => ({
      formatForPrompt: vi.fn(() => '[RECENT AGENT ACTIONS]\nCommand X\n'),
    }),
  };
});

describe('AppBrain context builders', () => {
  let baseState = createEmptyAppBrainState();

  beforeEach(() => {
    baseState = createEmptyAppBrainState();
  });

  it('buildAgentContext includes core sections and placeholders', () => {
    baseState.manuscript.projectTitle = 'Test Novel';

    const ctx = buildAgentContext(baseState);

    expect(ctx).toContain('[MANUSCRIPT STATE]');
    expect(ctx).toContain('Project: Test Novel');
    expect(ctx).toContain('[CURRENT USER STATE]');
    expect(ctx).toContain('[AGENT MEMORY]');
    expect(ctx).toContain('Memory context loaded separately');
    expect(ctx).toContain('[RECENT USER ACTIVITY]');
    expect(ctx).toContain('[RECENT AGENT ACTIONS]');
  });

  it('buildCompressedContext encodes minimal manuscript and hud info', () => {
    baseState.manuscript.projectTitle = 'Short';
    baseState.manuscript.chapters = [
      { id: 'c1', title: 'Chapter One', order: 0, content: '' } as any,
    ];
    baseState.manuscript.activeChapterId = 'c1';
    baseState.ui.cursor.position = 42;
    baseState.ui.selection = { text: 'Selected text goes here', start: 10, end: 30 } as any;
    baseState.intelligence.hud = {
      situational: {
        currentScene: { type: 'action' },
        tensionLevel: 'medium',
        pacing: 'brisk',
        narrativePosition: {
          sceneIndex: 1,
          totalScenes: 3,
          percentComplete: 50,
        },
      },
      context: { activeEntities: [{ name: 'Hero' }, { name: 'Villain' }], activeRelationships: [], openPromises: [] },
      styleAlerts: [],
      prioritizedIssues: [],
      stats: { wordCount: 1234, readingTime: 5, dialoguePercent: 20, avgSentenceLength: 12 },
    } as any;

    const ctx = buildCompressedContext(baseState);

    expect(ctx).toContain('ch:Chapter One');
    expect(ctx).toContain('pos:42');
    expect(ctx).toContain('sel:Selected text goes here');
    expect(ctx).toContain('scene:action');
    expect(ctx).toContain('tension:medium');
    expect(ctx).toContain('words:1234');
  });

  it('buildNavigationContext lists chapters and characters when present', () => {
    baseState.manuscript.chapters = [
      { id: 'c1', title: 'Opening', order: 0, content: '' } as any,
      { id: 'c2', title: 'Middle', order: 1, content: '' } as any,
    ];
    baseState.manuscript.activeChapterId = 'c2';
    baseState.intelligence.entities = {
      nodes: [
        { id: 'n1', name: 'Alice', type: 'character', aliases: ['Al'], mentionCount: 3 },
        { id: 'n2', name: 'City', type: 'location', aliases: [], mentionCount: 1 },
      ],
      edges: [],
    } as any;

    const ctx = buildNavigationContext(baseState);

    expect(ctx).toContain('[NAVIGATION CONTEXT]');
    expect(ctx).toContain('"Opening"');
    expect(ctx).toContain('"Middle"');
    // active chapter arrow
    expect(ctx).toMatch(/→ .*"Middle"/);
    expect(ctx).toContain('Characters (searchable):');
    expect(ctx).toContain('Alice');
    expect(ctx).toContain('aliases: Al');
  });

  it('buildEditingContext reflects selection, style context, and branching', () => {
    baseState.manuscript.chapters = [
      { id: 'c1', title: 'Branchy', order: 0, content: 'Hello world' } as any,
    ];
    baseState.manuscript.activeChapterId = 'c1';
    baseState.manuscript.currentText = 'Hello world';
    baseState.ui.cursor.position = 5;
    baseState.ui.selection = { text: 'Hello', start: 0, end: 5 } as any;
    baseState.intelligence.hud = {
      situational: { pacing: 'slow', tensionLevel: 'low', narrativePosition: { sceneIndex: 0, totalScenes: 1, percentComplete: 0 }, currentScene: null },
      context: { activeEntities: [], activeRelationships: [], openPromises: [] },
      styleAlerts: ['Repetitive phrasing'],
      prioritizedIssues: [],
      stats: { wordCount: 2, readingTime: 1, dialoguePercent: 0, avgSentenceLength: 2 },
    } as any;
    baseState.manuscript.activeBranchId = 'b1';
    baseState.manuscript.branches = [{ id: 'b1', name: 'What-if', baseChapterId: 'c1', description: '', createdAt: Date.now() }] as any;

    const ctx = buildEditingContext(baseState);

    expect(ctx).toContain('[EDITING CONTEXT]');
    expect(ctx).toContain('Current chapter: "Branchy"');
    expect(ctx).toContain('Text length: 11 characters');
    expect(ctx).toContain('Cursor at: 5');
    expect(ctx).toContain('SELECTED TEXT:');
    expect(ctx).toContain('"Hello"');
    expect(ctx).toContain('STYLE CONTEXT:');
    expect(ctx).toContain('Pacing: slow');
    expect(ctx).toContain('Tension: low');
    expect(ctx).toContain('Alerts: Repetitive phrasing');
    expect(ctx).toContain('On branch: "What-if"');
  });

  it('createContextBuilder delegates to underlying builders and eventBus', () => {
    const getState = () => baseState;
    const ctx = createContextBuilder(getState);

    const full = ctx.getAgentContext();
    const compressed = ctx.getCompressedContext();
    const nav = ctx.getNavigationContext();
    const edit = ctx.getEditingContext();
    const events = ctx.getRecentEvents(2);

    expect(typeof full).toBe('string');
    expect(typeof compressed).toBe('string');
    expect(nav).toContain('[NAVIGATION CONTEXT]');
    expect(edit).toContain('[EDITING CONTEXT]');
    expect(Array.isArray(events)).toBe(true);
  });

  it('buildAgentContextWithMemory replaces placeholder with formatted memories and goals', async () => {
    const state = createEmptyAppBrainState();
    state.manuscript.projectTitle = 'Memory Project';

    const fakeMemories = {
      author: [
        {
          id: 'author-1',
          text: 'Prefers concise critiques.',
          type: 'preference',
          scope: 'author',
          projectId: null,
          topicTags: ['style'],
          importance: 0.9,
          createdAt: Date.now(),
        },
      ],
      project: [
        {
          id: 'proj-1',
          text: 'Protagonist is Alice.',
          type: 'fact',
          scope: 'project',
          projectId: 'proj-123',
          topicTags: ['character:alice'],
          importance: 0.8,
          createdAt: Date.now(),
        },
      ],
    } as any;

    const fakeGoals = [
      {
        id: 'goal-1',
        projectId: 'proj-123',
        title: 'Finish draft',
        description: 'Complete first draft of novel',
        status: 'active',
        progress: 10,
        createdAt: Date.now(),
      },
    ] as any;

    const memoriesSpy = vi
      .spyOn(memoryService, 'getMemoriesForContext')
      .mockResolvedValue(fakeMemories);
    const goalsSpy = vi
      .spyOn(memoryService, 'getActiveGoals')
      .mockResolvedValue(fakeGoals);

    const baseCtx = buildAgentContext(state);
    expect(baseCtx).toContain('Memory context loaded separately');

    const ctx = await buildAgentContextWithMemory(state, 'proj-123');

    expect(memoriesSpy).toHaveBeenCalledWith('proj-123', { limit: 25 });
    expect(goalsSpy).toHaveBeenCalledWith('proj-123');

    expect(ctx).not.toContain('Memory context loaded separately');
    expect(ctx).toContain('[AGENT MEMORY]');
    expect(ctx).toContain('## Author Preferences');
    expect(ctx).toContain('## Project Memory');
    expect(ctx).toContain('## Active Goals');
  });

  it('buildAgentContextWithMemory leaves placeholder when projectId is null', async () => {
    const state = createEmptyAppBrainState();

    const ctx = await buildAgentContextWithMemory(state, null);

    expect(ctx).toContain('[AGENT MEMORY]');
    expect(ctx).toContain('Memory context loaded separately');
  });
});
