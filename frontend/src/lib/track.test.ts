import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { track, trackOnce, trackAgg, flushAgg } from './track';

describe('First-party telemetry client (PRD 15 §3, §5, §6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (typeof window !== 'undefined') {
      window.__track = [];
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('records events to window.__track for test observability', () => {
    track('page.view', { route: '/console' });
    expect(window.__track).toBeDefined();
    expect(window.__track?.length).toBe(1);
    expect(window.__track![0]?.name).toBe('page.view');
    expect(window.__track![0]?.p).toEqual({ route: '/console' });
  });

  it('trackOnce dedupes events per visit via sessionStorage', () => {
    trackOnce('landing.section.view', { section: 'hero' });
    expect(window.__track?.length).toBe(1);

    // Second call with same name and params should be suppressed
    trackOnce('landing.section.view', { section: 'hero' });
    expect(window.__track?.length).toBe(1);

    // Call with different params should be recorded
    trackOnce('landing.section.view', { section: 'demo' });
    expect(window.__track?.length).toBe(2);
  });

  it('trackAgg coalesces rapid calls within window into a single event', () => {
    // 10 rapid hover events on polygon 'poly-123'
    for (let i = 0; i < 10; i++) {
      trackAgg('map.hover', { target_id: 'poly-123' }, 5000);
    }

    // Nothing flushed yet to window.__track (waiting for timer or flushAgg)
    expect(window.__track?.length).toBe(0);

    // Advance timers by 5000ms
    vi.advanceTimersByTime(5000);

    // Exactly one event should have been emitted
    expect(window.__track?.length).toBe(1);
    expect(window.__track![0]?.name).toBe('map.hover');
    expect(window.__track![0]?.p.target_id).toBe('poly-123');
    expect(window.__track![0]?.p.count).toBe(10);
  });

  it('flushAgg flushes active aggregation immediately on demand', () => {
    trackAgg('map.hover', { target_id: 'poly-456' }, 5000);
    trackAgg('map.hover', { target_id: 'poly-456' }, 5000);

    expect(window.__track?.length).toBe(0);

    flushAgg('map.hover:poly-456', 'map.hover');

    expect(window.__track?.length).toBe(1);
    expect(window.__track![0]?.p.count).toBe(2);
    expect(window.__track![0]?.p.target_id).toBe('poly-456');
  });

  it('never throws or breaks execution on unexpected input', () => {
    expect(() => {
      // @ts-expect-error Testing runtime resilience
      track(null, null);
      // @ts-expect-error Testing runtime resilience
      trackOnce(undefined);
      // @ts-expect-error Testing runtime resilience
      trackAgg(undefined, {});
    }).not.toThrow();
  });
});
