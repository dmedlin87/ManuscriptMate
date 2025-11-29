import { describe, it, expect } from 'vitest';
import { findQuoteRange, enrichAnalysisWithPositions, extractClickableIssues } from '@/features/shared/utils/textLocator';
import { AnalysisResult, CharacterProfile } from '@/types';

// Helper to create a valid CharacterProfile
const createCharacter = (overrides: Partial<CharacterProfile> = {}): CharacterProfile => ({
  name: 'Test Character',
  bio: 'Test bio',
  arc: 'Test arc',
  arcStages: [],
  relationships: [],
  plotThreads: [],
  inconsistencies: [],
  developmentSuggestion: 'Test suggestion',
  ...overrides,
});

// Helper to create a valid AnalysisResult
const createAnalysis = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  summary: 'Test summary',
  strengths: [],
  weaknesses: [],
  pacing: { score: 5, analysis: 'Test', slowSections: [], fastSections: [] },
  plotIssues: [],
  characters: [],
  generalSuggestions: [],
  ...overrides,
});

describe('findQuoteRange', () => {
  describe('exact match', () => {
    it('finds exact match', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const result = findQuoteRange(text, 'quick brown');
      
      expect(result).toEqual({ start: 4, end: 15 });
    });

    it('returns null for no match', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const result = findQuoteRange(text, 'slow red');
      
      expect(result).toBeNull();
    });

    it('returns null for empty inputs', () => {
      expect(findQuoteRange('', 'test')).toBeNull();
      expect(findQuoteRange('test', '')).toBeNull();
      expect(findQuoteRange('', '')).toBeNull();
    });
  });

  describe('trimmed match', () => {
    it('finds match with extra whitespace in quote', () => {
      const text = 'The quick brown fox jumps.';
      const result = findQuoteRange(text, '  quick brown  ');
      
      expect(result).not.toBeNull();
      expect(result!.start).toBe(4);
    });
  });

  describe('partial match', () => {
    it('finds match using first 20 chars for long quotes', () => {
      const text = 'The quick brown fox jumps over the lazy dog and runs away.';
      // Quote that starts correctly but differs at the end
      const quote = 'quick brown fox jumps over the lazy cat'; // 'cat' instead of 'dog'
      
      const result = findQuoteRange(text, quote);
      
      // Should find the start based on first 20 chars
      expect(result).not.toBeNull();
      expect(result!.start).toBe(4);
    });
  });

  describe('edge cases', () => {
    it('handles whitespace differences via fuzzy matching', () => {
      // Fuzzy matching can find matches even with whitespace differences
      const text = 'The quick  brown fox.';
      const quote = 'quick brown'; // has single space vs double space in text
      
      const result = findQuoteRange(text, quote);
      
      // Fuzzy matching finds this despite whitespace difference
      expect(result).not.toBeNull();
      expect(result!.start).toBe(4); // 'quick' starts at index 4
    });

    it('finds long quotes via normalization', () => {
      // Longer quotes can be found via partial matching + normalization
      const text = 'The quick brown fox jumps over the lazy dog and runs away fast.';
      const quote = 'quick brown fox jumps over'; // > 20 chars, exact match exists
      
      const result = findQuoteRange(text, quote);
      expect(result).not.toBeNull();
      expect(result!.start).toBe(4);
    });
  });
});

