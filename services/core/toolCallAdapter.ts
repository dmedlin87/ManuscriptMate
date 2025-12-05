import type { ToolResult } from '@/services/gemini/toolExecutor';
import type { ChatMessage } from '@/types';

export interface ToolCallUI {
  onMessage?: (message: ChatMessage) => void;
  onToolStart?: (payload: { name: string }) => void;
  onToolEnd?: (payload: { name: string; result: ToolResult }) => void;
}

export interface ToolCallAdapter {
  handleToolStart(name: string): void;
  handleToolEnd(name: string, result: ToolResult): void;
}

export function createToolCallAdapter(ui: ToolCallUI): ToolCallAdapter {
  return {
    handleToolStart: (name: string) => {
      ui.onToolStart?.({ name });
      ui.onMessage?.({
        role: 'model',
        text: `🛠️ ${name}...`,
        timestamp: new Date(),
      });
    },
    handleToolEnd: (name: string, result: ToolResult) => {
      ui.onToolEnd?.({ name, result });
      ui.onMessage?.({
        role: 'model',
        text: result.success
          ? `✅ ${name}: ${result.message}`
          : `⚠️ ${name} failed: ${result.error ?? result.message}`,
        timestamp: new Date(),
      });
    },
  };
}
