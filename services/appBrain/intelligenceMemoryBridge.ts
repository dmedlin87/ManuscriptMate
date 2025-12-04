/**
 * Intelligence-Memory Bridge
 * 
 * Cross-references new Intelligence Engine findings with Memory/Lore
 * to detect violations of established facts, goals, and world rules.
 * 
 * This bridges the "perception" layer (Intelligence) with the "memory" layer,
 * enabling the agent to automatically detect when new analysis contradicts
 * what it already knows.
 */

import type { 
  ManuscriptIntelligence, 
  ManuscriptHUD,
  RiskFlag,
  HeatmapSection,
  VoiceFingerprint,
  PlotPromise,
  EntityNode,
} from '../../types/intelligence';
import type { 
  MemoryNote, 
  AgentGoal,
  WatchedEntity,
} from '../memory/types';
import { 
  searchMemoriesByTags, 
  getActiveGoals,
  getWatchedEntities,
  createMemory,
  getMemories,
} from '../memory';
import type { CharacterProfile } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface IntelligenceConflict {
  id: string;
  type: 'lore_violation' | 'goal_conflict' | 'voice_inconsistency' | 'plot_contradiction';
  severity: 'critical' | 'warning' | 'info';
  
  /** The intelligence finding that triggered this conflict */
  finding: {
    source: 'heatmap' | 'voice' | 'timeline' | 'entity';
    flag?: RiskFlag;
    description: string;
    offset?: number;
  };
  
  /** The memory/lore item being violated */
  reference: {
    type: 'memory' | 'goal' | 'lore' | 'watched_entity';
    id: string;
    text: string;
  };
  
  /** AI-friendly explanation of the conflict */
  explanation: string;
  
  /** Suggested resolution */
  suggestion?: string;
  
  createdAt: number;
}

export interface BridgeAnalysisResult {
  conflicts: IntelligenceConflict[];
  memoriesCreated: number;
  analysisTime: number;
}

export interface BridgeOptions {
  projectId: string;
  /** Lore characters for cross-reference */
  loreCharacters?: CharacterProfile[];
  /** World rules for cross-reference */
  worldRules?: string[];
  /** Skip creating memories for detected conflicts */
  skipMemoryCreation?: boolean;
  /** Minimum severity to report */
  minSeverity?: 'critical' | 'warning' | 'info';
}

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY MAPPING
// ─────────────────────────────────────────────────────────────────────────────

const FLAG_SEVERITY: Record<RiskFlag, 'critical' | 'warning' | 'info'> = {
  contradiction_detected: 'critical',
  unresolved_promise: 'warning',
  character_absent: 'warning',
  passive_voice_heavy: 'info',
  pacing_slow: 'info',
  pacing_rushed: 'warning',
  dialogue_heavy: 'info',
  exposition_dump: 'warning',
  filter_words: 'info',
  adverb_overuse: 'info',
  long_sentences: 'info',
  short_sentences: 'info',
  low_tension: 'warning',
  setting_unclear: 'warning',
};

const SEVERITY_RANK = { critical: 0, warning: 1, info: 2 };

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-REFERENCE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a voice inconsistency conflicts with established character facts
 */
