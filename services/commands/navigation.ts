import type { NavigateToTextParams } from '@/services/appBrain';
import type { AppBrainCommand, NavigationDependencies } from './types';

export class NavigateToTextCommand
  implements AppBrainCommand<NavigateToTextParams, string, NavigationDependencies>
{
  async execute(
    params: NavigateToTextParams,
    deps: NavigationDependencies,
  ): Promise<string> {
    const { query, searchType = 'fuzzy', character, chapter } = params;

    let searchText = deps.currentText;
    let targetChapterId = deps.activeChapterId;

    if (chapter) {
      const targetChapter = deps.chapters.find(
        (c) =>
          c.title.toLowerCase().includes(chapter.toLowerCase()) ||
          c.order.toString() === chapter,
      );
      if (targetChapter) {
        searchText = targetChapter.content;
        targetChapterId = targetChapter.id;
      }
    }

    let foundIndex = -1;
    const lowerQuery = query.toLowerCase();

    if (searchType === 'exact') {
      foundIndex = searchText.indexOf(query);
    } else if (searchType === 'dialogue' && character) {
      const dialoguePattern = new RegExp(
        `[""]([^""]*${query}[^""]*)[""]\\s*(?:said|replied|asked|whispered|shouted)?\\s*${character}|` +
          `${character}\\s*(?:said|replied|asked|whispered|shouted)?\\s*[""]([^""]*${query}[^""]*)[""]`,
        'i',
      );
      const match = searchText.match(dialoguePattern);
      if (match) {
        foundIndex = match.index ?? -1;
      }
    } else if (searchType === 'character_mention' && character) {
      const mentionPattern = new RegExp(character, 'gi');
      const match = mentionPattern.exec(searchText);
      if (match) {
        foundIndex = match.index;
      }
    } else {
      foundIndex = searchText.toLowerCase().indexOf(lowerQuery);
    }

    if (foundIndex === -1) {
      return `Could not find "${query}" in the manuscript.`;
    }

    if (targetChapterId !== deps.activeChapterId && targetChapterId) {
      deps.selectChapter(targetChapterId);
    }

    const endIndex = foundIndex + query.length;
    deps.navigateToRange(foundIndex, endIndex);

    const context = searchText.substring(
      Math.max(0, foundIndex - 30),
      Math.min(searchText.length, foundIndex + query.length + 30),
    );

    return `Found at position ${foundIndex}. Context: "...${context}..."`;
  }
}

export class JumpToChapterCommand
  implements AppBrainCommand<string, string, NavigationDependencies>
{
  async execute(identifier: string, deps: NavigationDependencies): Promise<string> {
    const chapter = deps.chapters.find(
      (c) =>
        c.title.toLowerCase().includes(identifier.toLowerCase()) ||
        (c.order + 1).toString() === identifier ||
        c.order.toString() === identifier,
    );

    if (!chapter) {
      return `Could not find chapter "${identifier}". Available: ${deps.chapters
        .map((c) => c.title)
        .join(', ')}`;
    }

    deps.selectChapter(chapter.id);
    return `Switched to "${chapter.title}"`;
  }
}

export interface JumpToSceneParams {
  sceneType: string;
  direction: 'next' | 'previous';
}

export class JumpToSceneCommand
  implements AppBrainCommand<JumpToSceneParams, string, NavigationDependencies>
{
  async execute(
    params: JumpToSceneParams,
    deps: NavigationDependencies,
  ): Promise<string> {
    const { sceneType, direction } = params;

    if (!deps.intelligence?.structural?.scenes) {
      return 'No scene data available. Try running analysis first.';
    }

    const scenes = deps.intelligence.structural.scenes;
    const cursorPos = deps.cursorPosition;

    let targetScene;
    if (direction === 'next') {
      targetScene = scenes.find(
        (s) => s.startOffset > cursorPos && (sceneType === 'any' || s.type === sceneType),
      );
    } else {
      const candidates = scenes.filter(
        (s) => s.endOffset < cursorPos && (sceneType === 'any' || s.type === sceneType),
      );
      targetScene = candidates[candidates.length - 1];
    }

    if (!targetScene) {
      return `No ${direction} ${sceneType} scene found.`;
    }

    deps.scrollToPosition(targetScene.startOffset);
    return `Jumped to ${targetScene.type} scene at position ${targetScene.startOffset}`;
  }
}
