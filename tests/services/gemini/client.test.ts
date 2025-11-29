/**
 * Tests for Gemini API client initialization
 * Covers client creation, API configuration checks, and validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are available before any imports
const mockGetApiKey = vi.hoisted(() => vi.fn(() => 'test-api-key-12345'));
const mockValidateApiKey = vi.hoisted(() => vi.fn(() => null));
const mockGoogleGenAI = vi.hoisted(() => vi.fn().mockImplementation(() => ({
  models: { generateContent: vi.fn() },
  chats: { create: vi.fn() },
})));

// Mock the config module before importing client
vi.mock('@/config/api', () => ({
  getApiKey: mockGetApiKey,
  validateApiKey: mockValidateApiKey,
}));

// Mock GoogleGenAI to avoid actual API initialization
vi.mock('@google/genai', () => ({
  GoogleGenAI: mockGoogleGenAI,
}));

describe('Gemini Client - Valid Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiKey.mockReturnValue('test-api-key-12345');
    mockValidateApiKey.mockReturnValue(null); // null = valid
  });

  it('isApiConfigured returns true when API key is valid', async () => {
    // Reset modules to re-run initialization with valid key
    vi.resetModules();
    
    const { isApiConfigured } = await import('@/services/gemini/client');
    expect(isApiConfigured()).toBe(true);
  });

  it('getApiStatus returns configured status when valid', async () => {
    vi.resetModules();
    
    const { getApiStatus } = await import('@/services/gemini/client');
    const status = getApiStatus();
    
    expect(status.configured).toBe(true);
    expect(status.error).toBeUndefined();
  });

  it('exports ai client instance', async () => {
    vi.resetModules();
    
    const { ai } = await import('@/services/gemini/client');
    
    expect(ai).toBeDefined();
    expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key-12345' });
  });
});

describe('Gemini Client - Invalid Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    // Reset to valid state for other tests
    mockGetApiKey.mockReturnValue('test-api-key-12345');
    mockValidateApiKey.mockReturnValue(null);
  });

  it('throws descriptive error when API key validation fails', async () => {
    mockGetApiKey.mockReturnValue('');
    mockValidateApiKey.mockReturnValue('API key is required');
    
    await expect(import('@/services/gemini/client')).rejects.toThrow(
      'API Configuration Error'
    );
  });

  it('throws error with guidance to set environment variable', async () => {
    mockGetApiKey.mockReturnValue('bad-key');
    mockValidateApiKey.mockReturnValue('Invalid format');
    
    await expect(import('@/services/gemini/client')).rejects.toThrow(
      'VITE_GEMINI_API_KEY'
    );
  });

  it('logs error to console when validation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockGetApiKey.mockReturnValue('bad-key');
    mockValidateApiKey.mockReturnValue('Invalid format');
    
    try {
      await import('@/services/gemini/client');
    } catch {
      // Expected to throw
    }
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[DraftSmith API]')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid format')
    );
    
    consoleSpy.mockRestore();
  });
});
