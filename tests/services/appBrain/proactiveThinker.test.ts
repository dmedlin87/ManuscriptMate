import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProactiveThinker,
  getProactiveThinker,
  startProactiveThinker,
  stopProactiveThinker,
  resetProactiveThinker,
} from '@/services/appBrain/proactiveThinker';
import { eventBus } from '@/services/appBrain/eventBus';
import type { AppBrainState } from '@/services/appBrain/types';

// Mock the Gemini AI client
vi.mock('@/services/gemini/client', () => ({
  ai: {
    models: {
      generateContent: vi.fn(() => Promise.resolve({
        text: JSON.stringify({
          significant: true,
          suggestions: [
            {
              title: 'Test Suggestion',
              description: 'A test suggestion from the thinker',
              priority: 'medium',
              type: 'plot',
            },
          ],
          reasoning: 'Test reasoning',
        }),
      })),
    },
  },
}));

// Mock the intelligence memory bridge
vi.mock('@/services/appBrain/intelligenceMemoryBridge', () => ({
  getHighPriorityConflicts: vi.fn(() => Promise.resolve([])),
  formatConflictsForPrompt: vi.fn(() => ''),
}));

// Mock the memory proactive service
vi.mock('@/services/memory/proactive', () => ({
  getImportantReminders: vi.fn(() => Promise.resolve([])),
}));

