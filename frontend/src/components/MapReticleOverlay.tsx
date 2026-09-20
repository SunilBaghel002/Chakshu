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
 * Deliverables:
 * - M1: Full-stage crosshair (1px --amber at 22%) + 28px iris reticle ring (2px --amber, 4 notches).
 *       Follows cursor with 60ms lerp lag cap; fades over 140ms on pointer-leave.
 *       Snaps immediately without lag if prefers-reduced-motion is active.
 * - M2: 900ms linear scan sweep on stage enter + 240px radial glow under cursor.
 *       Disabled if prefers-reduced-motion is active.
 * - M4: 8x5 sector cell dots brightened to --amber 18%.
 */
export const MapReticleOverlay: React.FC<MapReticleOverlayProps> = ({
  containerRef,
  enabled = true,
  onSectorChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const cursorRef = useRef({ x: -100, y: -100, visible: false, leaveTime: 0 });
  const smoothRef = useRef({ x: -100, y: -100 });
  const sweepRef = useRef({ active: false, startTime: 0 });
  const lastSectorRef = useRef<string>('');

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
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
        grad.addColorStop(0, 'rgba(240, 180, 95, 0)');
        grad.addColorStop(1, 'rgba(240, 180, 95, 0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY - 24, w, 24);

        ctx.strokeStyle = 'rgba(240, 180, 95, 0.5)';
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

    if (opacity <= 0) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // Lerp smoothing: 60ms lag cap or instant if reduced motion
    if (reduced) {
      smooth.x = cursor.x;
      smooth.y = cursor.y;
    } else {
      smooth.x += (cursor.x - smooth.x) * 0.25;
      smooth.y += (cursor.y - smooth.y) * 0.25;
    }
    const sx = smooth.x;
    const sy = smooth.y;

    // M4 — Sector Grid Calculation & Highlight
    const sector = getSectorFromCoords(sx, sy, w, h);
    if (sector.label !== lastSectorRef.current) {
      lastSectorRef.current = sector.label;
      onSectorChange?.(sector.label);
    }

    // Highlight active sector cell (brightens dots to --amber 18%)
    ctx.save();
    ctx.fillStyle = 'rgba(240, 180, 95, 0.06)';
    ctx.strokeStyle = 'rgba(240, 180, 95, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.fillRect(sector.rect.x, sector.rect.y, sector.rect.width, sector.rect.height);
    ctx.strokeRect(sector.rect.x, sector.rect.y, sector.rect.width, sector.rect.height);
    ctx.restore();

    // M2 — Dot-grid glow under the cursor (240px radial mask = 120px radius)
    if (!reduced) {
      ctx.save();
      const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 120);
      glowGrad.addColorStop(0, `rgba(240, 180, 95, ${0.14 * opacity})`);
      glowGrad.addColorStop(0.5, `rgba(240, 180, 95, ${0.05 * opacity})`);
      glowGrad.addColorStop(1, 'rgba(240, 180, 95, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(sx - 120, sy - 120, 240, 240);
      ctx.restore();
    }

    // M1 — Full-stage crosshair (1px --amber at 22% opacity)
    ctx.save();
    ctx.strokeStyle = `rgba(240, 180, 95, ${0.22 * opacity})`;
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

    // M1 — Iris reticle ring (28px ring, 2px --amber, four 6px gap notches)
    ctx.save();
    ctx.strokeStyle = `rgba(240, 180, 95, ${0.85 * opacity})`;
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
    ctx.fillStyle = `rgba(240, 180, 95, ${0.8 * opacity})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [containerRef, enabled, onSectorChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      cursorRef.current.x = e.clientX - rect.left;
      cursorRef.current.y = e.clientY - rect.top;
      cursorRef.current.visible = true;
    };

    const onEnter = () => {
      cursorRef.current.visible = true;
      sweepRef.current = { active: true, startTime: performance.now() };
    };

    const onLeave = () => {
      cursorRef.current.visible = false;
      cursorRef.current.leaveTime = performance.now();
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);

    animRef.current = requestAnimationFrame(draw);

    return () => {
      container.removeEventListener('mousemove', onMove);
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(animRef.current);
    };
  }, [containerRef, enabled, draw]);

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
        style={{ zIndex: 'var(--z-reticle)' }}
      />
    </Slot>
  );
};
