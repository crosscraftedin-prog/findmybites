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
  speedX: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

export function SnowfallOverlay({ enabled, onToggle }: SnowfallOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const createFlakes = () => {
      // Keep particle counts light for zero scroll/battery lag on mobile & iPad
      const count = width < 640 ? 22 : width < 1024 ? 30 : 40;
      const list: Flake[] = [];
      for (let i = 0; i < count; i++) {
        list.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: 1.3 + Math.random() * 2.4,
          speedY: 0.45 + Math.random() * 0.9,
          speedX: (Math.random() - 0.5) * 0.35,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.008 + Math.random() * 0.015,
          opacity: 0.32 + Math.random() * 0.48,
        });
      }
      return list;
    };

    let flakes = createFlakes();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      flakes = createFlakes();
    };
    window.addEventListener('resize', handleResize, { passive: true });

    let lastFrameTime = 0;
    const FRAME_INTERVAL_MS = 1000 / 32; // Smooth ~32fps without blocking main-thread scrolling

    const draw = (now: number) => {
      animId = window.requestAnimationFrame(draw);
      if (document.hidden) return;
      if (now - lastFrameTime < FRAME_INTERVAL_MS) return;
      lastFrameTime = now;

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.wobble += f.wobbleSpeed;
        f.y += f.speedY;
        f.x += f.speedX + Math.sin(f.wobble) * 0.35;

        if (f.y > height + 8) {
          f.y = -8;
          f.x = Math.random() * width;
        }
        if (f.x > width + 8) f.x = -8;
        if (f.x < -8) f.x = width + 8;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${f.opacity})`;
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    animId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [enabled]);

  return (
    <>
      {enabled && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 h-full w-full"
        />
      )}

      {/* Subtle floating Snow toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={enabled ? 'Turn off festive snow animation' : 'Turn on festive snow animation'}
        title={enabled ? 'Snow: ON (click to disable)' : 'Snow: OFF (click to enable)'}
        className={`fixed bottom-20 left-3 z-40 inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold shadow-md backdrop-blur-md transition-all sm:px-3 lg:bottom-6 lg:left-6 ${
          enabled
            ? 'border-sky-300/60 bg-slate-900/80 text-sky-100 hover:bg-slate-900'
            : 'border-border bg-card/90 text-muted-foreground hover:border-brand hover:text-foreground'
        }`}
      >
        <Snowflake
          className={`size-3.5 ${enabled ? 'text-sky-300' : 'text-muted-foreground'}`}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{enabled ? 'Snow: On' : 'Snow: Off'}</span>
      </button>
    </>
  );
}
