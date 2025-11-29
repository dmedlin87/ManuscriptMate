/**
 * Shared mock infrastructure for Gemini AI client testing
 * Used across all service tests (agent, analysis, audio)
 */

import { vi } from 'vitest';
import { UsageMetadata } from '@google/genai';
import { ManuscriptIndex, Lore } from '../../types/schema';
import { CharacterProfile } from '../../types';
import { Persona } from '../../types/personas';

// Mock response structure that mimics Gemini API responses
export interface MockGeminiResponse {
  text: string;
  usageMetadata?: UsageMetadata;
}

// Mock usage metadata for testing
export const mockUsageMetadata: UsageMetadata = {
  promptTokenCount: 100,
  totalTokenCount: 150,
};

// Factory function to create mock generateContent responses
export const createMockGenerateContent = (response: MockGeminiResponse) => {
  return vi.fn().mockResolvedValue(response);
};

// Factory function to create mock chat sessions
export const createMockChat = () => {
  const sendMessage = vi.fn().mockResolvedValue({
    text: 'Mock chat response',
    usageMetadata: mockUsageMetadata,
  });
  
  return {
    sendMessage,
    // Add other chat methods if needed
  };
};

// Mock AI client structure
export const mockAi = {
  models: {
    generateContent: vi.fn(),
  },
  chats: {
    create: vi.fn().mockReturnValue(createMockChat()),
  },
};

// Helper to setup vi.mock for client module
export const setupGeminiClientMock = () => {
  vi.mock('@/services/gemini/client', () => ({
    ai: mockAi,
  }));
};

// Helper to reset all mocks
export const resetGeminiMocks = () => {
  vi.clearAllMocks();
  mockAi.models.generateContent.mockClear();
  mockAi.chats.create.mockClear();
};

// Test data fixtures commonly used across tests
export const mockAnalysisResult = {
  summary: 'Test analysis summary',
  strengths: ['Strong character development', 'Good pacing'],
  weaknesses: ['Some dialog could be improved'],
  pacing: {
    score: 8,
    analysis: 'Good overall pacing',
    slowSections: ['Chapter 2 middle'],
    fastSections: ['Action scenes'],
  },
  plotIssues: [
    {
      issue: 'Plot hole in chapter 3',
      location: 'Chapter 3',
      suggestion: 'Add foreshadowing earlier',
      quote: 'The mysterious object appeared',
    },
  ],
  characters: [
    {
      name: 'John Doe',
      bio: 'Main protagonist',
      arc: 'Hero journey',
      arcStages: [
        { stage: 'Call to adventure', description: 'Leaves home' },
        { stage: 'Trials', description: 'Faces challenges' },
      ],
      relationships: [
        { name: 'Jane Smith', type: 'romantic', dynamic: 'tension' },
      ],
      plotThreads: ['Main quest', 'Personal growth'],
      inconsistencies: [],
      developmentSuggestion: 'Show more vulnerability',
    },
  ],
  generalSuggestions: ['Consider adding more sensory details'],
  settingAnalysis: {
    score: 7,
    analysis: 'Setting is well-established',
    issues: [],
  },
};

export const mockLore: Lore = {
  characters: [
    {
      name: 'John Doe',
      bio: 'Main protagonist',
      arc: 'Hero journey',
      arcStages: [],
      relationships: [],
      plotThreads: [],
      developmentSuggestion: 'Show more vulnerability',
      inconsistencies: [],
    } as CharacterProfile,
  ],
  worldRules: ['Magic exists but is rare', 'Technology is medieval level'],
};

export const mockManuscriptIndex: ManuscriptIndex = {
  characters: {
    'John Doe': {
      name: 'John Doe',
      firstMention: { chapterId: '1', position: 100 },
      mentions: [{ chapterId: '1', position: 100 }],
      attributes: {
        age: [{ value: '30', chapterId: '1', position: 100 }],
        occupation: [{ value: 'Blacksmith', chapterId: '1', position: 100 }],
      },
    },
  },
  lastUpdated: { '1': Date.now() },
};

// Helper to create mock persona
export const createMockPersona = (id: string, name: string, style: Persona['style']): Persona => ({
  id,
  name,
  role: `${name} role`,
  systemPrompt: `You are ${name}, a specialist with ${style} style.`,
  style,
  icon: '⭐',
  color: '#6366f1',
});
