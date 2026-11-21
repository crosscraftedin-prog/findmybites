import { GoogleGenAI, Type } from '@google/genai';

interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}

interface VercelLikeResponse {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
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
  specialties?: string[];
}

const ALLOWED_CURRENCIES = new Set(['INR', 'AED', 'LKR', 'PKR', 'BDT', 'NPR', 'USD']);

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY is not configured in Vercel Environment Variables yet.',
    });
  }

  try {
    let parsedBody: Record<string, unknown> = {};
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body) as Record<string, unknown>;
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request body.' });
      }
    } else if (req.body && typeof req.body === 'object') {
      parsedBody = req.body as Record<string, unknown>;
    }

    const rawMessages = Array.isArray(parsedBody.messages) ? parsedBody.messages : [];
    const messages: ChatTurn[] = rawMessages
      .slice(-14)
      .filter(
        (m): m is ChatTurn =>
          Boolean(m) &&
          typeof m === 'object' &&
          ((m as ChatTurn).role === 'user' || (m as ChatTurn).role === 'assistant') &&
          typeof (m as ChatTurn).text === 'string' &&
          (m as ChatTurn).text.trim().length > 0
      )
      .map((m) => ({
        role: m.role,
        text: sanitizeText(m.text, 1200),
      }));

    if (messages.length === 0) {
      return res.status(400).json({ error: 'Please send a message to plan your event.' });
    }

    const rawCurrency = sanitizeText(parsedBody.currency, 8).toUpperCase();
    const currency = ALLOWED_CURRENCIES.has(rawCurrency) ? rawCurrency : 'INR';
    const userLocationLabel = sanitizeText(parsedBody.userLocationLabel, 120);

    const rawVendors = Array.isArray(parsedBody.vendors) ? parsedBody.vendors : [];
    const vendors: VendorSummaryInput[] = rawVendors
      .slice(0, 24)
      .filter((v): v is VendorSummaryInput => Boolean(v) && typeof v === 'object')
      .map((v): VendorSummaryInput => ({
        id: sanitizeText(v.id, 80),
        name: sanitizeText(v.name, 120),
        marketplace: v.marketplace === 'party' ? 'party' : 'food',
        category: sanitizeText(v.category, 80),
        city: sanitizeText(v.city, 80),
        country: sanitizeText(v.country, 60),
        planTier:
          v.planTier === 'business'
            ? 'business'
            : v.planTier === 'pro'
              ? 'pro'
              : 'free',
        startingPriceUsd:
          typeof v.startingPriceUsd === 'number' && Number.isFinite(v.startingPriceUsd)
            ? Math.max(0, v.startingPriceUsd)
            : 0,
        rating:
          typeof v.rating === 'number' && Number.isFinite(v.rating)
            ? Math.min(5, Math.max(0, v.rating))
            : 4.8,
        tagline: sanitizeText(v.tagline, 180),
      }))
      .filter((v) => Boolean(v.id && v.name));

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const vendorCatalogSummary = vendors
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
    return res.status(200).json(parsed);
  } catch (err: unknown) {
    let message = 'Failed to reach AI Event Planner. Please try again.';
    if (err instanceof Error && err.message) {
      message = err.message;
      try {
        const parsedErr = JSON.parse(message);
        if (parsedErr?.error?.message) {
          message = String(parsedErr.error.message);
        }
      } catch {
        // keep original message
      }
    }
    console.error('Vercel AI event planner error:', err);
    return res.status(503).json({ error: message });
  }
}
