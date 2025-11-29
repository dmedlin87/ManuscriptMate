import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useAutoResize } from '@/features/editor/hooks/useAutoResize';

const rafSpy = vi.fn();
const cancelRafSpy = vi.fn();

const setupRaf = () => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafSpy(cb);
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', cancelRafSpy);
};

describe('useAutoResize', () => {
  beforeEach(() => {
    setupRaf();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rafSpy.mockReset();
    cancelRafSpy.mockReset();
  });

  it('resizes textarea in editor mode', () => {
    const textarea = document.createElement('textarea');
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 120 });

    const ref = { current: textarea };

    renderHook(() => useAutoResize(ref, 'value', 'EDITOR'));

    expect(rafSpy).toHaveBeenCalled();
    expect(textarea.style.height).toBe('120px');
  });

  it('skips resizing when not in editor mode', () => {
    const textarea = document.createElement('textarea');
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 200 });
    const ref = { current: textarea };

    renderHook(() => useAutoResize(ref, 'value', 'READONLY'));

    expect(textarea.style.height).toBe('');
  });

  it('cleans up pending animation frame on unmount', () => {
    const textarea = document.createElement('textarea');
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 200 });
    const ref = { current: textarea };

    const { unmount } = renderHook(() => useAutoResize(ref, 'value', 'EDITOR'));
    unmount();

    expect(cancelRafSpy).toHaveBeenCalled();
  });
});
