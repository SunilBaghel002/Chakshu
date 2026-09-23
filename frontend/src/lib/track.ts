/**
 * First-Party Telemetry Client for Chakshu.
 *
 * Specs: PRD 15 §3, §5, §6 (T1–T6)
 * Rules:
 * 1. Telemetry must NEVER be observable by the user. Synchronous, never blocks, never throws.
 * 2. Buffer in memory; flush on: 5 events queued, 5 s elapsed, visibilitychange hidden, or pagehide.
 * 3. Flush using navigator.sendBeacon; fall back to fetch(..., {keepalive:true}) if unavailable.
 * 4. One retry then drop. If 429 received, discard immediately.
 * 5. Aggregation mandatory for pointer-driven events (map.hover <= 1 per 5s).
 * 6. Exposes window.__track for test assertions.
 */

export type TrackEventName =
  | 'page.view'
  | 'landing.cta.click'
  | 'landing.section.view'
  | 'scroll.depth'
  | 'landing.demo.interact'
  | 'ui.nav.click'
  | 'ui.control.click'
  | 'map.hover'
  | 'map.viewport'
  | 'map.swipe'
  | 'op.start'
  | 'op.result'
  | 'op.error'
  | 'ask.question'
  | 'decision.set'
  | 'upload.complete'
  | 'export.complete'
  | 'auth.signup'
  | 'auth.login'
  | 'auth.logout'
  | 'error.client'
  | 'perf.mark'
  | 'offline.mode';

export interface QueuedEvent {
  name: TrackEventName;
  path: string;
  p: Record<string, unknown>;
  client_ts: string;
  duration_ms?: number;
  ok?: boolean;
  retried?: boolean;
}

export interface ClientContext {
  screen: string;
  dpr: number;
  tz: string;
  lang: string;
}

// In-memory queue
const eventQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let contextSent = false;

// Testing global buffer
declare global {
  interface Window {
    __track?: QueuedEvent[];
  }
}

if (typeof window !== 'undefined') {
  window.__track = window.__track || [];
}

/** Check if live network beaconing is enabled */
function isTelemetryEnabled(): boolean {
  if (typeof import.meta === 'undefined' || !import.meta.env) return false;
  if (import.meta.env.VITEST) return false;
  if (import.meta.env.NEXT_PUBLIC_TELEMETRY === 'off' || import.meta.env.VITE_TELEMETRY === 'off') return false;
  return (
    import.meta.env.NEXT_PUBLIC_TELEMETRY === 'on' ||
    import.meta.env.VITE_TELEMETRY === 'on' ||
    import.meta.env.VITE_TELEMETRY === '1' ||
    Boolean(import.meta.env.DEV)
  );
}

/** Gather client display and locale context */
function getClientContext(): ClientContext | null {
  if (typeof window === 'undefined' || typeof screen === 'undefined') return null;
  try {
    return {
      screen: `${window.screen.width}x${window.screen.height}`,
      dpr: window.devicePixelRatio || 1,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      lang: navigator.language || 'en',
    };
  } catch {
    return null;
  }
}

/** Synchronous flush function that sends buffered events */
export function flushQueue(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  // Take up to 20 events for this batch
  const batch = eventQueue.splice(0, 20);
  const includeCtx = !contextSent;
  const ctx = includeCtx ? getClientContext() : null;

  const payload = {
    events: batch.map(({ name, path, p, client_ts, duration_ms, ok }) => ({
      name,
      path,
      p,
      client_ts,
      duration_ms,
      ok,
    })),
    ...(ctx ? { ctx } : {}),
  };

  if (!isTelemetryEnabled()) {
    // In dev/test: do not call network, events already captured in window.__track
    if (includeCtx && ctx) contextSent = true;
    return;
  }

  try {
    const jsonStr = JSON.stringify(payload);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = '/api/v1/events';

    let beaconSent = false;
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        beaconSent = navigator.sendBeacon(url, blob);
      } catch {
        beaconSent = false;
      }
    }

    if (beaconSent) {
      if (includeCtx && ctx) contextSent = true;
    } else {
      // Fallback to fetch with keepalive: true (PRD 15 §6)
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
        keepalive: true,
        credentials: 'same-origin',
      })
        .then((res) => {
          if (res.status === 204) {
            if (includeCtx && ctx) contextSent = true;
          } else if (res.status === 429) {
            // Over rate-limit: drop without retry
          } else {
            requeueOnce(batch);
          }
        })
        .catch(() => {
          requeueOnce(batch);
        });
    }
  } catch {
    requeueOnce(batch);
  }
}

