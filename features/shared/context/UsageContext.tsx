import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UsageMetadata } from "@google/genai";
import { getModelPricing } from '@/config/models';

interface UsageContextValue {
  promptTokens: number;
  responseTokens: number;
  totalRequestCount: number;
  totalCost: number;
  sessionCost: number;
  trackUsage: (usage: UsageMetadata, modelId: string) => void;
  resetUsage: () => void;
}

const UsageContext = createContext<UsageContextValue | undefined>(undefined);

export const UsageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [promptTokens, setPromptTokens] = useState(0);
  const [responseTokens, setResponseTokens] = useState(0);
  const [totalRequestCount, setTotalRequestCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [sessionBaselineCost, setSessionBaselineCost] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('quillai_usage');
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);

      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('Invalid usage stats shape in localStorage, resetting.');
        return;
      }

      const prompt = typeof (parsed as any).prompt === 'number' && Number.isFinite((parsed as any).prompt)
        ? (parsed as any).prompt
        : 0;
      const response = typeof (parsed as any).response === 'number' && Number.isFinite((parsed as any).response)
        ? (parsed as any).response
        : 0;
      const requests = typeof (parsed as any).requests === 'number' && Number.isFinite((parsed as any).requests)
        ? (parsed as any).requests
        : 0;
      const cost = typeof (parsed as any).cost === 'number' && Number.isFinite((parsed as any).cost)
        ? (parsed as any).cost
        : 0;

      setPromptTokens(prompt);
      setResponseTokens(response);
      setTotalRequestCount(requests);
      setTotalCost(cost);
      setSessionBaselineCost(cost);
    } catch (e) {
      console.error('Failed to parse usage stats', e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('quillai_usage', JSON.stringify({
      prompt: promptTokens,
      response: responseTokens,
      requests: totalRequestCount,
      cost: totalCost
    }));
  }, [promptTokens, responseTokens, totalRequestCount, totalCost]);

  const trackUsage = useCallback((usage: UsageMetadata, modelId: string) => {
    if (!usage) return;

    const promptDelta = usage.promptTokenCount || 0;
    // Use type assertion to access candidatesTokenCount if missing from type definition
    // Fallback to calculation from totalTokenCount if needed
    const candidates = (usage as any).candidatesTokenCount ??
                       ((usage.totalTokenCount || 0) - (usage.promptTokenCount || 0));
    const responseDelta = candidates || 0;

    // Always track raw token usage and request count
    setPromptTokens(prev => prev + promptDelta);
    setResponseTokens(prev => prev + responseDelta);
    setTotalRequestCount(prev => prev + 1);

    if (!modelId) {
      console.warn('[UsageContext] trackUsage called without a modelId. Token usage will be tracked, but cost will not be computed.');
      return;
    }

    const pricing = getModelPricing(modelId);
    if (!pricing) {
      console.warn(`[UsageContext] No pricing configured for modelId="${modelId}". Token usage will be tracked, but cost will not be computed for this model.`);
      return;
    }

    const costIncrement =
      (promptDelta / 1_000_000) * pricing.inputPrice +
      (responseDelta / 1_000_000) * pricing.outputPrice;
    setTotalCost(prev => prev + costIncrement);
  }, []);

  const sessionCost = Math.max(0, totalCost - sessionBaselineCost);

  const resetUsage = useCallback(() => {
    setPromptTokens(0);
    setResponseTokens(0);
    setTotalRequestCount(0);
    setTotalCost(0);
    setSessionBaselineCost(0);
  }, []);

  return (
    <UsageContext.Provider value={{ promptTokens, responseTokens, totalRequestCount, totalCost, sessionCost, trackUsage, resetUsage }}>
      {children}
    </UsageContext.Provider>
  );
};

export const useUsage = () => {
  const context = useContext(UsageContext);
  if (!context) throw new Error('useUsage must be used within UsageProvider');
  return context;
};