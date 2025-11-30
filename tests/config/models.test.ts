import { describe, it, expect } from 'vitest';
import { ModelConfig, TokenLimits, ThinkingBudgets, getModelPricing, ModelPricing } from '@/config/models';

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

  it('uses the expected model ids', () => {
    expect(ModelConfig.analysis).toBe('gemini-3-pro-preview');
    expect(ModelConfig.agent).toBe('gemini-2.5-flash');
    expect(ModelConfig.tts).toBe('gemini-2.5-flash-preview-tts');
    expect(ModelConfig.liveAudio).toBe('gemini-2.5-flash-native-audio-preview-09-2025');
    expect(ModelConfig.tools).toBe('gemini-2.5-flash');
  });

  it('aliases stay in sync with base models', () => {
    const { analysis, agent, pro, flash } = ModelConfig;
    expect(pro).toBe(analysis);
    expect(flash).toBe(agent);
  });
});

describe('TokenLimits', () => {
  it('has limits for all configured models', () => {
    expect(TokenLimits['gemini-3-pro-preview']).toBeDefined();
    expect(TokenLimits['gemini-2.5-flash']).toBeDefined();
    expect(TokenLimits['gemini-2.5-flash-preview-tts']).toBeDefined();
    expect(TokenLimits['gemini-2.5-flash-native-audio-preview-09-2025']).toBeDefined();
  });

  it('has reasonable token limits', () => {
    expect(TokenLimits['gemini-3-pro-preview']).toBeGreaterThan(100_000);
    expect(TokenLimits['gemini-2.5-flash']).toBeGreaterThan(100_000);
    expect(TokenLimits['gemini-2.5-flash-preview-tts']).toBeGreaterThan(1_000);
    expect(TokenLimits['gemini-2.5-flash-native-audio-preview-09-2025']).toBeGreaterThan(10_000);
  });

  it('defines limits for every model used in ModelConfig', () => {
    const models = [
      ModelConfig.analysis,
      ModelConfig.agent,
      ModelConfig.tts,
      ModelConfig.liveAudio,
      ModelConfig.tools,
    ] as const;

    for (const model of models) {
      const limit = TokenLimits[model];
      expect(limit).toBeDefined();
      expect(typeof limit).toBe('number');
      expect(limit).toBeGreaterThan(0);
    }
  });

  it('gives higher limits to main text models than to tts', () => {
    expect(TokenLimits[ModelConfig.analysis]).toBeGreaterThan(
      TokenLimits[ModelConfig.tts]
    );
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

  it('all budgets are positive finite numbers', () => {
    const values = Object.values(ThinkingBudgets);
    for (const value of values) {
      expect(typeof value).toBe('number');
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('ModelPricing and getModelPricing', () => {
  it('provides pricing for primary text models', () => {
    const analysisPricing = getModelPricing(ModelConfig.analysis);
    const agentPricing = getModelPricing(ModelConfig.agent);
    const toolsPricing = getModelPricing(ModelConfig.tools);

    expect(analysisPricing).not.toBeNull();
    expect(agentPricing).not.toBeNull();
    expect(toolsPricing).not.toBeNull();
  });

  it('contains entries for all priced models in ModelBuilds', () => {
    // At minimum we expect entries for the main text models we price
    expect(ModelPricing['gemini-3-pro-preview']).toBeDefined();
    expect(ModelPricing['gemini-2.5-flash']).toBeDefined();
  });

  it('returns null for unknown model ids', () => {
    expect(getModelPricing('unknown-model-id')).toBeNull();
  });
});