/** One retry then drop (PRD 15 §6) */
function requeueOnce(failedBatch: QueuedEvent[]): void {
  const retryable = failedBatch.filter((evt) => !evt.retried);
  if (retryable.length > 0) {
    retryable.forEach((evt) => (evt.retried = true));
    // Prepend retryable events to front of queue
    eventQueue.unshift(...retryable);
  }
}

/** Schedule delayed flush */
function scheduleFlush(delayMs = 5000): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, delayMs);
}

/**
 * Authoritative tracking function. Synchronous, returns void.
 */
export function track(
  name: TrackEventName,
  p: Record<string, unknown> = {},
  options?: { duration_ms?: number; ok?: boolean; path?: string }
): void {
  try {
    const currentPath =
      options?.path ||
      (typeof window !== 'undefined' ? window.location.pathname : '/');

    const eventRecord: QueuedEvent = {
      name,
      path: currentPath.split('?')[0] || '/',
      p: p || {},
      client_ts: new Date().toISOString(),
      duration_ms: options?.duration_ms ?? (typeof p?.duration_ms === 'number' ? p.duration_ms : undefined),
      ok: options?.ok ?? (typeof p?.ok === 'boolean' ? p.ok : undefined),
    };

    // Always record to window.__track for test assertions
    if (typeof window !== 'undefined') {
      window.__track = window.__track || [];
      window.__track.push(eventRecord);
    }

    eventQueue.push(eventRecord);

    // Rule: Flush on 5 events queued or after 5s elapsed
    if (eventQueue.length >= 5) {
      flushQueue();
    } else {
      scheduleFlush(5000);
    }
  } catch {
    // Telemetry must never throw or disrupt application execution
  }
}

/**
 * Deduped event tracking per visit via sessionStorage.
 */
export function trackOnce(name: TrackEventName, p: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const serializedP = JSON.stringify(p);
    const key = `chk_trk_once:${name}:${serializedP}`;
    if (sessionStorage.getItem(key)) {
      return;
    }
    sessionStorage.setItem(key, '1');
    track(name, p);
  } catch {
    track(name, p);
  }
}

// In-memory aggregation buffers: key -> { count, dwellStart, payload, timer }
const aggBuffers = new Map<
  string,
  {
    count: number;
    startTime: number;
    targetId?: string;
    dwellMs: number;
    timer: ReturnType<typeof setTimeout>;
  }
>();

/**
 * Coalesced aggregation for pointer-driven events (e.g. map.hover).
 * Emits <= 1 event per windowMs (default 5s).
 */
export function trackAgg(
  name: TrackEventName,
  p: { target_id?: string; [key: string]: unknown },
  windowMs = 5000
): void {
  try {
    const targetKey = `${name}:${p.target_id || 'default'}`;
    const now = Date.now();

    const existing = aggBuffers.get(targetKey);
    if (!existing) {
      const timer = setTimeout(() => {
        flushAgg(targetKey, name);
      }, windowMs);

      aggBuffers.set(targetKey, {
        count: 1,
        startTime: now,
        targetId: p.target_id,
        dwellMs: 0,
        timer,
      });
    } else {
      existing.count += 1;
      existing.dwellMs = now - existing.startTime;
    }
  } catch {
    // Suppress
  }
}

/** Flush an aggregated event buffer */
export function flushAgg(targetKey: string, name: TrackEventName): void {
  const item = aggBuffers.get(targetKey);
  if (!item) return;

  clearTimeout(item.timer);
  aggBuffers.delete(targetKey);

  const dwell_ms = Math.max(0, Date.now() - item.startTime);
  track(name, {
    target_id: item.targetId,
    count: item.count,
    dwell_ms,
  });
}

// Lifecycle listeners for reliable flushing
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Flush all aggregated buffers
      aggBuffers.forEach((_, key) => flushAgg(key, 'map.hover'));
      flushQueue();
    }
  });

  window.addEventListener('pagehide', () => {
    aggBuffers.forEach((_, key) => flushAgg(key, 'map.hover'));
    flushQueue();
  });
}
