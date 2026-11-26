import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSupabaseApiRouter } from './api/_lib/supabaseApi.js';
import { runJoshEventPlanner, type JoshPlannerRequest } from './api/_lib/joshPlanner.js';
import { buildDynamicSitemapXml } from './api/sitemap.js';
import seoCrawlerHandler from './api/seo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use('/api/db', createSupabaseApiRouter());

const CRAWLER_UA_RE =
  /(googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|pinterest|applebot|embedly|quora|outbrain|rogerbot)/i;

function resolveBaseUrl(req: express.Request): string {
  if (process.env.APP_URL && !process.env.APP_URL.includes('MY_APP_URL')) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.findmybites.com';
  return `${proto}://${host}`;
}

app.get('/robots.txt', (req, res) => {
  const baseUrl = resolveBaseUrl(req);
  res.type('text/plain').send(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join('\n')
  );
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = resolveBaseUrl(req);
    const xml = await buildDynamicSitemapXml(baseUrl);
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.type('application/xml; charset=utf-8').send(xml);
  } catch (err) {
    console.error('Dynamic sitemap error:', err);
    res.status(500).type('text/plain').send('Failed to generate sitemap');
  }
});

// Server-side SEO pre-rendering for Search Engine & Social Media Crawlers
app.use(async (req, res, next) => {
  if (req.method !== 'GET') return next();
  const ua = String(req.headers['user-agent'] || '');
  if (!CRAWLER_UA_RE.test(ua)) return next();

  const p = req.path || '/';
  if (
    p === '/' ||
    p.startsWith('/api/') ||
    p.startsWith('/assets/') ||
    p.startsWith('/icons/') ||
    p.startsWith('/src/') ||
    p.startsWith('/@vite') ||
    p.startsWith('/node_modules') ||
    /\.(js|css|png|jpg|jpeg|webp|avif|svg|ico|json|webmanifest|xml|txt|map|woff2?)$/i.test(p)
  ) {
    return next();
  }

  try {
    await seoCrawlerHandler(
      {
        query: {
          path: p,
          item: typeof req.query.item === 'string' ? req.query.item : undefined,
        },
      },
      {
        status: (code: number) => {
          res.status(code);
          return {
            status: () => res as unknown as never,
            setHeader: (k: string, v: string) => res.setHeader(k, v),
            send: (body: string) => res.send(body),
          };
        },
        setHeader: (k: string, v: string) => res.setHeader(k, v),
        send: (body: string) => res.send(body),
      }
    );
  } catch (err) {
    console.error('Crawler SSR render error:', err);
    next();
  }
});

// =========================================================================
// Josh AI Event Planner powered by Google Gemini (Shared Engine)
// =========================================================================
app.post('/api/ai/event-planner', async (req, res) => {
  try {
    const body = (req.body ?? {}) as JoshPlannerRequest;
    if (!body.message || !String(body.message).trim()) {
      return res.status(400).json({ error: 'Please send a message to plan your event.' });
    }
    const result = await runJoshEventPlanner(body);
    return res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reach Josh AI Event Planner.';
    console.error('AI event planner error:', err);
    return res.status(503).json({ error: message });
  }
});

function resolveServerBind(): { port: number; host: string } {
  const args = process.argv.slice(2);
  let cliPort: number | undefined;
  let cliHost: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--port' || arg === '-p') {
      const next = Number(args[i + 1]);
      if (Number.isInteger(next) && next > 0 && next <= 65535) {
        cliPort = next;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const next = Number(arg.slice('--port='.length));
      if (Number.isInteger(next) && next > 0 && next <= 65535) {
        cliPort = next;
      }
    } else if (arg === '--host') {
      if (args[i + 1] && !args[i + 1].startsWith('-')) {
        cliHost = args[i + 1];
        i += 1;
      }
    } else if (arg.startsWith('--host=')) {
      cliHost = arg.slice('--host='.length) || undefined;
    }
  }

  const isProd = process.env.NODE_ENV === 'production';
  const envPort = Number(process.env.PORT);
  const port =
    cliPort ??
    (isProd && Number.isInteger(envPort) && envPort > 0 && envPort <= 65535 ? envPort : 3000);
  const host = cliHost || '0.0.0.0';
  return { port, host };
}

async function startServer() {
  const { port, host } = resolveServerBind();
  const distDir = path.resolve(__dirname, 'dist');
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production' && fs.existsSync(distDir)) {
    const srcImagesDir = path.resolve(__dirname, 'src/assets/images');
    if (fs.existsSync(srcImagesDir)) {
      app.use('/src/assets/images', express.static(srcImagesDir, { maxAge: '7d' }));
    }
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const wsConfig = { server: httpServer };
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: hmrDisabled ? false : true,
        ws: wsConfig,
      },
      plugins: [
        {
          name: 'attach-express-ws-server',
          config() {
            return {
              server: {
                allowedHosts: true,
                hmr: hmrDisabled ? false : true,
                ws: wsConfig,
              },
            };
          },
        },
      ],
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(port, host, () => {
    console.log(`FindMyBites × PimpMyParty server listening on http://${host}:${port}`);
  });
}

startServer();
