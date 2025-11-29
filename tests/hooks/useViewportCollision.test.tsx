import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { calculateSafePosition, useViewportCollision } from '@/features/shared/hooks/useViewportCollision';

const setViewport = (width: number, height: number) => {
  (window as any).innerWidth = width;
  (window as any).innerHeight = height;
};

describe('calculateSafePosition', () => {
  beforeEach(() => {
    setViewport(800, 600);
  });

  it('returns unadjusted position when within bounds', () => {
    const safe = calculateSafePosition({ top: 300, left: 400 });
    expect(safe.adjusted).toBe(false);
    expect(safe.top).toBe(300);
    expect(safe.left).toBe(400);
  });

  it('shifts position inside viewport horizontally and vertically', () => {
    const safe = calculateSafePosition({ top: 10, left: 5 }, { elementWidth: 300, elementHeight: 100, padding: 20, preferVertical: 'above' });
    expect(safe.adjusted).toBe(true);
    expect(safe.adjustments.horizontal).toBe('right');
    expect(safe.adjustments.vertical).toBe('down');
    expect(safe.top).toBeGreaterThan(10);
    expect(safe.left).toBeGreaterThan(5);
  });
});

describe('useViewportCollision', () => {
  beforeEach(() => {
    setViewport(800, 600);
  });

  it('returns null when no target position provided', () => {
    const { result } = renderHook(() => useViewportCollision(null));
    expect(result.current).toBeNull();
  });

  it('updates safe position on resize events', () => {
    const { result } = renderHook(({ pos }) => useViewportCollision(pos, { elementWidth: 200, elementHeight: 100 }), {
      initialProps: { pos: { top: 100, left: 700 } }
    });

    expect(result.current?.left).toBeLessThanOrEqual(800 - 16 - 100);

    act(() => {
      setViewport(400, 300);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current?.left).toBeLessThanOrEqual(400 - 16 - 100);
  });
});
