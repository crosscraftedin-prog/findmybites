import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSupabaseApiRouter } from './api/_lib/supabaseApi.js';
import { runJoshEventPlanner, type JoshPlannerRequest } from './api/_lib/joshPlanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use('/api/db', createSupabaseApiRouter());

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
  const baseUrl = resolveBaseUrl(req);
  const today = new Date().toISOString().split('T')[0];

  const categories = [
    'bakers-and-cakes',
    'home-bakers-and-cloud-kitchens',
    'live-counters-and-food-stalls',
    'catering-services',
    'private-chefs-and-home-dining',
    'bar-mocktails-and-beverage-carts',
    'snack-boxes-and-party-platters',
    'dessert-tables-and-sweet-stations',
    'gifting-hampers-and-return-favors',
    'mithai-chocolatiers-and-dates',
    'food-trucks-and-pop-up-carts',
    'healthy-vegan-and-diet-catering',
    'wedding-and-party-decor',
    'balloon-and-theme-birthday-decor',
    'event-and-wedding-planners',
    'djs-sound-and-live-bands',
    'photographers-and-videographers',
    'venues-farmhouses-and-villas',
    'photo-booths-and-360-spinners',
    'kids-entertainment-and-mascots',
    'anchors-emcees-and-performers',
    'makeup-hair-and-mehendi-artists',
    'event-rentals-furniture-and-tents',
    'lighting-av-and-cold-fireworks',
  ];

  const countries = ['india', 'dubai-uae', 'sri-lanka', 'pakistan', 'bangladesh', 'nepal'];

  const staticVendorSlugs = [
    'saffron-crumb-mumbai',
    'royal-chaat-live-delhi',
    'botanical-bar-dubai',
    'marigold-decor-dubai',
    'festive-hamper-bengaluru',
    'ceylon-feast-colombo',
    'lahore-shahi-caterers',
    'dhaka-velvet-bakes',
    'himalayan-bloom-kathmandu',
    'pulse-nights-mumbai',
    'karachi-sweet-home-baker',
    'colombo-moments-photo',
    'pastel-pop-balloons-bengaluru',
    'qasr-dates-mithai-dubai',
    'chhatarpur-villa-lawns-delhi',
    'spin360-booths-mumbai',
  ];

  let liveSlugs: string[] = [];
  try {
    const supaUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const supaKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (supaUrl && supaKey) {
      const r = await fetch(
        `${supaUrl}/rest/v1/vendors?select=slug&status=eq.active&limit=500`,
        {
          headers: {
            apikey: supaKey,
            Authorization: `Bearer ${supaKey}`,
          },
        }
      );
      if (r.ok) {
        const rows = (await r.json()) as Array<{ slug?: string }>;
        liveSlugs = rows.map((row) => row.slug || '').filter(Boolean);
      }
    }
  } catch {
    // Non-fatal: fall back to static vendor slugs
  }

  const vendorSlugs = Array.from(new Set([...liveSlugs, ...staticVendorSlugs]));

  const urls = [
    { loc: `${baseUrl}/`, priority: '1.0', freq: 'daily' },
    ...countries.map((c) => ({
      loc: `${baseUrl}/?country=${encodeURIComponent(c)}`,
      priority: '0.9',
      freq: 'daily',
    })),
    ...categories.map((cat) => ({
      loc: `${baseUrl}/?category=${encodeURIComponent(cat)}`,
      priority: '0.85',
      freq: 'weekly',
    })),
    ...vendorSlugs.map((slug) => ({
      loc: `${baseUrl}/v/${encodeURIComponent(slug)}`,
      priority: '0.8',
      freq: 'weekly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.type('application/xml').send(xml);
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
