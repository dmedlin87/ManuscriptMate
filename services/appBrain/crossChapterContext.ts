/**
 * Cross-Chapter Context (Enhancement 2C)
 * 
 * Provides multi-chapter windowing for continuity awareness.
 * Includes previous/next chapter context and continuity warnings.
 */

import { Chapter } from '@/types/schema';
import { ManuscriptIntelligence, EntityGraph, Timeline } from '@/types/intelligence';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ChapterBoundary {
  chapterId: string;
  title: string;
  firstParagraph: string;
  lastParagraph: string;
  endingMood: 'cliffhanger' | 'resolution' | 'transition' | 'neutral';
  activeCharacters: string[];
  openPlotThreads: string[];
}

export interface ContinuityIssue {
  type: 'character_presence' | 'timeline_gap' | 'setting_change' | 'plot_thread' | 'tone_shift';
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface CrossChapterContext {
  previousChapter: ChapterBoundary | null;
  nextChapter: ChapterBoundary | null;
  continuityIssues: ContinuityIssue[];
  narrativeArc: {
    position: 'beginning' | 'rising_action' | 'climax' | 'falling_action' | 'resolution';
    percentComplete: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARAGRAPH EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the first meaningful paragraph from chapter text
 */
const extractFirstParagraph = (text: string, maxLength: number = 200): string => {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  if (paragraphs.length === 0) return text.slice(0, maxLength);
  
  const first = paragraphs[0].trim();
  return first.length > maxLength ? first.slice(0, maxLength) + '...' : first;
};

/**
 * Extract the last meaningful paragraph from chapter text
 */
const extractLastParagraph = (text: string, maxLength: number = 200): string => {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 20);
  if (paragraphs.length === 0) return text.slice(-maxLength);
  
  const last = paragraphs[paragraphs.length - 1].trim();
  return last.length > maxLength ? '...' + last.slice(-maxLength) : last;
};

/**
 * Detect the ending mood of a chapter
 */
const detectEndingMood = (lastParagraph: string): ChapterBoundary['endingMood'] => {
  const text = lastParagraph.toLowerCase();
  
  // Cliffhanger patterns
  const cliffhangerPatterns = [
    /\bsuddenly\b/, /\bout of nowhere\b/, /\bbut then\b/,
    /\bto be continued\b/, /\?$/, /\.\.\.$/,
    /\bwhat\b.*\?/, /\bhow\b.*\?/,
  ];
  
  if (cliffhangerPatterns.some(p => p.test(text))) {
    return 'cliffhanger';
  }
  
  // Resolution patterns
  const resolutionPatterns = [
    /\bfinally\b/, /\bat last\b/, /\bpeace\b/, /\bhappy\b/,
    /\bresolved\b/, /\bsettled\b/, /\bended\b/,
  ];
  
  if (resolutionPatterns.some(p => p.test(text))) {
    return 'resolution';
  }
  
  // Transition patterns
  const transitionPatterns = [
    /\bthe next\b/, /\blater\b/, /\bmeanwhile\b/,
    /\belsewhere\b/, /\bback at\b/,
  ];
  
  if (transitionPatterns.some(p => p.test(text))) {
    return 'transition';
  }
  
  return 'neutral';
};

/**
 * Extract active characters from text
 */
const extractActiveCharacters = (
  text: string,
  entities?: EntityGraph
): string[] => {
  if (entities) {
    // Use entity graph if available
    const lastSection = text.slice(-2000); // Last ~500 words
    return entities.nodes
      .filter(n => n.type === 'character')
      .filter(n => {
        const name = n.name.toLowerCase();
        return lastSection.toLowerCase().includes(name);
      })
      .slice(0, 5)
      .map(n => n.name);
  }
  
  // Fallback: simple name detection
  const names = text.match(/\b[A-Z][a-z]+\b/g) || [];
  const nameCounts = new Map<string, number>();
  
  for (const name of names) {
    if (name.length > 2) {
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
  }
  
  return Array.from(nameCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);
};

/**
 * Extract open plot threads from timeline
 */
const extractOpenPlotThreads = (timeline?: Timeline): string[] => {
  if (!timeline) return [];
  
  return timeline.promises
    .filter(p => !p.resolved)
    .slice(0, 5)
    .map(p => p.description);
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUITY DETECTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detect character continuity issues between chapters
 */
const detectCharacterContinuity = (
  prev: ChapterBoundary | null,
  current: { text: string; entities?: EntityGraph }
): ContinuityIssue[] => {
  const issues: ContinuityIssue[] = [];
  
  if (!prev) return issues;
  
  // Get characters in current chapter opening
  const currentOpening = current.text.slice(0, 2000);
  const currentChars = new Set(
    extractActiveCharacters(currentOpening, current.entities)
      .map(c => c.toLowerCase())
  );
  
  // Check if characters from previous chapter's end appear
  const prevChars = prev.activeCharacters.map(c => c.toLowerCase());
  const missingChars = prevChars.filter(c => !currentChars.has(c));
  
  if (missingChars.length > 0 && missingChars.length < prevChars.length) {
    issues.push({
      type: 'character_presence',
      description: `Characters ${missingChars.join(', ')} were present at end of "${prev.title}" but don't appear in this chapter's opening.`,
      severity: 'medium',
      suggestion: 'Consider adding a brief mention of where these characters are or why they\'re absent.',
    });
  }
  
  return issues;
};

/**
 * Detect timeline gaps between chapters
 */
const detectTimelineGap = (
  prevLastParagraph: string,
  currentFirstParagraph: string
): ContinuityIssue | null => {
  const timePatterns = [
    { pattern: /\byears later\b/i, gap: 'years' },
    { pattern: /\bmonths later\b/i, gap: 'months' },
    { pattern: /\bweeks later\b/i, gap: 'weeks' },
    { pattern: /\bthe next day\b/i, gap: 'day' },
    { pattern: /\bthat night\b/i, gap: 'same day' },
    { pattern: /\bimmediately\b/i, gap: 'none' },
  ];
  
  let detectedGap: string | null = null;
  
  for (const { pattern, gap } of timePatterns) {
    if (pattern.test(currentFirstParagraph)) {
      detectedGap = gap;
      break;
    }
  }
  
  // If there's a large unexplained gap
  if (!detectedGap) {
    const prevEndsCliffhanger = detectEndingMood(prevLastParagraph) === 'cliffhanger';
    const currentStartsAbruptly = !/^(the next|that|later|when|after)/i.test(currentFirstParagraph.trim());
    
    if (prevEndsCliffhanger && currentStartsAbruptly) {
      return {
        type: 'timeline_gap',
        description: 'Previous chapter ends on a cliffhanger but this chapter doesn\'t immediately continue the action.',
        severity: 'high',
        suggestion: 'Consider adding a transitional sentence or addressing the cliffhanger resolution.',
      };
    }
  }
  
  return null;
};

/**
 * Detect setting changes between chapters
 */
const detectSettingChange = (
  prevLastParagraph: string,
  currentFirstParagraph: string
): ContinuityIssue | null => {
  // Extract location hints
  const locationPatterns = [
    /\bin the (\w+)\b/i,
    /\bat the (\w+)\b/i,
    /\binto the (\w+)\b/i,
    /\binside the (\w+)\b/i,
  ];
  
  const extractLocations = (text: string): string[] => {
    const locations: string[] = [];
    for (const pattern of locationPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        locations.push(matches[1].toLowerCase());
      }
    }
    return locations;
  };
  
  const prevLocations = extractLocations(prevLastParagraph);
  const currentLocations = extractLocations(currentFirstParagraph);
  
  if (prevLocations.length > 0 && currentLocations.length > 0) {
    const hasOverlap = prevLocations.some(l => currentLocations.includes(l));
    if (!hasOverlap) {
      return {
        type: 'setting_change',
        description: `Setting appears to change from "${prevLocations[0]}" to "${currentLocations[0]}" between chapters.`,
        severity: 'low',
        suggestion: 'If intentional, consider adding a brief transition to orient the reader.',
      };
    }
  }
  
  return null;
};

/**
 * Detect unresolved plot threads
 */
const detectPlotThreadIssues = (
  prev: ChapterBoundary | null,
  currentText: string
): ContinuityIssue[] => {
  const issues: ContinuityIssue[] = [];
  
  if (!prev || prev.openPlotThreads.length === 0) return issues;
  
  // Check if any plot threads are mentioned in current chapter
  const currentLower = currentText.toLowerCase();
  const mentionedThreads = prev.openPlotThreads.filter(thread => {
    const keywords = thread.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    return keywords.some(kw => currentLower.includes(kw));
  });
  
  if (mentionedThreads.length === 0 && prev.openPlotThreads.length > 2) {
    issues.push({
      type: 'plot_thread',
      description: `Previous chapter has ${prev.openPlotThreads.length} open plot threads that aren't touched on in this chapter.`,
      severity: 'low',
      suggestion: 'Consider weaving in references to ongoing plots to maintain reader engagement.',
    });
  }
  
  return issues;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build cross-chapter context for agent awareness
 */
export const buildCrossChapterContext = (
  chapters: Chapter[],
  activeChapterId: string,
  currentText: string,
  intelligenceByChapter?: Map<string, ManuscriptIntelligence>
): CrossChapterContext => {
  const activeIndex = chapters.findIndex(c => c.id === activeChapterId);
  if (activeIndex === -1) {
    return {
      previousChapter: null,
      nextChapter: null,
      continuityIssues: [],
      narrativeArc: { position: 'beginning', percentComplete: 0 },
    };
  }
  
  const currentIntelligence = intelligenceByChapter?.get(activeChapterId);
  
  // Build previous chapter boundary
  let previousChapter: ChapterBoundary | null = null;
  if (activeIndex > 0) {
    const prev = chapters[activeIndex - 1];
    const prevIntel = intelligenceByChapter?.get(prev.id);
    const prevText = prev.content || '';
    
    previousChapter = {
      chapterId: prev.id,
      title: prev.title,
      firstParagraph: extractFirstParagraph(prevText),
      lastParagraph: extractLastParagraph(prevText),
      endingMood: detectEndingMood(extractLastParagraph(prevText)),
      activeCharacters: extractActiveCharacters(prevText.slice(-2000), prevIntel?.entities),
      openPlotThreads: extractOpenPlotThreads(prevIntel?.timeline),
    };
  }
  
  // Build next chapter boundary
  let nextChapter: ChapterBoundary | null = null;
  if (activeIndex < chapters.length - 1) {
    const next = chapters[activeIndex + 1];
    const nextIntel = intelligenceByChapter?.get(next.id);
    const nextText = next.content || '';
    
    nextChapter = {
      chapterId: next.id,
      title: next.title,
      firstParagraph: extractFirstParagraph(nextText),
      lastParagraph: extractLastParagraph(nextText),
      endingMood: detectEndingMood(extractLastParagraph(nextText)),
      activeCharacters: extractActiveCharacters(nextText.slice(0, 2000), nextIntel?.entities),
      openPlotThreads: extractOpenPlotThreads(nextIntel?.timeline),
    };
  }
  
  // Detect continuity issues
  const continuityIssues: ContinuityIssue[] = [];
  
  // Character continuity
  continuityIssues.push(...detectCharacterContinuity(previousChapter, {
    text: currentText,
    entities: currentIntelligence?.entities,
  }));
  
  // Timeline gaps
  if (previousChapter) {
    const timelineIssue = detectTimelineGap(
      previousChapter.lastParagraph,
      extractFirstParagraph(currentText)
    );
    if (timelineIssue) continuityIssues.push(timelineIssue);
  }
  
  // Setting changes
  if (previousChapter) {
    const settingIssue = detectSettingChange(
      previousChapter.lastParagraph,
      extractFirstParagraph(currentText)
    );
    if (settingIssue) continuityIssues.push(settingIssue);
  }
  
  // Plot thread continuity
  continuityIssues.push(...detectPlotThreadIssues(previousChapter, currentText));
  
  // Calculate narrative arc position
  const percentComplete = Math.round(((activeIndex + 1) / chapters.length) * 100);
  let position: CrossChapterContext['narrativeArc']['position'];
  
  if (percentComplete <= 15) {
    position = 'beginning';
  } else if (percentComplete <= 40) {
    position = 'rising_action';
  } else if (percentComplete <= 60) {
    position = 'climax';
  } else if (percentComplete <= 85) {
    position = 'falling_action';
  } else {
    position = 'resolution';
  }
  
  return {
    previousChapter,
    nextChapter,
    continuityIssues,
    narrativeArc: { position, percentComplete },
  };
};

/**
 * Format cross-chapter context for agent prompt
 */
export const formatCrossChapterContext = (ctx: CrossChapterContext): string => {
  let output = '[CHAPTER CONTEXT]\n';
  
  if (ctx.previousChapter) {
    output += `\nPrevious Chapter: "${ctx.previousChapter.title}"\n`;
    output += `Ends with: "${ctx.previousChapter.lastParagraph.slice(0, 100)}..."\n`;
    output += `Mood: ${ctx.previousChapter.endingMood}\n`;
    if (ctx.previousChapter.activeCharacters.length > 0) {
      output += `Active characters: ${ctx.previousChapter.activeCharacters.join(', ')}\n`;
    }
  }
  
  if (ctx.nextChapter) {
    output += `\nNext Chapter: "${ctx.nextChapter.title}"\n`;
    output += `Begins with: "${ctx.nextChapter.firstParagraph.slice(0, 100)}..."\n`;
  }
  
  if (ctx.continuityIssues.length > 0) {
    output += `\nContinuity Warnings (${ctx.continuityIssues.length}):\n`;
    for (const issue of ctx.continuityIssues) {
      const icon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
      output += `${icon} ${issue.description}\n`;
    }
  }
  
  output += `\nNarrative Position: ${ctx.narrativeArc.position.replace('_', ' ')} (${ctx.narrativeArc.percentComplete}% complete)\n`;
  
  return output;
};
