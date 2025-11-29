/**
 * Centralized Model Configuration
 * 
 * All Gemini model IDs are defined here to enable easy version upgrades
 * and ensure consistency across the application.
 */

export const ModelConfig = {
  // Primary models
  analysis: 'gemini-3-pro-preview',      // Deep thinking for analysis tasks
  agent: 'gemini-2.5-flash',             // Fast model for chat/agent interactions
  
  // Specialized models
  tts: 'gemini-2.5-flash-preview-tts',   // Text-to-speech
  liveAudio: 'gemini-2.5-flash-native-audio-preview-09-2025', // Real-time voice
  tools: 'gemini-2.5-flash',             // Quick tool responses (explain/thesaurus)
  
  // Legacy aliases (for migration)
  get pro() { return this.analysis; },
  get flash() { return this.agent; },
} as const;

/**
 * Token limits per model (approximate)
 * Used by tokenGuard to prevent context window overflow
 */
export const TokenLimits = {
  'gemini-3-pro-preview': 1_000_000,
  'gemini-2.5-flash': 1_000_000,
  'gemini-2.5-flash-preview-tts': 8_000,
  'gemini-2.5-flash-native-audio-preview-09-2025': 32_000,
} as const;

/**
 * Default thinking budgets for deep analysis
 */
export const ThinkingBudgets = {
  analysis: 32768,
  plotIdeas: 8192,
  rewrite: 4096,
} as const;

export type ModelId = keyof typeof TokenLimits;
