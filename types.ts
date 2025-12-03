import { z } from 'zod';

export interface CharacterProfile {
  name: string;
  bio: string;
  arc: string;
  voiceTraits?: string;
  arcStages: Array<{
    stage: string;
    description: string;
  }>;
  relationships: Array<{
    name: string;
    type: string;
    dynamic: string;
  }>;
  plotThreads: string[];
  inconsistencies: Array<{
    issue: string;
    quote?: string;
    startIndex?: number;
    endIndex?: number;
  }>;
  developmentSuggestion: string;
  // Visual description fields for image generation and character visualization
  physicalAppearance?: string; // Consolidated narrative description
  visualAttributes?: {
    age?: string;
    gender?: string;
    height?: string;
    build?: string;
    hairColor?: string;
    hairStyle?: string;
    eyeColor?: string;
    skinTone?: string;
    facialFeatures?: string[];
    distinguishingMarks?: string[];
    typicalClothing?: string;
    accessories?: string[];
    [key: string]: string | string[] | undefined;
  };
  appearanceEvolution?: Array<{
    stage: string; // Links to arc stage
    description: string;
    changes: string[];
  }>;
}

export interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  
  pacing: {
    score: number;
    analysis: string;
    slowSections: Array<{
      description: string;
      quote?: string;
      startIndex?: number;
      endIndex?: number;
    }> | string[];
    fastSections: Array<{
      description: string;
      quote?: string;
      startIndex?: number;
      endIndex?: number;
    }> | string[];
  };

  settingAnalysis?: {
    score: number;
    analysis: string;
    issues: Array<{
      quote: string;
      issue: string;
      suggestion: string;
      alternatives?: string[];
    }>;
  };

  plotIssues: Array<{
    issue: string;
    location: string;
    suggestion: string;
    quote?: string;
    startIndex?: number;
    endIndex?: number;
  }>;

  characters: CharacterProfile[];
  
  generalSuggestions: string[];
}

// Zod schemas for runtime validation of AI responses
const CharacterProfileSchema = z.object({
  name: z.string().default(''),
  bio: z.string().default(''),
  arc: z.string().default(''),
  voiceTraits: z.string().default(''),
  arcStages: z.array(z.object({
    stage: z.string(),
    description: z.string(),
  })).default([]),
  relationships: z.array(z.object({
    name: z.string(),
    type: z.string(),
    dynamic: z.string(),
  })).default([]),
  plotThreads: z.array(z.string()).default([]),
  inconsistencies: z.array(z.object({
    issue: z.string(),
    quote: z.string().optional(),
  })).default([]),
  developmentSuggestion: z.string().default(''),
  // Visual description fields
  physicalAppearance: z.string().optional(),
  visualAttributes: z.object({
    age: z.string().optional(),
    gender: z.string().optional(),
    height: z.string().optional(),
    build: z.string().optional(),
    hairColor: z.string().optional(),
    hairStyle: z.string().optional(),
    eyeColor: z.string().optional(),
    skinTone: z.string().optional(),
    facialFeatures: z.array(z.string()).optional(),
    distinguishingMarks: z.array(z.string()).optional(),
    typicalClothing: z.string().optional(),
    accessories: z.array(z.string()).optional(),
  }).passthrough().optional(),
  appearanceEvolution: z.array(z.object({
    stage: z.string(),
    description: z.string(),
    changes: z.array(z.string()),
  })).optional(),
});

export const AnalysisResultSchema = z.object({
  summary: z.string().default('Analysis could not be completed.'),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  pacing: z.object({
    score: z.number().default(0),
    analysis: z.string().default(''),
    slowSections: z.array(z.string()).default([]),
    fastSections: z.array(z.string()).default([]),
  }).default({ score: 0, analysis: '', slowSections: [], fastSections: [] }),
  settingAnalysis: z.object({
    score: z.number().default(0),
    analysis: z.string().default(''),
    issues: z.array(z.object({
      quote: z.string(),
      issue: z.string(),
      suggestion: z.string(),
      alternatives: z.array(z.string()).optional(),
    })).default([]),
  }).optional(),
  plotIssues: z.array(z.object({
    issue: z.string(),
    location: z.string(),
    suggestion: z.string(),
    quote: z.string().optional(),
  })).default([]),
  characters: z.array(CharacterProfileSchema).default([]),
  generalSuggestions: z.array(z.string()).default([]),
});

export interface PlotSuggestion {
  title: string;
  description: string;
  reasoning: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  toolCalls?: any[];
}

export interface RecentFile {
  name: string;
  content: string;
  timestamp: number;
}

// Agent & Editor Types
export interface EditorContext {
  cursorPosition: number;
  selection: { start: number; end: number; text: string } | null;
  totalLength: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  description: string;
  author: 'User' | 'Agent';
  previousContent: string;
  newContent: string;
}

export interface HighlightRange {
  start: number;
  end: number;
  type: 'issue' | 'inconsistency' | 'pacing' | 'setting';
}

export enum AppMode {
  UPLOAD = 'UPLOAD', // Used for Project Dashboard
  EDITOR = 'EDITOR',
}

export enum SidebarTab {
  ANALYSIS = 'ANALYSIS',
  CHAT = 'CHAT',
  VOICE = 'VOICE',
  HISTORY = 'HISTORY',
  GRAPH = 'GRAPH',
  LORE = 'LORE',
  BRANCHES = 'BRANCHES', // Quill AI 3.0
}

export enum MainView {
  EDITOR = 'EDITOR',
  STORYBOARD = 'STORYBOARD',
}
