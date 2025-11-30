import { AppBrainActions } from '@/services/appBrain';

export interface ToolResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function executeAppBrainToolCall(
  toolName: string,
  args: Record<string, unknown>,
  actions: AppBrainActions,
): Promise<ToolResult> {
  try {
    let result: string;

    switch (toolName) {
      // Navigation
      case 'navigate_to_text':
        result = await actions.navigateToText({
          query: args.query as string,
          searchType: args.searchType as any,
          character: args.character as string,
          chapter: args.chapter as string,
        });
        break;
      case 'jump_to_chapter':
        result = await actions.jumpToChapter(args.identifier as string);
        break;
      case 'jump_to_scene':
        result = await actions.jumpToScene(
          args.sceneType as string,
          args.direction as 'next' | 'previous',
        );
        break;
      case 'scroll_to_position':
        actions.scrollToPosition(args.position as number);
        result = `Scrolled to position ${args.position}`;
        break;

      // Editing
      case 'update_manuscript':
        result = await actions.updateManuscript({
          searchText: args.search_text as string,
          replacementText: args.replacement_text as string,
          description: args.description as string,
        });
        break;
      case 'append_to_manuscript':
        result = await actions.appendText(
          args.text_to_add as string,
          args.description as string,
        );
        break;
      case 'insert_at_cursor':
        result = await actions.appendText(
          args.text as string,
          args.description as string,
        );
        break;
      case 'undo_last_change':
        result = await actions.undo();
        break;
      case 'redo_last_change':
        result = await actions.redo();
        break;

      // Analysis
      case 'get_critique_for_selection':
        result = await actions.getCritiqueForSelection(args.focus as string);
        break;
      case 'run_analysis':
        result = await actions.runAnalysis(args.section as string);
        break;

      // UI Control
      case 'switch_panel':
        actions.switchPanel(args.panel as string);
        result = `Switched to ${args.panel} panel`;
        break;
      case 'toggle_zen_mode':
        actions.toggleZenMode();
        result = 'Toggled Zen mode';
        break;
      case 'highlight_text':
        actions.highlightText(
          args.start as number,
          args.end as number,
          args.style as string,
        );
        result = `Highlighted text at ${args.start}-${args.end}`;
        break;

      // Knowledge
      case 'query_lore':
        result = await actions.queryLore(args.query as string);
        break;
      case 'get_character_info':
        result = await actions.getCharacterInfo(args.name as string);
        break;
      case 'get_timeline_context':
        result = await actions.getTimelineContext(args.range as any);
        break;

      // Generation
      case 'rewrite_selection':
        result = await actions.rewriteSelection({
          mode: args.mode as any,
          targetTone: args.target_tone as string,
        });
        break;

      default:
        result = `Unknown tool: ${toolName}`;
    }
    return {
      success: true,
      message: result,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return {
      success: false,
      message: `Error executing ${toolName}: ${error}`,
      error,
    };
  }
}

/**
 * Optional OO-style executor wrapper around AppBrainActions.
 * Pure logic: no React or event/system dependencies.
 */
export class ToolExecutor {
  constructor(private readonly actions: AppBrainActions) {}

  execute(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    return executeAppBrainToolCall(toolName, args, this.actions);
  }
}

