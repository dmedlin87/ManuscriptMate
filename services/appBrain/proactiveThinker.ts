/**
 * Proactive Thinker Service
 * 
 * Uses LLM to analyze recent changes and surface proactive suggestions
 * without user prompting. Subscribes to EventBus and thinks in the background.
 * 
 * This is the "always-on intelligence" that makes the agent feel aware
 * of what the user is doing and proactively helpful.
 */

import { ai } from '../gemini/client';
import { ModelConfig, ThinkingBudgets } from '../../config/models';
import { eventBus } from './eventBus';
import type { AppEvent, AppBrainState } from './types';
import { buildCompressedContext } from './contextBuilder';
import { getHighPriorityConflicts, formatConflictsForPrompt } from './intelligenceMemoryBridge';
import { getImportantReminders, type ProactiveSuggestion } from '../memory/proactive';
import { evolveBedsideNote } from '../memory';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface ThinkingResult {
  /** Proactive suggestions from the LLM */
  suggestions: ProactiveSuggestion[];
  /** Raw thinking output (for debugging) */
  rawThinking?: string;
  /** Time taken to think */
  thinkingTime: number;
  /** Whether the LLM found anything significant */
  significant: boolean;
}

export interface ThinkerConfig {
  /** Minimum time between thinking sessions (ms) */
  debounceMs: number;
  /** Maximum events to batch before forcing a think */
  maxBatchSize: number;
  /** Minimum events required to trigger thinking */
  minEventsToThink: number;
  /** Event types that trigger immediate thinking */
  urgentEventTypes: AppEvent['type'][];
  /** Enable/disable the thinker */
  enabled: boolean;
}

