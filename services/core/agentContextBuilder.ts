import { EditorContext } from '@/types';

type UIStateSnapshot = {
  cursor: { position: number };
  selection?: { text: string };
  activePanel?: string;
  microphone?: { status: string; lastTranscript?: string | null };
};

export interface AgentContextPromptInput {
  /**
   * Optional rich context from AppBrain (already formatted).
   */
  smartContext?: string;
  /**
   * User input text.
   */
  userText: string;
  /**
   * Mode (text/voice) for capability hints.
   */
  mode: 'text' | 'voice';
  /**
   * UI snapshot (lightweight) when available.
   */
  uiState?: UIStateSnapshot;
  /**
   * Optional recent event summaries.
   */
  recentEvents?: string;
  /**
   * Simple editor context fallback when AppBrain is not available.
   */
  editorContext?: EditorContext;
}

/**
 * Shared prompt builder to keep controller and orchestrator aligned.
 */
export function buildAgentContextPrompt(input: AgentContextPromptInput): string {
  const {
    smartContext,
    userText,
    mode,
    uiState,
    recentEvents,
    editorContext,
  } = input;

  const baseContext = smartContext
    ? `[CURRENT CONTEXT]\n${smartContext}`
    : editorContext
      ? `[USER CONTEXT]\nCursor Index: ${editorContext.cursorPosition}\nSelection: ${
          editorContext.selection ? `"${editorContext.selection.text}"` : 'None'
        }\nTotal Text Length: ${editorContext.totalLength}`
      : '[CURRENT CONTEXT]\n(Unknown)';

  const uiSection = uiState
    ? `[USER STATE]\nCursor: ${uiState.cursor.position}\nSelection: ${
        uiState.selection
          ? `"${uiState.selection.text.slice(0, 100)}${
              uiState.selection.text.length > 100 ? '...' : ''
            }"`
          : 'None'
      }\nActive Panel: ${uiState.activePanel ?? 'unknown'}\nMicrophone: ${
        uiState.microphone
          ? `${uiState.microphone.status}${
              uiState.microphone.lastTranscript
                ? ` (last transcript: "${uiState.microphone.lastTranscript}")`
                : ''
            }`
          : 'unknown'
      }`
    : undefined;

  const eventsSection = recentEvents
    ? `[RECENT EVENTS]\n${recentEvents}`
    : undefined;

  return [
    baseContext,
    `[INPUT MODE]\nAgent mode: ${mode}.`,
    uiSection,
    eventsSection,
    `[USER REQUEST]\n${userText}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
