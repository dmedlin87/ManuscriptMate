import { describe, it, expect } from 'vitest';
import { ModelConfig, TokenLimits, ThinkingBudgets } from '@/config/models';

describe('ModelConfig', () => {
  it('has analysis model defined', () => {
    expect(ModelConfig.analysis).toBeDefined();
    expect(typeof ModelConfig.analysis).toBe('string');
  });

  it('has agent model defined', () => {
    expect(ModelConfig.agent).toBeDefined();
    expect(typeof ModelConfig.agent).toBe('string');
  });

  it('has tts model defined', () => {
    expect(ModelConfig.tts).toBeDefined();
  });

  it('has liveAudio model defined', () => {
    expect(ModelConfig.liveAudio).toBeDefined();
  });

  it('has tools model defined', () => {
    expect(ModelConfig.tools).toBeDefined();
  });

  it('pro alias returns analysis model', () => {
    expect(ModelConfig.pro).toBe(ModelConfig.analysis);
  });

  it('flash alias returns agent model', () => {
    expect(ModelConfig.flash).toBe(ModelConfig.agent);
  });
});

describe('TokenLimits', () => {
  it('has limits for all configured models', () => {
    expect(TokenLimits['gemini-3-pro-preview']).toBeDefined();
    expect(TokenLimits['gemini-2.5-flash']).toBeDefined();
    expect(TokenLimits['gemini-2.5-flash-preview-tts']).toBeDefined();
  });

  it('has reasonable token limits', () => {
    expect(TokenLimits['gemini-3-pro-preview']).toBeGreaterThan(100_000);
    expect(TokenLimits['gemini-2.5-flash']).toBeGreaterThan(100_000);
    expect(TokenLimits['gemini-2.5-flash-preview-tts']).toBeGreaterThan(1_000);
  });
});

describe('ThinkingBudgets', () => {
  it('has analysis budget', () => {
    expect(ThinkingBudgets.analysis).toBeDefined();
    expect(ThinkingBudgets.analysis).toBeGreaterThan(0);
  });

  it('has plotIdeas budget', () => {
    expect(ThinkingBudgets.plotIdeas).toBeDefined();
    expect(ThinkingBudgets.plotIdeas).toBeGreaterThan(0);
  });

  it('has rewrite budget', () => {
    expect(ThinkingBudgets.rewrite).toBeDefined();
    expect(ThinkingBudgets.rewrite).toBeGreaterThan(0);
  });

  it('analysis has highest budget', () => {
    expect(ThinkingBudgets.analysis).toBeGreaterThan(ThinkingBudgets.plotIdeas);
    expect(ThinkingBudgets.analysis).toBeGreaterThan(ThinkingBudgets.rewrite);
  });
});
