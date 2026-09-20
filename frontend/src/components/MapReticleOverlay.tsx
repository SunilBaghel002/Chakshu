import React, { useEffect, useRef, useCallback } from 'react';

interface MapReticleOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled?: boolean;
}

/**
 * SLOT-15 — Cursor Reticle & HUD Crosshair (PRD 9 §6 M1).
 * Full-stage crosshair with iris reticle ring, 60ms lerp lag,
 * and M2 scan sweep on pointer-enter.
 */
export const MapReticleOverlay: React.FC<MapReticleOverlayProps> = ({
  containerRef,
  enabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const cursorRef = useRef({ x: -100, y: -100, visible: false });
  const smoothRef = useRef({ x: -100, y: -100 });
  const sweepRef = useRef({ active: false, y: 0, startTime: 0 });

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

    if (!cursor.visible) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // Lerp smoothing (60ms equivalent at 60fps ≈ 0.25 factor)
    smooth.x += (cursor.x - smooth.x) * 0.25;
    smooth.y += (cursor.y - smooth.y) * 0.25;
    const sx = smooth.x;
    const sy = smooth.y;

    // M2 — Scan sweep
    const sweep = sweepRef.current;
    if (sweep.active) {
      const elapsed = performance.now() - sweep.startTime;
      const progress = elapsed / 900; // 900ms sweep
      if (progress < 1) {
        const sweepY = progress * h;
        ctx.save();
        const grad = ctx.createLinearGradient(0, sweepY - 24, 0, sweepY);
        grad.addColorStop(0, 'rgba(240,180,95,0)');
        grad.addColorStop(1, 'rgba(240,180,95,0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, sweepY - 24, w, 24);
        ctx.strokeStyle = 'rgba(240,180,95,0.4)';
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

    // M1 — Full-stage crosshair (22% opacity amber)
    ctx.save();
    ctx.strokeStyle = 'rgba(240,180,95,0.22)';
    ctx.lineWidth = 1;

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(w, sy);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, h);
    ctx.stroke();
    ctx.restore();

    // Iris reticle ring (28px, 2px amber, four 6px gap notches)
    ctx.save();
    ctx.strokeStyle = 'rgba(240,180,95,0.85)';
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

    // Center dot
    ctx.fillStyle = 'rgba(240,180,95,0.6)';
    ctx.beginPath();
    ctx.arc(sx, sy, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    animRef.current = requestAnimationFrame(draw);
  }, [containerRef, enabled]);

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
      sweepRef.current = { active: true, y: 0, startTime: performance.now() };
    };

    const onLeave = () => {
      cursorRef.current.visible = false;
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
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 550 }}
    />
  );
};
