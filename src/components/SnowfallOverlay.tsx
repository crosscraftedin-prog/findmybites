import { useEffect, useRef } from 'react';
import { Snowflake } from 'lucide-react';

interface SnowfallOverlayProps {
  enabled: boolean;
  onToggle: () => void;
}

interface Flake {
  x: number;
  y: number;
  r: number;
  speedY: number;
  driftX: number;
  phase: number;
  alpha: number;
}

export function SnowfallOverlay({ enabled, onToggle }: SnowfallOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const count = width < 640 ? 42 : 72;
    const flakes: Flake[] = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.6 + Math.random() * 3.4,
      speedY: 0.45 + Math.random() * 1.15,
      driftX: (Math.random() - 0.5) * 0.45,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.45,
    }));

    let tick = 0;

    const render = () => {
      tick += 0.012;
      ctx.clearRect(0, 0, width, height);

      for (const f of flakes) {
        f.y += f.speedY;
        f.x += f.driftX + Math.sin(tick + f.phase) * 0.45;

        if (f.y > height + 8) {
          f.y = -8;
          f.x = Math.random() * width;
        }
        if (f.x > width + 8) f.x = -8;
        if (f.x < -8) f.x = width + 8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${f.alpha})`;
        ctx.shadowColor = 'rgba(15, 45, 38, 0.35)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
      }

      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [enabled]);

  return (
    <>
      {enabled && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40"
        />
      )}

      {/* Subtle Floating Snowfall Toggle */}
      <button
        type="button"
        onClick={onToggle}
        title={enabled ? 'Turn off festive snowfall' : 'Turn on festive snowfall'}
        className={`fixed bottom-20 left-3 z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-lg backdrop-blur-md transition-all lg:bottom-5 lg:left-5 ${
          enabled
            ? 'border-emerald-400/40 bg-[#0F3A2E]/90 text-white hover:bg-[#144B3C]'
            : 'border-border bg-card/90 text-muted-foreground hover:border-brand hover:text-foreground'
        }`}
      >
        <Snowflake
          className={`size-3.5 ${enabled ? 'animate-spin text-sky-200' : ''}`}
          style={enabled ? { animationDuration: '9s' } : undefined}
          aria-hidden="true"
        />
        <span>{enabled ? 'Snow On' : 'Snow Off'}</span>
      </button>
    </>
  );
}
