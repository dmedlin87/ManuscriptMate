/**
 * App Brain Service
 * 
 * Unified knowledge layer for the omniscient agent architecture.
 * Single source of truth for all application state.
 */

// Type exports
export * from './types';

// Event system
export { 
  eventBus, 
  emitSelectionChanged,
  emitCursorMoved,
  emitChapterSwitched,
  emitTextChanged,
  emitEditMade,
  emitToolExecuted,
  emitNavigationRequested,
} from './eventBus';

// Context builders
export {
  buildAgentContext,
  buildCompressedContext,
  buildNavigationContext,
  buildEditingContext,
  createContextBuilder,
  buildAgentContextWithMemory,
} from './contextBuilder';

// Enhancement 2A: Adaptive Context
export {
  buildAdaptiveContext,
  selectBudget,
  estimateTokens,
  DEFAULT_BUDGET,
  VOICE_MODE_BUDGET,
  EDITING_BUDGET,
  DEEP_ANALYSIS_BUDGET,
} from './adaptiveContext';

// Enhancement 2B: Context Streaming
export {
  ContextStreamer,
  getContextStreamer,
  resetContextStreamer,
  createStreamingSession,
  hasSignificantContextChange,
} from './contextStreamer';

// Enhancement 2C: Cross-Chapter Context
export {
  buildCrossChapterContext,
  formatCrossChapterContext,
} from './crossChapterContext';

// Default empty state
import { AppBrainState } from './types';

export const createEmptyAppBrainState = (): AppBrainState => ({
  manuscript: {
    projectId: null,
    projectTitle: '',
    chapters: [],
    activeChapterId: null,
    currentText: '',
    branches: [],
    activeBranchId: null,
  },
  intelligence: {
    hud: null,
    full: null,
    entities: null,
    timeline: null,
    style: null,
    heatmap: null,
    lastProcessedAt: 0,
  },
  analysis: {
    result: null,
    status: {
      pacing: 'idle',
      characters: 'idle',
      plot: 'idle',
      setting: 'idle',
    },
    inlineComments: [],
  },
  lore: {
    characters: [],
    worldRules: [],
    manuscriptIndex: null,
  },
  ui: {
    cursor: {
      position: 0,
      scene: null,
      paragraph: null,
    },
    selection: null,
    activePanel: 'chat',
    activeView: 'editor',
    isZenMode: false,
    activeHighlight: null,
  },
  session: {
    chatHistory: [],
    currentPersona: null,
    pendingToolCalls: [],
    lastAgentAction: null,
    isProcessing: false,
  },
});
