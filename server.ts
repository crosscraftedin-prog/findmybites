import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createSupabaseApiRouter } from './server/supabaseApi.ts';

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

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

interface VendorSummaryInput {
  id: string;
  name: string;
  marketplace: 'food' | 'party';
  category: string;
  city: string;
  country: string;
  planTier: 'business' | 'pro' | 'free';
  startingPriceUsd: number;
  rating: number;
  tagline: string;
  specialties: string[];
}

app.post('/api/ai/event-planner', async (req, res) => {
  try {
    const {
      messages = [],
      vendors = [],
      currency = 'INR',
      userLocationLabel = '',
    } = req.body as {
      messages: ChatTurn[];
      vendors: VendorSummaryInput[];
      currency: string;
      userLocationLabel?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Please send a message to plan your event.' });
    }

    const ai = getGeminiClient();

    const vendorCatalogSummary = vendors
      .slice(0, 24)
      .map(
        (v) =>
          `- id="${v.id}" | ${v.name} (${v.category}, ${v.marketplace}) | ${v.city}, ${v.country} | plan=${v.planTier} | from $${v.startingPriceUsd} USD | rating ${v.rating} | ${v.tagline}`
      )
      .join('\n');

    const conversationTranscript = messages
      .map((m) => `${m.role === 'user' ? 'Customer' : 'Josh AI'}: ${m.text}`)
      .join('\n');

    const systemInstruction = `You are Josh, the warm, practical AI Event Planner for FindMyBites × PimpMyParty across India, Dubai (UAE), Sri Lanka, Pakistan, Bangladesh, and Nepal.

Your job:
1. Collect the customer's key event details naturally through conversation:
   - Event type (wedding, birthday, mehendi/sangeet, corporate, baby shower, house party, anniversary)
   - City & country (especially India, Dubai/UAE, Sri Lanka, Pakistan, Bangladesh, Nepal)
   - Guest count & approximate budget (in ${currency})
   - Services needed across FindMyBites (Bakers & Cakes, Home Bakers & Cloud Kitchens, Live Counters & Food Stalls, Catering Services, Private Chefs & Home Dining, Bar/Mocktails & Beverage Carts, Snack Boxes & Party Platters, Dessert Tables & Sweet Stations, Gifting/Hampers & Return Favors, Mithai/Chocolatiers & Dates, Food Trucks & Pop-Up Carts, Healthy/Vegan & Diet Catering) and PimpMyParty (Wedding & Party Decor, Balloon & Theme Birthday Decor, Event & Wedding Planners, DJs/Sound & Live Bands, Photographers & Videographers, Venues/Farmhouses & Villas, Photo Booths & 360 Spinners, Kids Entertainment & Mascots, Anchors/Emcees & Performers, Makeup/Hair & Mehendi Artists, Event Rentals/Furniture & Tents, Lighting/AV & Cold Fireworks)
2. If the customer has only shared 1-2 details (like "I want to plan a birthday"), ask 2-3 concise, friendly follow-up questions to gather missing details (city, guests, budget, food/decor preferences) AND set hasPlan=false.
3. Once you have enough context (event type + at least city OR guests OR services/budget), OR if the user asks for a plan right away, set hasPlan=true and generate a complete, actionable event plan:
   - Crisp summary title, occasion, city, guest count, and estimated total budget in ${currency}
   - Budget breakdown across 3-5 categories (e.g. Decor, Catering & Live Counters, Cake & Desserts, Bar / Snack Boxes / Gifting)
   - Step-by-step event checklist & timeline (4-6 items)
   - Menu / Live Counter / Decor recommendations tailored to the region and occasion
   - matchedVendorIds: pick 2 to 4 best matching vendor IDs from the provided catalog (preferring vendors in the same country/city and prioritizing plan=business or plan=pro vendors first!).
4. Keep your conversational reply crisp, warm, and scannable (under 110 words). Do not invent vendor IDs that are not in the catalog.`;

    const prompt = `User location hint: ${userLocationLabel || 'Not specified'}
Preferred currency: ${currency}

Available Marketplace Vendors:
${vendorCatalogSummary}

Conversation so far:
${conversationTranscript}

Respond as Josh AI in the required JSON schema.`;

    const requestPayload = {
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Conversational message from Josh AI to the customer.',
            },
            quickReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 short suggested next user replies.',
            },
            hasPlan: {
              type: Type.BOOLEAN,
              description: 'True when enough event details exist to present a structured event plan.',
            },
            plan: {
              type: Type.OBJECT,
              description: 'Structured event plan when hasPlan is true.',
              properties: {
                title: { type: Type.STRING },
                occasion: { type: Type.STRING },
                location: { type: Type.STRING },
                guestCount: { type: Type.STRING },
                estimatedBudget: { type: Type.STRING },
                budgetSplit: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      category: { type: Type.STRING },
                      amount: { type: Type.STRING },
                      notes: { type: Type.STRING },
                    },
                  },
                },
                timelineChecklist: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                menuAndDecorIdeas: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                matchedVendorIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            },
          },
          required: ['reply', 'quickReplies', 'hasPlan'],
        },
      },
    };

    let response;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await ai.models.generateContent(requestPayload);
        break;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : '';
        if (attempt === 0 && (msg.includes('503') || msg.includes('UNAVAILABLE'))) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          continue;
        }
        throw err;
      }
    }

    if (!response) {
      throw lastError ?? new Error('No response from AI Event Planner.');
    }

    const rawText = (response.text ?? '{}').trim();
    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (err: unknown) {
    let message = err instanceof Error ? err.message : 'Failed to reach AI Event Planner.';
    try {
      const parsedErr = JSON.parse(message);
      if (parsedErr?.error?.message) {
        message = parsedErr.error.message;
      }
    } catch {
      // keep original message
    }
    console.error('AI event planner error:', err);
    return res.status(503).json({ error: message });
  }
});

async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const distDir = path.resolve(__dirname, 'dist');

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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`FindMyBites × PimpMyParty server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
