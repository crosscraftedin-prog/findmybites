import express from 'express';
import { createSupabaseApiRouter } from '../server/supabaseApi';

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = express();

// Reconstruct Express route path when Vercel rewrites /api/db/:path* -> /api/db?__subpath=:path*
app.use((req, _res, next) => {
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

  // If the hosting runtime already parsed req.body, tell express.json() not to re-read the stream
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    (req as unknown as { _body?: boolean })._body = true;
  }

  next();
});

app.use(express.json({ limit: '12mb' }));
app.use(createSupabaseApiRouter());

export default app;
