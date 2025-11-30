import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsageProvider, useUsage } from '@/features/shared/context/UsageContext';
import type { UsageMetadata } from '@google/genai';

const createUsage = (overrides: Partial<UsageMetadata> = {}): UsageMetadata => ({
  promptTokenCount: 0,
  totalTokenCount: 0,
  ...overrides
});

const UsageConsumer = () => {
  const { promptTokens, responseTokens, totalRequestCount, totalCost, sessionCost, trackUsage, resetUsage } = useUsage();
  return (
    <div>
      <span data-testid="prompt-tokens">{promptTokens}</span>
      <span data-testid="response-tokens">{responseTokens}</span>
      <span data-testid="request-count">{totalRequestCount}</span>
      <span data-testid="total-cost">{totalCost}</span>
      <span data-testid="session-cost">{sessionCost}</span>
      <button data-testid="track" onClick={() => trackUsage(createUsage({ promptTokenCount: 5, totalTokenCount: 9 }), 'gemini-2.5-flash')}>Track</button>
      <button data-testid="reset" onClick={resetUsage}>Reset</button>
    </div>
  );
};

let storage: Record<string, string>;
let getItemSpy: ReturnType<typeof vi.spyOn>;
let setItemSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  storage = {};
  getItemSpy = vi.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key: string) => storage[key] ?? null);
  setItemSpy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation((key: string, value: string) => {
    storage[key] = value;
  });
  vi.spyOn(window.localStorage.__proto__, 'removeItem').mockImplementation((key: string) => {
    delete storage[key];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UsageContext', () => {
  it('throws when used outside provider', () => {
    const Consumer = () => {
      useUsage();
      return null;
    };

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrowError('useUsage must be used within UsageProvider');
    consoleSpy.mockRestore();
  });

  it('initializes usage data from localStorage', async () => {
    storage['quillai_usage'] = JSON.stringify({ prompt: 10, response: 20, requests: 3 });

    render(
      <UsageProvider>
        <UsageConsumer />
      </UsageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prompt-tokens')).toHaveTextContent('10');
      expect(screen.getByTestId('response-tokens')).toHaveTextContent('20');
      expect(screen.getByTestId('request-count')).toHaveTextContent('3');
      expect(screen.getByTestId('total-cost')).toHaveTextContent('0');
    });

    expect(getItemSpy).toHaveBeenCalledWith('quillai_usage');
  });

  it('tracks usage and persists updates', async () => {
    render(
      <UsageProvider>
        <UsageConsumer />
      </UsageProvider>
    );

    fireEvent.click(screen.getByTestId('track'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-tokens')).toHaveTextContent('5');
      expect(screen.getByTestId('response-tokens')).toHaveTextContent('4');
      expect(screen.getByTestId('request-count')).toHaveTextContent('1');
      expect(screen.getByTestId('session-cost')).toHaveTextContent('0');
    });

    const lastCall = setItemSpy.mock.lastCall;
    expect(lastCall?.[0]).toBe('quillai_usage');
    const payload = JSON.parse(lastCall?.[1] as string);
    expect(payload.prompt).toBe(5);
    expect(payload.response).toBe(4);
    expect(payload.requests).toBe(1);
    expect(typeof payload.cost).toBe('number');
  });

  it('resets usage counters', async () => {
    render(
      <UsageProvider>
        <UsageConsumer />
      </UsageProvider>
    );

    fireEvent.click(screen.getByTestId('track'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-tokens')).toHaveTextContent('5');
    });

    fireEvent.click(screen.getByTestId('reset'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-tokens')).toHaveTextContent('0');
      expect(screen.getByTestId('response-tokens')).toHaveTextContent('0');
      expect(screen.getByTestId('request-count')).toHaveTextContent('0');
      expect(screen.getByTestId('session-cost')).toHaveTextContent('0');
    });
  });

  it('initializes from storage and resets session cost', async () => {
    storage['quillai_usage'] = JSON.stringify({ prompt: 10, response: 20, requests: 3, cost: 10 });

    render(
      <UsageProvider>
        <UsageConsumer />
      </UsageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prompt-tokens')).toHaveTextContent('10');
      expect(screen.getByTestId('response-tokens')).toHaveTextContent('20');
      expect(screen.getByTestId('request-count')).toHaveTextContent('3');
      expect(screen.getByTestId('session-cost')).toHaveTextContent('0');
    });

    fireEvent.click(screen.getByTestId('reset'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-tokens')).toHaveTextContent('0');
      expect(screen.getByTestId('response-tokens')).toHaveTextContent('0');
      expect(screen.getByTestId('request-count')).toHaveTextContent('0');
      expect(screen.getByTestId('session-cost')).toHaveTextContent('0');
    });
  });
});
