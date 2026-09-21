import React, { useEffect, useRef, useCallback } from 'react';
import { Slot } from './layout/Slot';
import { isReducedMotion, getSectorFromCoords } from '../lib/map-fx';

interface MapReticleOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
  onSectorChange?: (sectorLabel: string) => void;
  onCoordMove?: (lat: number, lng: number) => void;
  mapInstance?: unknown;
}

/**
 * SLOT-15 — Cursor Reticle, HUD Crosshair, and Stage Visual Physics
 * Specs: PRD 9 §6 (M1, M2, M4) & PRD 10 §4
 *
 * Performance-optimized:
 * - Event-driven RAF loop that sleeps when idle (0% CPU when mouse is still or off-stage).
 * - ResizeObserver cached dimensions avoiding forced DOM reflows / layout thrashing.
 * - Hardware compositing on canvas.
 */
export const MapReticleOverlay: React.FC<MapReticleOverlayProps> = ({
  containerRef,
  enabled = true,
  onSectorChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const isLoopingRef = useRef<boolean>(false);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const cursorRef = useRef({ x: -100, y: -100, visible: false, leaveTime: 0 });
  const smoothRef = useRef({ x: -100, y: -100 });
  const sweepRef = useRef({ active: false, startTime: 0 });
  const lastSectorRef = useRef<string>('');
  const onSectorChangeRef = useRef(onSectorChange);
  onSectorChangeRef.current = onSectorChange;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) {
      isLoopingRef.current = false;
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isLoopingRef.current = false;
      return;
    }

    const { w, h } = sizeRef.current;
    if (w <= 0 || h <= 0) {
      isLoopingRef.current = false;
      return;
    }

    ctx.clearRect(0, 0, w, h);

    const cursor = cursorRef.current;
    const smooth = smoothRef.current;
    const reduced = isReducedMotion();
    const now = performance.now();

    // Fade out over 140ms on pointer-leave (M1)
    let opacity = 0;
    if (cursor.visible) {
      opacity = 1;
    } else if (cursor.leaveTime > 0) {
      const elapsedLeave = now - cursor.leaveTime;
      if (elapsedLeave < 140) {
        opacity = 1 - elapsedLeave / 140;
      }
    }

    // M2 — Scan sweep on stage enter (900ms linear top->bottom, 24px trail)
    const sweep = sweepRef.current;
    if (sweep.active && !reduced) {
      const elapsedSweep = now - sweep.startTime;
      const progress = elapsedSweep / 900;
      if (progress < 1) {
        const sweepY = progress * h;
        ctx.save();
        const grad = ctx.createLinearGradient(0, sweepY - 24, 0, sweepY);
        grad.addColorStop(0, 'rgba(255, 148, 38, 0)');
        grad.addColorStop(1, 'rgba(255, 148, 38, 0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY - 24, w, 24);

        ctx.strokeStyle = 'rgba(255, 148, 38, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, sweepY);
        ctx.lineTo(w, sweepY);
        ctx.stroke();
        ctx.restore();
      } else {
        sweep.active = false;
      }
    }

    // If completely faded out and sweep ended: sleep loop to save 100% CPU
    if (opacity <= 0 && !sweep.active) {
      isLoopingRef.current = false;
      return;
    }

    // Lerp smoothing: 60ms lag cap or instant if reduced motion
    const dx = cursor.x - smooth.x;
    const dy = cursor.y - smooth.y;
    const isConverged = Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2;

    if (reduced || isConverged) {
      smooth.x = cursor.x;
      smooth.y = cursor.y;
    } else {
      smooth.x += dx * 0.25;
      smooth.y += dy * 0.25;
    }
    const sx = smooth.x;
    const sy = smooth.y;

    // M4 — Sector Grid Calculation & Highlight
    const sector = getSectorFromCoords(sx, sy, w, h);
    if (sector.label !== lastSectorRef.current) {
      lastSectorRef.current = sector.label;
      onSectorChangeRef.current?.(sector.label);
    }

    // Highlight active sector cell (brightens dots to signal 18%)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 148, 38, 0.06)';
    ctx.strokeStyle = 'rgba(255, 148, 38, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.fillRect(sector.rect.x, sector.rect.y, sector.rect.width, sector.rect.height);
    ctx.strokeRect(sector.rect.x, sector.rect.y, sector.rect.width, sector.rect.height);
    ctx.restore();

    // M2 — Dot-grid glow under the cursor (240px radial mask = 120px radius)
    if (!reduced) {
      ctx.save();
      const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120);
      glowGrad.addColorStop(0, `rgba(255, 148, 38, ${0.14 * opacity})`);
      glowGrad.addColorStop(0.5, `rgba(255, 148, 38, ${0.05 * opacity})`);
      glowGrad.addColorStop(1, 'rgba(255, 148, 38, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(sx - 120, sy - 120, 240, 240);
      ctx.restore();
    }

    // M1 — Full-stage crosshair (1px signal at 22% opacity)
    ctx.save();
    ctx.strokeStyle = `rgba(255, 148, 38, ${0.22 * opacity})`;
    ctx.lineWidth = 1;

    // Horizontal crosshair line
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();

    // Vertical crosshair line
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
    ctx.restore();

    // M1 — Iris reticle ring (28px ring, 2px signal, four 6px gap notches)
    ctx.save();
    ctx.strokeStyle = `rgba(255, 148, 38, ${0.85 * opacity})`;
    ctx.lineWidth = 2;
    const r = 14;
    const gapAngle = (6 / (2 * Math.PI * r)) * 2 * Math.PI;

    for (let i = 0; i < 4; i++) {
      const startA = (i * Math.PI) / 2 + gapAngle / 2;
      const endA = ((i + 1) * Math.PI) / 2 - gapAngle / 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r, startA, endA);
      ctx.stroke();
    }

    // Center dot (2px radius)
    ctx.fillStyle = `rgba(255, 148, 38, ${0.8 * opacity})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // If stationary and steady state, sleep RAF until next mouse move to save battery & CPU
    if (isConverged && cursor.visible && !sweep.active) {
      isLoopingRef.current = false;
      return;
    }

    animRef.current = requestAnimationFrame(draw);
  }, [enabled]);

  const startLoop = useCallback(() => {
    if (!isLoopingRef.current) {
      isLoopingRef.current = true;
      animRef.current = requestAnimationFrame(draw);
    }
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !enabled || !canvas) return;

    // Cache dimensions using ResizeObserver without layout queries inside draw()
    const updateSize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      sizeRef.current = { w, h };
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      startLoop();
    };
    updateSize();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(container);
    }

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
      cursorRef.current.visible = true;
      startLoop();
    };

    const onEnter = () => {
      cursorRef.current.visible = true;
      sweepRef.current = { active: true, startTime: performance.now() };
      startLoop();
    };

    const onLeave = () => {
      cursorRef.current.visible = false;
      cursorRef.current.leaveTime = performance.now();
      startLoop();
    };

    container.addEventListener('mousemove', onMove, { passive: true });
    container.addEventListener('mouseenter', onEnter, { passive: true });
    container.addEventListener('mouseleave', onLeave, { passive: true });

    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      if (resizeObserver) resizeObserver.disconnect();
      cancelAnimationFrame(animRef.current);
      isLoopingRef.current = false;
    };
  }, [containerRef, enabled, startLoop]);

  if (!enabled) return null;

  return (
    <Slot
      id="SLOT-15"
      className="absolute inset-0 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full pointer-events-none"
        style={{
          zIndex: 'var(--z-reticle)',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />
    </Slot>
  );
};
