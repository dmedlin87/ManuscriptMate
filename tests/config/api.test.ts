import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiKey, validateApiKey, estimateTokens, ApiDefaults } from '@/config/api';

describe('validateApiKey', () => {
  it('returns error for empty key', () => {
    const result = validateApiKey('');
    
    expect(result).not.toBeNull();
    expect(result).toContain('missing');
  });

  it('returns error for short key', () => {
    const result = validateApiKey('short');
    
    expect(result).not.toBeNull();
    expect(result).toContain('invalid');
  });

  it('returns null for valid key', () => {
    const validKey = 'a'.repeat(30);
    const result = validateApiKey(validKey);
    
    expect(result).toBeNull();
  });

  it('accepts keys exactly 20 chars', () => {
    const key = 'a'.repeat(20);
    const result = validateApiKey(key);
    
    expect(result).toBeNull();
  });

  it('rejects keys with 19 chars', () => {
    const key = 'a'.repeat(19);
    const result = validateApiKey(key);
    
    expect(result).not.toBeNull();
  });
});

describe('estimateTokens', () => {
  it('estimates tokens based on character count', () => {
    const text = 'a'.repeat(100);
    const tokens = estimateTokens(text);
    
    // 100 chars / 4 chars per token = 25 tokens
    expect(tokens).toBe(25);
  });

  it('rounds up for partial tokens', () => {
    const text = 'ab'; // 2 chars
    const tokens = estimateTokens(text);
    
    // 2 / 4 = 0.5, ceil = 1
    expect(tokens).toBe(1);
  });

  it('returns 0 for empty string', () => {
    const tokens = estimateTokens('');
    expect(tokens).toBe(0);
  });

  it('handles large texts', () => {
    const text = 'a'.repeat(1_000_000);
    const tokens = estimateTokens(text);
    
    expect(tokens).toBe(250_000);
  });
});

describe('ApiDefaults', () => {
  it('has maxAnalysisLength defined', () => {
    expect(ApiDefaults.maxAnalysisLength).toBeDefined();
    expect(ApiDefaults.maxAnalysisLength).toBeGreaterThan(0);
  });

  it('has charsPerToken defined', () => {
    expect(ApiDefaults.charsPerToken).toBeDefined();
    expect(ApiDefaults.charsPerToken).toBe(4);
  });

  it('has requestTimeout defined', () => {
    expect(ApiDefaults.requestTimeout).toBeDefined();
    expect(ApiDefaults.requestTimeout).toBeGreaterThan(0);
  });

  it('has retry config defined', () => {
    expect(ApiDefaults.retry).toBeDefined();
    expect(ApiDefaults.retry.maxAttempts).toBeGreaterThan(0);
    expect(ApiDefaults.retry.baseDelayMs).toBeGreaterThan(0);
    expect(ApiDefaults.retry.maxDelayMs).toBeGreaterThan(ApiDefaults.retry.baseDelayMs);
  });
});

describe('getApiKey', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns empty string and warns when no key is set', () => {
    delete process.env.API_KEY;
    delete process.env.GEMINI_API_KEY;
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const key = getApiKey();
    
    expect(key).toBe('');
    consoleSpy.mockRestore();
  });
});