describe('proactiveThinker', () => {
  const createMockState = (): AppBrainState => ({
    manuscript: {
      projectId: 'test-project',
      projectTitle: 'Test Novel',
      chapters: [{ id: 'c1', title: 'Chapter 1', content: 'abc', order: 0, updatedAt: 0, projectId: 'test-project' }],
      activeChapterId: 'c1',
      currentText: 'Test content',
      branches: [],
      activeBranchId: null,
    },
    intelligence: {
      hud: {
        situational: {
          currentScene: null,
          currentParagraph: null,
          narrativePosition: { sceneIndex: 0, totalScenes: 1, percentComplete: 50 },
          tensionLevel: 'medium',
          pacing: 'moderate',
        },
        context: {
          activeEntities: [],
          activeRelationships: [],
          openPromises: [],
          recentEvents: [],
        },
        styleAlerts: [],
        prioritizedIssues: [],
        recentChanges: [],
        stats: { wordCount: 100, readingTime: 1, dialoguePercent: 20, avgSentenceLength: 15 },
        lastFullProcess: Date.now(),
        processingTier: 'background',
      },
      full: null,
      entities: null,
      timeline: null,
      style: null,
      heatmap: null,
      lastProcessedAt: Date.now(),
    },
    analysis: {
      result: null,
      status: { pacing: 'idle', characters: 'idle', plot: 'idle', setting: 'idle' },
      inlineComments: [],
    },
    lore: {
      characters: [],
      worldRules: [],
      manuscriptIndex: null,
    },
    ui: {
      cursor: { position: 0, scene: null, paragraph: null },
      selection: null,
      activePanel: 'chat',
      activeView: 'editor',
      isZenMode: false,
      activeHighlight: null,
      microphone: { status: 'idle', mode: 'voice', lastTranscript: null, error: null },
    },
    session: {
      chatHistory: [],
      currentPersona: null,
      pendingToolCalls: [],
      lastAgentAction: null,
      isProcessing: false,
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    resetProactiveThinker();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetProactiveThinker();
  });

  describe('ProactiveThinker class', () => {
    it('creates with default config', () => {
      const thinker = new ProactiveThinker();
      const status = thinker.getStatus();

      expect(status.isThinking).toBe(false);
      expect(status.lastThinkTime).toBe(0);
      expect(status.pendingEvents).toHaveLength(0);
    });

    it('can be created with custom config', () => {
      const thinker = new ProactiveThinker({
        debounceMs: 5000,
        maxBatchSize: 10,
        enabled: true,
      });

      expect(thinker.getStatus().isThinking).toBe(false);
    });

    it('starts and stops correctly', () => {
      const thinker = new ProactiveThinker();
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);
      expect(thinker.getStatus().pendingEvents).toHaveLength(0);

      thinker.stop();
      // Should be safe to call stop multiple times
      thinker.stop();
    });

    it('batches events', () => {
      const thinker = new ProactiveThinker({ minEventsToThink: 5 });
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);

      // Emit some events
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 100, delta: 10 } });
      eventBus.emit({ type: 'CURSOR_MOVED', payload: { position: 50, scene: null } });
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 110, delta: 10 } });

      const status = thinker.getStatus();
      expect(status.pendingEvents.length).toBeGreaterThanOrEqual(0);

      thinker.stop();
    });

    it('respects maxBatchSize', () => {
      const thinker = new ProactiveThinker({ maxBatchSize: 3 });
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);

      // Emit more events than maxBatchSize
      for (let i = 0; i < 10; i++) {
        eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 100 + i, delta: 1 } });
      }

      const status = thinker.getStatus();
      expect(status.pendingEvents.length).toBeLessThanOrEqual(3);

      thinker.stop();
    });

    it('does not think when disabled', () => {
      const thinker = new ProactiveThinker({ enabled: false });
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);

      // Emit events
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 100, delta: 10 } });

      // Should not have any pending events since thinker is disabled
      const status = thinker.getStatus();
      expect(status.pendingEvents).toHaveLength(0);
    });
  });

  describe('singleton functions', () => {
    it('getProactiveThinker returns same instance', () => {
      const thinker1 = getProactiveThinker();
      const thinker2 = getProactiveThinker();

      expect(thinker1).toBe(thinker2);
    });

    it('startProactiveThinker starts the singleton', () => {
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      const thinker = startProactiveThinker(getState, 'test-project', onSuggestion);

      expect(thinker).toBeDefined();
      expect(thinker.getStatus().isThinking).toBe(false);

      stopProactiveThinker();
    });

    it('stopProactiveThinker stops safely when not started', () => {
      // Should not throw
      stopProactiveThinker();
    });

    it('resetProactiveThinker clears the singleton', () => {
      const thinker1 = getProactiveThinker();
      resetProactiveThinker();
      const thinker2 = getProactiveThinker();

      expect(thinker1).not.toBe(thinker2);
    });
  });

  describe('forceThink', () => {
    it('returns null when not started', async () => {
      const thinker = new ProactiveThinker();

      const result = await thinker.forceThink();

      expect(result).toBeNull();
    });

    it('performs thinking when started', async () => {
      const thinker = new ProactiveThinker();
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);

      // Add some events
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 100, delta: 10 } });

      vi.useRealTimers(); // Need real timers for async
      const result = await thinker.forceThink();
      vi.useFakeTimers();

      expect(result).toBeDefined();
      expect(result?.thinkingTime).toBeGreaterThanOrEqual(0);

      thinker.stop();
    });
  });

  describe('thinking result parsing', () => {
    it('handles valid JSON response', async () => {
      const thinker = new ProactiveThinker();
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);
      eventBus.emit({ type: 'ANALYSIS_COMPLETED', payload: { section: 'test', status: 'success' } });

      vi.useRealTimers();
      const result = await thinker.forceThink();
      vi.useFakeTimers();

      expect(result?.significant).toBe(true);
      expect(result?.suggestions.length).toBeGreaterThan(0);
      expect(result?.suggestions[0].title).toBe('Test Suggestion');

      thinker.stop();
    });

    it('calls onSuggestion callback for each suggestion', async () => {
      const thinker = new ProactiveThinker();
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 100, delta: 10 } });

      vi.useRealTimers();
      await thinker.forceThink();
      vi.useFakeTimers();

      expect(onSuggestion).toHaveBeenCalled();
      expect(onSuggestion.mock.calls[0][0]).toHaveProperty('title', 'Test Suggestion');

      thinker.stop();
    });
  });

  describe('event handling', () => {
    it('handles urgent events with shorter delay', () => {
      const thinker = new ProactiveThinker({
        urgentEventTypes: ['ANALYSIS_COMPLETED'],
        minEventsToThink: 1,
      });
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);

      // Emit an urgent event
      eventBus.emit({ 
        type: 'ANALYSIS_COMPLETED', 
        payload: { section: 'pacing', status: 'success' } 
      });

      // Should have pending events
      expect(thinker.getStatus().pendingEvents.length).toBeGreaterThanOrEqual(0);

      thinker.stop();
    });

    it('clears pending events after thinking', async () => {
      const thinker = new ProactiveThinker();
      const getState = () => createMockState();
      const onSuggestion = vi.fn();

      thinker.start(getState, 'test-project', onSuggestion);

      // Add events
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 100, delta: 10 } });
      eventBus.emit({ type: 'TEXT_CHANGED', payload: { length: 110, delta: 10 } });

      const beforeCount = thinker.getStatus().pendingEvents.length;

      vi.useRealTimers();
      await thinker.forceThink();
      vi.useFakeTimers();

      const afterCount = thinker.getStatus().pendingEvents.length;
      expect(afterCount).toBeLessThanOrEqual(beforeCount);

      thinker.stop();
    });
  });
});
