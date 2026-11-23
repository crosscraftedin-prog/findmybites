import express, { type NextFunction, type Request, type Response } from 'express';
import { createSupabaseApiRouter } from './_lib/supabaseApi.js';

const app = express();

// Reconstruct Express route path when Vercel rewrites /api/db/:path* -> /api/db?__subpath=:path*
app.use((req: Request, _res: Response, next: NextFunction) => {
  const rawUrl = req.url || '/';
  try {
    const parsed = new URL(rawUrl, 'http://localhost');
    const subpath = parsed.searchParams.get('__subpath');
    if (subpath !== null) {
      parsed.searchParams.delete('__subpath');
      const cleanSub = subpath.replace(/^\/+/, '');
      const remainingQs = parsed.searchParams.toString();
      req.url = `/${cleanSub}${remainingQs ? `?${remainingQs}` : ''}`;
      if (req.query && typeof req.query === 'object') {
        delete (req.query as Record<string, unknown>).__subpath;
      }
    } else if (parsed.pathname === '/api/db' || parsed.pathname.startsWith('/api/db/')) {
      const stripped = parsed.pathname.slice('/api/db'.length) || '/';
      req.url = `${stripped}${parsed.search || ''}`;
    }
  } catch {
    // Keep original req.url if URL parsing fails
  }

  // Safely handle pre-parsed bodies from Vercel Node runtime without triggering errors on GET/HEAD
  const method = (req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    try {
      const incoming = (req as unknown as { body?: unknown }).body;
      if (typeof incoming === 'string' && incoming.trim()) {
        try {
          req.body = JSON.parse(incoming);
          (req as unknown as { _body?: boolean })._body = true;
        } catch {
          // Let express.json handle or reject malformed JSON
        }
      } else if (Buffer.isBuffer(incoming) && incoming.length > 0) {
        try {
          req.body = JSON.parse(incoming.toString('utf8'));
          (req as unknown as { _body?: boolean })._body = true;
        } catch {
          // Let express.json handle or reject malformed JSON
        }
      } else if (incoming && typeof incoming === 'object') {
        (req as unknown as { _body?: boolean })._body = true;
      } else if (req.readableEnded) {
        req.body = {};
        (req as unknown as { _body?: boolean })._body = true;
      }
    } catch {
      // Ignore lazy getter errors from hosting runtime
    }
  }

  next();
});

app.use(express.json({ limit: '12mb' }));
app.use(createSupabaseApiRouter());

// Always return structured JSON on unexpected Express errors instead of opaque 500 crashes
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Vercel /api/db Express error]:', err);
  if (res.headersSent) return;
  const status =
    typeof (err as { status?: number })?.status === 'number'
      ? (err as { status: number }).status
      : 500;
  const message =
    err instanceof Error ? err.message : 'Unexpected server error while processing request.';
  res.status(status).json({ error: message });
});

export default function handler(req: Request, res: Response) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('[Vercel /api/db handler crash]:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Server invocation error.',
      });
    }
  }
}