export interface ThinkerState {
  /** Whether a thinking session is in progress */
  isThinking: boolean;
  /** Last time thinking completed */
  lastThinkTime: number;
  /** Number of suggestions generated this session */
  suggestionsGenerated: number;
  pendingEvents: AppEvent[];
  editDeltaAccumulator: number;
  lastEditEvolveAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ThinkerConfig = {
  debounceMs: 10000, // 10 seconds between thinks
  maxBatchSize: 20,
  minEventsToThink: 3,
  urgentEventTypes: ['ANALYSIS_COMPLETED', 'INTELLIGENCE_UPDATED'],
  enabled: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const PROACTIVE_THINKING_PROMPT = `You are a proactive writing assistant analyzing recent activity in a manuscript editor.

CURRENT CONTEXT:
{{CONTEXT}}

RECENT ACTIVITY:
{{EVENTS}}

{{CONFLICTS}}

TASK: Analyze the recent activity and context. If you notice any significant patterns, opportunities for improvement, or potential issues, generate 1-3 proactive suggestions.

Focus on:
1. Plot/continuity issues that the writer might not notice
2. Character consistency concerns
3. Pacing problems developing across recent edits
4. Opportunities to strengthen the narrative
5. Conflicts between what was written and established lore/memory

Only suggest things that are GENUINELY HELPFUL and NON-OBVIOUS. Do not suggest trivial improvements.

If nothing significant stands out, return an empty array.

Respond in JSON format:
{
  "significant": boolean,
  "suggestions": [
    {
      "title": "Short title",
      "description": "Detailed explanation",
      "priority": "high" | "medium" | "low",
      "type": "plot" | "character" | "pacing" | "style" | "continuity"
    }
  ],
  "reasoning": "Brief explanation of your analysis"
}`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN THINKER CLASS
// ─────────────────────────────────────────────────────────────────────────────

export class ProactiveThinker {
  private config: ThinkerConfig;
  private state: ThinkerState;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribe: (() => void) | null = null;
  private getState: (() => AppBrainState) | null = null;
  private onSuggestion: ((suggestion: ProactiveSuggestion) => void) | null = null;
  private projectId: string | null = null;

  constructor(config: Partial<ThinkerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isThinking: false,
      suggestionsGenerated: 0,
      lastThinkTime: 0,
      pendingEvents: [],
      editDeltaAccumulator: 0,
      lastEditEvolveAt: 0,
    };
  }

  /**
   * Start the proactive thinker.
   * 
   * @param getState - Function to get current AppBrainState
   * @param projectId - Current project ID for memory access
   * @param onSuggestion - Callback when a new suggestion is generated
   */
  start(
    getState: () => AppBrainState,
    projectId: string,
    onSuggestion: (suggestion: ProactiveSuggestion) => void
  ): void {
    if (!this.config.enabled) return;
    
    this.getState = getState;
    this.projectId = projectId;
    this.onSuggestion = onSuggestion;
    
    // Subscribe to all events
    this.unsubscribe = eventBus.subscribeAll((event) => {
      this.handleEvent(event);
    });
    
    console.log('[ProactiveThinker] Started');
  }

  /**
   * Stop the proactive thinker.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    this.state.pendingEvents = [];
    console.log('[ProactiveThinker] Stopped');
  }

  /**
   * Get current thinker state.
   */
  getStatus(): ThinkerState {
    return { ...this.state };
  }

  /**
   * Manually trigger a thinking session.
   */
  async forceThink(): Promise<ThinkingResult | null> {
    if (!this.getState || !this.projectId) {
      return null;
    }
    
    return this.performThinking();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ───────────────────────────────────────────────────────────────────────────

  private handleEvent(event: AppEvent): void {
    // Opportunistic bedside-note updates for high-signal events
    if (this.projectId && this.getState) {
      const state = this.getState();
      const projectId = state.manuscript.projectId;

      // Chapter transitions → evolve bedside with immediate context
      if (event.type === 'CHAPTER_CHANGED' && event.payload?.chapterId) {
        const issues = event.payload.issues ?? [];
        const watched = event.payload.watchedEntities ?? [];
        const lines: string[] = [];
        lines.push(`Now in chapter: "${event.payload.title}"`);
        if (issues.length > 0) {
          lines.push('Chapter issues to watch:');
          for (const issue of issues.slice(0, 3)) {
            const severity = issue.severity ? ` (${issue.severity})` : '';
            lines.push(`- ${issue.description}${severity}`);
          }
        }
        if (watched.length > 0) {
          lines.push('Watched entities in this chapter:');
          for (const entity of watched.slice(0, 5)) {
            const priority = entity.priority ? ` [${entity.priority}]` : '';
            lines.push(`- ${entity.name}${priority}${entity.reason ? ` — ${entity.reason}` : ''}`);
          }
        }
        const planText = lines.join('\n');
        if (planText.trim()) {
          evolveBedsideNote(projectId, planText, {
            changeReason: 'chapter_transition',
            chapterId: event.payload.chapterId,
            extraTags: [`chapter:${event.payload.chapterId}`],
          }).catch(e => console.warn('[ProactiveThinker] Chapter transition bedside update failed:', e));
        }
      }

      // Significant edit bursts → evolve bedside with a reminder to recheck continuity
      if (event.type === 'TEXT_CHANGED') {
        const delta = event.payload?.delta ?? 0;
        this.state.editDeltaAccumulator += Math.abs(delta);
        const EDIT_THRESHOLD = 500;
        const EDIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
        const now = Date.now();
        if (
          this.state.editDeltaAccumulator >= EDIT_THRESHOLD &&
          now - this.state.lastEditEvolveAt > EDIT_COOLDOWN_MS
        ) {
          this.state.editDeltaAccumulator = 0;
          this.state.lastEditEvolveAt = now;

          const activeChapter = state.manuscript.chapters.find(
            ch => ch.id === state.manuscript.activeChapterId
          );
          const chapterLine = activeChapter ? ` in "${activeChapter.title}"` : '';
          const planText = `Significant edits detected${chapterLine}. Recheck continuity, goals, and conflicts.`;
          evolveBedsideNote(projectId, planText, {
            changeReason: 'significant_edit',
            chapterId: state.manuscript.activeChapterId ?? undefined,
            extraTags: [
              ...(state.manuscript.activeChapterId ? [`chapter:${state.manuscript.activeChapterId}`] : []),
              'edit:significant',
            ],
          }).catch(e => console.warn('[ProactiveThinker] Significant edit bedside update failed:', e));
        }
      }
    }

    // Add to pending events
    this.state.pendingEvents.push(event);
    
    // Trim to max batch size
    if (this.state.pendingEvents.length > this.config.maxBatchSize) {
      this.state.pendingEvents = this.state.pendingEvents.slice(-this.config.maxBatchSize);
    }
    
    // Check for urgent events
    const isUrgent = this.config.urgentEventTypes.includes(event.type);
    
    // Schedule thinking
    this.scheduleThinking(isUrgent);
  }

  private scheduleThinking(urgent: boolean): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Check if we have enough events
    if (this.state.pendingEvents.length < this.config.minEventsToThink && !urgent) {
      return;
    }
    
    // Check cooldown
    const timeSinceLastThink = Date.now() - this.state.lastThinkTime;
    const cooldownRemaining = Math.max(0, this.config.debounceMs - timeSinceLastThink);
    
    // Use shorter delay for urgent events
    const delay = urgent ? Math.min(cooldownRemaining, 2000) : cooldownRemaining;
    
    this.debounceTimer = setTimeout(() => {
      this.performThinking();
    }, delay);
  }

  private async performThinking(): Promise<ThinkingResult | null> {
    if (this.state.isThinking || !this.getState || !this.projectId) {
      return null;
    }
    
    this.state.isThinking = true;
    const startTime = Date.now();
    
    try {
      const state = this.getState();
      const events = [...this.state.pendingEvents];
      
      // Clear pending events
      this.state.pendingEvents = [];
      
      // Build context
      const context = buildCompressedContext(state);
      const formattedEvents = this.formatEventsForPrompt(events);
      
      // Get conflicts from intelligence-memory bridge
      let conflictsSection = '';
      if (state.intelligence.hud) {
        const conflicts = await getHighPriorityConflicts(
          state.intelligence.hud,
          this.projectId
        );
        conflictsSection = formatConflictsForPrompt(conflicts, 300);
      }
      
      // Build prompt
      const prompt = PROACTIVE_THINKING_PROMPT
        .replace('{{CONTEXT}}', context)
        .replace('{{EVENTS}}', formattedEvents)
        .replace('{{CONFLICTS}}', conflictsSection ? `\nDETECTED CONFLICTS:\n${conflictsSection}` : '');
      
      // Call LLM
      const response = await ai.models.generateContent({
        model: ModelConfig.agent,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: ThinkingBudgets.analysis },
          responseMimeType: "application/json",
        },
      });
      
      const text = response.text || '';
      const result = this.parseThinkingResult(text);

      this.state.lastThinkTime = Date.now();
      this.state.suggestionsGenerated += result.suggestions.length;

      if (this.onSuggestion) {
        for (const suggestion of result.suggestions) {
          this.onSuggestion(suggestion);
        }
      }

      if (this.projectId && result.significant) {
        try {
          const reminders = await getImportantReminders(this.projectId);
          const lines: string[] = [];

          if (result.suggestions.length > 0) {
            lines.push('Proactive opportunities to focus on next:');
            for (const suggestion of result.suggestions.slice(0, 3)) {
              lines.push(`- ${suggestion.title}: ${suggestion.description}`);
            }
          }

          if (reminders.length > 0) {
            lines.push('Important unresolved issues and stalled goals:');
            for (const reminder of reminders.slice(0, 3)) {
              lines.push(`- ${reminder.title}: ${reminder.description}`);
            }
          }

          const planText = lines.join('\n');
          if (planText.trim()) {
            await evolveBedsideNote(this.projectId, planText, {
              changeReason: 'proactive_thinking',
            });
          }
        } catch (e) {
          console.warn('[ProactiveThinker] Failed to evolve bedside note:', e);
        }
      }

      return {
        ...result,
        thinkingTime: Date.now() - startTime,
      };
      
    } catch (error) {
      console.error('[ProactiveThinker] Thinking failed:', error);
      return {
        suggestions: [],
        thinkingTime: Date.now() - startTime,
        significant: false,
      };
    } finally {
      this.state.isThinking = false;
    }
  }

  private formatEventsForPrompt(events: AppEvent[]): string {
    if (events.length === 0) return 'No recent events.';
    
    const lines: string[] = [];
    for (const event of events.slice(-10)) {
      const time = new Date(event.timestamp).toLocaleTimeString();
      lines.push(`[${time}] ${event.type}: ${JSON.stringify(event.payload).slice(0, 100)}`);
    }
    
    return lines.join('\n');
  }

  private parseThinkingResult(text: string): Omit<ThinkingResult, 'thinkingTime'> {
    try {
      const parsed = JSON.parse(text);
      
      const suggestions: ProactiveSuggestion[] = (parsed.suggestions || []).map(
        (s: any, i: number) => ({
          id: `proactive-${Date.now()}-${i}`,
          type: 'related_memory' as const,
          priority: s.priority || 'medium',
          title: s.title || 'Suggestion',
          description: s.description || '',
          source: {
            type: 'memory' as const,
            id: 'proactive-thinker',
          },
          tags: [s.type || 'general'],
          createdAt: Date.now(),
        })
      );
      
      return {
        suggestions,
        rawThinking: parsed.reasoning,
        significant: parsed.significant || suggestions.length > 0,
      };
    } catch (e) {
      console.warn('[ProactiveThinker] Failed to parse thinking result:', e);
      return {
        suggestions: [],
        significant: false,
      };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON & CONVENIENCE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

let thinkerInstance: ProactiveThinker | null = null;

/**
 * Get or create the singleton ProactiveThinker instance.
 */
export function getProactiveThinker(config?: Partial<ThinkerConfig>): ProactiveThinker {
  if (!thinkerInstance) {
    thinkerInstance = new ProactiveThinker(config);
  }
  return thinkerInstance;
}

/**
 * Start the proactive thinker with the given configuration.
 */
export function startProactiveThinker(
  getState: () => AppBrainState,
  projectId: string,
  onSuggestion: (suggestion: ProactiveSuggestion) => void,
  config?: Partial<ThinkerConfig>
): ProactiveThinker {
  const thinker = getProactiveThinker(config);
  thinker.start(getState, projectId, onSuggestion);
  return thinker;
}

/**
 * Stop the proactive thinker.
 */
export function stopProactiveThinker(): void {
  if (thinkerInstance) {
    thinkerInstance.stop();
  }
}

/**
 * Reset the singleton instance (for testing).
 */
export function resetProactiveThinker(): void {
  if (thinkerInstance) {
    thinkerInstance.stop();
  }
  thinkerInstance = null;
}