async function checkVoiceAgainstMemory(
  voice: VoiceFingerprint,
  projectId: string,
  loreCharacters: CharacterProfile[] = []
): Promise<IntelligenceConflict[]> {
  const conflicts: IntelligenceConflict[] = [];
  
  for (const alert of voice.consistencyAlerts) {
    // Extract character name from alert (format: "CharName shows metric shift...")
    const nameMatch = alert.match(/^(\w+)\s+shows/);
    if (!nameMatch) continue;
    
    const characterName = nameMatch[1];
    const charTag = `character:${characterName.toLowerCase()}`;
    
    // Search for memories about this character's voice/speech
    const relatedMemories = await searchMemoriesByTags(
      [charTag, 'voice', 'speech', 'dialogue'],
      { projectId, limit: 5 }
    );
    
    // Check lore for voice descriptions
    const loreChar = loreCharacters.find(
      c => c.name.toLowerCase() === characterName.toLowerCase()
    );
    
    // If we have established voice patterns that conflict
    for (const memory of relatedMemories) {
      if (memory.text.toLowerCase().includes('voice') || 
          memory.text.toLowerCase().includes('speak') ||
          memory.text.toLowerCase().includes('talk')) {
        conflicts.push({
          id: `voice-${characterName}-${Date.now()}`,
          type: 'voice_inconsistency',
          severity: 'warning',
          finding: {
            source: 'voice',
            description: alert,
          },
          reference: {
            type: 'memory',
            id: memory.id,
            text: memory.text,
          },
          explanation: `${characterName}'s dialogue pattern shifted mid-manuscript, which may conflict with established voice: "${memory.text.slice(0, 100)}..."`,
          suggestion: `Review ${characterName}'s dialogue for consistency with their established voice pattern.`,
          createdAt: Date.now(),
        });
      }
    }
    
    // Check lore character bio for voice hints
    if (loreChar?.bio) {
      const voiceKeywords = ['speaks', 'voice', 'accent', 'manner', 'formal', 'casual', 'gruff', 'soft'];
      const hasVoiceDescription = voiceKeywords.some(kw => 
        loreChar.bio?.toLowerCase().includes(kw)
      );
      
      if (hasVoiceDescription) {
        conflicts.push({
          id: `voice-lore-${characterName}-${Date.now()}`,
          type: 'lore_violation',
          severity: 'warning',
          finding: {
            source: 'voice',
            description: alert,
          },
          reference: {
            type: 'lore',
            id: loreChar.name,
            text: loreChar.bio,
          },
          explanation: `${characterName}'s dialogue shift may violate their lore description: "${loreChar.bio.slice(0, 100)}..."`,
          suggestion: `Ensure ${characterName}'s dialogue aligns with their established character.`,
          createdAt: Date.now(),
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Check if heatmap issues conflict with active goals
 */
async function checkHeatmapAgainstGoals(
  heatmap: HeatmapSection[],
  projectId: string
): Promise<IntelligenceConflict[]> {
  const conflicts: IntelligenceConflict[] = [];
  const goals = await getActiveGoals(projectId);
  
  if (goals.length === 0) return conflicts;
  
  // Map of flag types to goal keywords
  const flagGoalMap: Record<string, string[]> = {
    pacing_slow: ['pacing', 'tension', 'action', 'faster', 'speed'],
    pacing_rushed: ['pacing', 'slow down', 'breathe', 'pause'],
    dialogue_heavy: ['dialogue', 'balance', 'action', 'description'],
    exposition_dump: ['show', 'tell', 'exposition', 'info-dump'],
    low_tension: ['tension', 'conflict', 'stakes', 'suspense'],
    character_absent: ['character', 'presence', 'protagonist'],
  };
  
  for (const section of heatmap) {
    for (const flag of section.flags) {
      const keywords = flagGoalMap[flag];
      if (!keywords) continue;
      
      // Check if any goal mentions these concepts
      for (const goal of goals) {
        const goalText = `${goal.title} ${goal.description || ''}`.toLowerCase();
        const isRelevant = keywords.some(kw => goalText.includes(kw));
        
        if (isRelevant) {
          conflicts.push({
            id: `goal-${flag}-${goal.id}-${section.offset}`,
            type: 'goal_conflict',
            severity: FLAG_SEVERITY[flag] || 'warning',
            finding: {
              source: 'heatmap',
              flag,
              description: section.suggestions[0] || `Issue detected: ${flag}`,
              offset: section.offset,
            },
            reference: {
              type: 'goal',
              id: goal.id,
              text: goal.title + (goal.description ? `: ${goal.description}` : ''),
            },
            explanation: `The "${flag.replace(/_/g, ' ')}" issue at offset ${section.offset} conflicts with your goal: "${goal.title}"`,
            suggestion: section.suggestions[0],
            createdAt: Date.now(),
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Check if unresolved plot promises conflict with watched entities or story goals
 */
async function checkPlotPromisesAgainstMemory(
  promises: PlotPromise[],
  projectId: string
): Promise<IntelligenceConflict[]> {
  const conflicts: IntelligenceConflict[] = [];
  
  const [memories, goals] = await Promise.all([
    getMemories({ scope: 'project', projectId, type: 'plan', limit: 20 }),
    getActiveGoals(projectId),
  ]);
  
  // Check unresolved promises against completion goals
  const unresolvedPromises = promises.filter(p => !p.resolved);
  
  for (const promise of unresolvedPromises) {
    // Check if any goal expects this to be resolved
    for (const goal of goals) {
      const goalText = `${goal.title} ${goal.description || ''}`.toLowerCase();
      const promiseText = promise.description.toLowerCase();
      
      // Look for keyword overlap
      const promiseWords = promiseText.split(/\s+/).filter(w => w.length > 4);
      const matchCount = promiseWords.filter(w => goalText.includes(w)).length;
      
      if (matchCount >= 2) {
        conflicts.push({
          id: `plot-goal-${promise.id}-${goal.id}`,
          type: 'goal_conflict',
          severity: 'warning',
          finding: {
            source: 'timeline',
            description: `Unresolved ${promise.type}: ${promise.description}`,
            offset: promise.offset,
          },
          reference: {
            type: 'goal',
            id: goal.id,
            text: goal.title,
          },
          explanation: `Plot thread "${promise.description.slice(0, 50)}..." is unresolved, which may block goal: "${goal.title}"`,
          suggestion: `Consider resolving this ${promise.type} to make progress on your goal.`,
          createdAt: Date.now(),
        });
      }
    }
    
    // Check against plan-type memories
    for (const memory of memories) {
      const memoryText = memory.text.toLowerCase();
      const promiseText = promise.description.toLowerCase();
      
      if (memoryText.includes('resolve') || memoryText.includes('payoff') || memoryText.includes('complete')) {
        const promiseWords = promiseText.split(/\s+/).filter(w => w.length > 4);
        const matchCount = promiseWords.filter(w => memoryText.includes(w)).length;
        
        if (matchCount >= 2) {
          conflicts.push({
            id: `plot-memory-${promise.id}-${memory.id}`,
            type: 'plot_contradiction',
            severity: 'info',
            finding: {
              source: 'timeline',
              description: `Unresolved ${promise.type}: ${promise.description}`,
              offset: promise.offset,
            },
            reference: {
              type: 'memory',
              id: memory.id,
              text: memory.text,
            },
            explanation: `You planned to "${memory.text.slice(0, 60)}..." but this plot thread remains unresolved.`,
            createdAt: Date.now(),
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Check if active entities match watched entities for alerts
 */
async function checkEntitiesAgainstWatchlist(
  activeEntities: EntityNode[],
  projectId: string
): Promise<IntelligenceConflict[]> {
  const conflicts: IntelligenceConflict[] = [];
  const watched = await getWatchedEntities(projectId);
  
  if (watched.length === 0) return conflicts;
  
  for (const entity of activeEntities) {
    const watchedEntity = watched.find(
      w => w.name.toLowerCase() === entity.name.toLowerCase()
    );
    
    if (watchedEntity && watchedEntity.monitoringEnabled) {
      // This is more of an info alert - entity is present and being watched
      conflicts.push({
        id: `watched-${entity.id}-${Date.now()}`,
        type: 'lore_violation', // Using this type for visibility
        severity: 'info',
        finding: {
          source: 'entity',
          description: `${entity.name} is active in current scene (${entity.mentionCount} mentions)`,
        },
        reference: {
          type: 'watched_entity',
          id: watchedEntity.id,
          text: watchedEntity.reason || `Watching ${watchedEntity.name}`,
        },
        explanation: `Watched character "${entity.name}" appears here. Reason: ${watchedEntity.reason || 'No reason specified'}`,
        createdAt: Date.now(),
      });
    }
  }
  
  return conflicts;
}

/**
 * Check world rules against detected settings/locations
 */
function checkWorldRulesAgainstIntelligence(
  intelligence: ManuscriptIntelligence,
  worldRules: string[]
): IntelligenceConflict[] {
  const conflicts: IntelligenceConflict[] = [];
  
  if (worldRules.length === 0) return conflicts;
  
  // Extract location and time markers from intelligence
  const locations = intelligence.entities.nodes
    .filter(n => n.type === 'location')
    .map(n => n.name.toLowerCase());
  
  const timeMarkers = intelligence.timeline.events
    .map(e => e.temporalMarker?.toLowerCase() || '')
    .filter(Boolean);
  
  // Check each world rule for potential violations
  for (const rule of worldRules) {
    const ruleLower = rule.toLowerCase();
    
    // Check for location-based rules
    for (const location of locations) {
      if (ruleLower.includes(location)) {
        // Rule mentions this location - check for contradictions
        const negativeKeywords = ['never', 'cannot', 'impossible', 'forbidden', 'no one'];
        const hasNegation = negativeKeywords.some(kw => ruleLower.includes(kw));
        
        if (hasNegation) {
          conflicts.push({
            id: `worldrule-${location}-${Date.now()}`,
            type: 'lore_violation',
            severity: 'critical',
            finding: {
              source: 'entity',
              description: `Location "${location}" is used in the manuscript`,
            },
            reference: {
              type: 'lore',
              id: 'world-rule',
              text: rule,
            },
            explanation: `Usage of "${location}" may violate world rule: "${rule}"`,
            suggestion: 'Review scene for world-building consistency.',
            createdAt: Date.now(),
          });
        }
      }
    }
  }
  
  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BRIDGE FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze intelligence results and cross-reference with memory/lore.
 * 
 * This is the main entry point for the Intelligence-Memory Bridge.
 * Call this after intelligence processing completes to detect conflicts.
 */
export async function analyzeIntelligenceAgainstMemory(
  intelligence: ManuscriptIntelligence,
  options: BridgeOptions
): Promise<BridgeAnalysisResult> {
  const startTime = Date.now();
  const allConflicts: IntelligenceConflict[] = [];
  const { projectId, loreCharacters = [], worldRules = [], minSeverity = 'info' } = options;
  
  // 1. Check voice consistency against memory/lore
  const voiceConflicts = await checkVoiceAgainstMemory(
    intelligence.voice,
    projectId,
    loreCharacters
  );
  allConflicts.push(...voiceConflicts);
  
  // 2. Check heatmap issues against goals
  const heatmapConflicts = await checkHeatmapAgainstGoals(
    intelligence.heatmap.sections,
    projectId
  );
  allConflicts.push(...heatmapConflicts);
  
  // 3. Check plot promises against memory/goals
  const plotConflicts = await checkPlotPromisesAgainstMemory(
    intelligence.timeline.promises,
    projectId
  );
  allConflicts.push(...plotConflicts);
  
  // 4. Check active entities against watchlist
  const entityConflicts = await checkEntitiesAgainstWatchlist(
    intelligence.hud.context.activeEntities,
    projectId
  );
  allConflicts.push(...entityConflicts);
  
  // 5. Check world rules
  const worldRuleConflicts = checkWorldRulesAgainstIntelligence(
    intelligence,
    worldRules
  );
  allConflicts.push(...worldRuleConflicts);
  
  // Filter by minimum severity
  const minRank = SEVERITY_RANK[minSeverity];
  const filteredConflicts = allConflicts.filter(
    c => SEVERITY_RANK[c.severity] <= minRank
  );
  
  // Deduplicate by ID
  const uniqueConflicts = Array.from(
    new Map(filteredConflicts.map(c => [c.id, c])).values()
  );
  
  // Sort by severity
  uniqueConflicts.sort((a, b) => 
    SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );
  
  // Create memories for significant conflicts
  let memoriesCreated = 0;
  if (!options.skipMemoryCreation) {
    for (const conflict of uniqueConflicts.filter(c => c.severity !== 'info')) {
      try {
        await createMemory({
          text: conflict.explanation,
          type: 'issue',
          scope: 'project',
          projectId,
          topicTags: [conflict.type, `severity:${conflict.severity}`],
          importance: conflict.severity === 'critical' ? 0.9 : 0.7,
        });
        memoriesCreated++;
      } catch (e) {
        console.warn('[IntelligenceMemoryBridge] Failed to create memory:', e);
      }
    }
  }
  
  return {
    conflicts: uniqueConflicts,
    memoriesCreated,
    analysisTime: Date.now() - startTime,
  };
}

/**
 * Quick check for high-severity conflicts only.
 * Use this for real-time feedback during editing.
 */
export async function getHighPriorityConflicts(
  hud: ManuscriptHUD,
  projectId: string
): Promise<IntelligenceConflict[]> {
  const conflicts: IntelligenceConflict[] = [];
  
  // Only check prioritized issues from HUD
  const goals = await getActiveGoals(projectId);
  
  for (const issue of hud.prioritizedIssues) {
    if (issue.severity < 0.7) continue;
    
    // Check if this issue conflicts with any goal
    for (const goal of goals) {
      const goalText = `${goal.title} ${goal.description || ''}`.toLowerCase();
      const issueText = issue.description.toLowerCase();
      
      // Simple keyword overlap check
      const issueWords = issueText.split(/\s+/).filter(w => w.length > 3);
      const hasOverlap = issueWords.some(w => goalText.includes(w));
      
      if (hasOverlap) {
        conflicts.push({
          id: `priority-${issue.type}-${goal.id}`,
          type: 'goal_conflict',
          severity: 'critical',
          finding: {
            source: 'heatmap',
            flag: issue.type,
            description: issue.description,
            offset: issue.offset,
          },
          reference: {
            type: 'goal',
            id: goal.id,
            text: goal.title,
          },
          explanation: `High-severity issue "${issue.description}" may block goal: "${goal.title}"`,
          createdAt: Date.now(),
        });
      }
    }
  }
  
  return conflicts;
}

/**
 * Format conflicts for AI context inclusion
 */
export function formatConflictsForPrompt(
  conflicts: IntelligenceConflict[],
  maxLength: number = 500
): string {
  if (conflicts.length === 0) return '';
  
  const lines: string[] = ['[INTELLIGENCE-MEMORY CONFLICTS]'];
  
  for (const conflict of conflicts.slice(0, 5)) {
    const icon = conflict.severity === 'critical' ? '🔴' : 
                 conflict.severity === 'warning' ? '🟡' : '🔵';
    lines.push(`${icon} ${conflict.type.replace(/_/g, ' ').toUpperCase()}`);
    lines.push(`   ${conflict.explanation}`);
    if (conflict.suggestion) {
      lines.push(`   → ${conflict.suggestion}`);
    }
  }
  
  if (conflicts.length > 5) {
    lines.push(`... and ${conflicts.length - 5} more conflicts`);
  }
  
  let result = lines.join('\n');
  if (result.length > maxLength) {
    result = result.slice(0, maxLength - 3) + '...';
  }
  
  return result;
}