describe('enrichAnalysisWithPositions', () => {
  const fullText = 'Sarah had blue eyes. She walked into the dark castle. John was tall.';
  
  const mockAnalysis = createAnalysis({
    plotIssues: [
      { issue: 'Plot hole', location: 'Chapter 1', suggestion: 'Fix it', quote: 'blue eyes' }
    ],
    characters: [
      createCharacter({
        name: 'Sarah',
        inconsistencies: [
          { issue: 'Eye color changes', quote: 'blue eyes' }
        ]
      })
    ],
    settingAnalysis: {
      score: 5,
      analysis: 'Good setting',
      issues: [
        { issue: 'Castle description', suggestion: 'Add details', quote: 'dark castle' }
      ]
    },
  });

  it('enriches plot issues with positions', () => {
    const enriched = enrichAnalysisWithPositions(mockAnalysis, fullText);
    
    const plotIssue = enriched.plotIssues[0];
    expect(plotIssue.startIndex).toBeDefined();
    expect(plotIssue.endIndex).toBeDefined();
    expect(plotIssue.startIndex).toBe(10); // 'blue eyes' starts at index 10
  });

  it('enriches character inconsistencies with positions', () => {
    const enriched = enrichAnalysisWithPositions(mockAnalysis, fullText);
    
    const charInc = enriched.characters[0].inconsistencies[0];
    expect(charInc.startIndex).toBeDefined();
    expect(charInc.endIndex).toBeDefined();
  });

  it('does not mutate original analysis', () => {
    const original = JSON.parse(JSON.stringify(mockAnalysis));
    enrichAnalysisWithPositions(mockAnalysis, fullText);
    
    expect(mockAnalysis.plotIssues[0]).not.toHaveProperty('startIndex');
    expect(mockAnalysis).toEqual(original);
  });

  it('handles missing quotes gracefully', () => {
    const analysisNoQuotes = createAnalysis({
      plotIssues: [{ issue: 'No quote provided', location: 'Chapter 1', suggestion: 'Fix it' }]
    });
    
    const enriched = enrichAnalysisWithPositions(analysisNoQuotes, fullText);
    expect(enriched.plotIssues[0]).not.toHaveProperty('startIndex');
  });
});

describe('extractClickableIssues', () => {
  const fullText = 'Sarah had blue eyes. She walked into the dark castle.';
  
  const mockAnalysis = createAnalysis({
    plotIssues: [
      { issue: 'Plot hole', location: 'Chapter 1', suggestion: 'Fix', quote: 'blue eyes' }
    ],
    characters: [
      createCharacter({
        name: 'Sarah',
        inconsistencies: [
          { issue: 'Eye inconsistency', quote: 'blue eyes' }
        ]
      })
    ],
    settingAnalysis: {
      score: 5,
      analysis: 'Accurate',
      issues: [
        { issue: 'Castle issue', suggestion: 'Fix', quote: 'dark castle' }
      ]
    },
  });

  it('extracts plot issues', () => {
    const issues = extractClickableIssues(mockAnalysis, fullText);
    const plotIssues = issues.filter(i => i.type === 'plot');
    
    expect(plotIssues).toHaveLength(1);
    expect(plotIssues[0].issue).toBe('Plot hole');
    expect(plotIssues[0].range).not.toBeNull();
  });

  it('extracts setting issues', () => {
    const issues = extractClickableIssues(mockAnalysis, fullText);
    const settingIssues = issues.filter(i => i.type === 'setting');
    
    expect(settingIssues).toHaveLength(1);
    expect(settingIssues[0].issue).toBe('Castle issue');
  });

  it('extracts character issues with name prefix', () => {
    const issues = extractClickableIssues(mockAnalysis, fullText);
    const charIssues = issues.filter(i => i.type === 'character');
    
    expect(charIssues).toHaveLength(1);
    expect(charIssues[0].issue).toContain('Sarah');
    expect(charIssues[0].issue).toContain('Eye inconsistency');
  });

  it('returns all issues from analysis', () => {
    const issues = extractClickableIssues(mockAnalysis, fullText);
    
    // 1 plot + 1 setting + 1 character = 3 total
    expect(issues).toHaveLength(3);
  });

  it('handles analysis with no setting', () => {
    const noSetting = createAnalysis({
      ...mockAnalysis,
      settingAnalysis: undefined
    });
    
    const issues = extractClickableIssues(noSetting, fullText);
    expect(issues.filter(i => i.type === 'setting')).toHaveLength(0);
  });
});
