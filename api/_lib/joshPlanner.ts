import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export interface JoshVendorProductContext {
  name: string;
  priceUsd?: number;
  unit?: string;
  foodType?: string;
  dietaryTags?: string[];
  variants?: string[];
}

export interface JoshVendorContext {
  id: string;
  name: string;
  slug?: string;
  bioHandle?: string;
  marketplace: 'food' | 'party';
  category: string;
  area?: string;
  city: string;
  state?: string;
  country: string;
  allStatesCoverage?: boolean;
  serviceStates?: string[];
  serviceAreas?: string[];
  planTier?: string;
  startingPriceUsd?: number;
  rating?: number;
  reviewCount?: number;
  tagline?: string;
  specialties?: string[];
  christmasSpecial?: boolean;
  christmasOffer?: string;
  products?: JoshVendorProductContext[];
}

export interface JoshChristmasDishContext {
  name: string;
  category: string;
  foodType?: string;
  priceInr?: number;
  serves?: string;
}

export interface JoshBoxBiteContext {
  name: string;
  category?: string;
  priceInr?: number;
  moq?: number;
  tagline?: string;
}

export interface JoshPlannerRequest {
  message?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  vendors?: JoshVendorContext[];
  christmasDishes?: JoshChristmasDishContext[];
  boxBiteProducts?: JoshBoxBiteContext[];
  currency?: string;
  userLocation?: string;
  userCountry?: string;
  userState?: string;
}

export interface JoshPlannerResult {
  reply: string;
  recommendedVendorIds: string[];
  estimatedBudget: string;
  checklist: string[];
  suggestedAction?: 'none' | 'box_and_bite' | 'list_business' | 'christmas_menu';
  model?: string;
  fallback?: boolean;
}

const KNOWN_COUNTRIES = [
  'India',
  'Dubai / UAE',
  'Sri Lanka',
  'Pakistan',
  'Bangladesh',
  'Nepal',
] as const;

function detectMentionedCountry(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(pakistan|lahore|karachi|islamabad|rawalpindi|faisalabad|multan|peshawar)\b/.test(lower)) {
    return 'Pakistan';
  }
  if (/\b(nepal|kathmandu|pokhara|lalitpur|patan|bhaktapur|biratnagar)\b/.test(lower)) {
    return 'Nepal';
  }
  if (/\b(dubai|uae|abu dhabi|sharjah|ajman|al ain|ras al khaimah)\b/.test(lower)) {
    return 'Dubai / UAE';
  }
  if (/\b(sri lanka|colombo|kandy|galle|negombo|jaffna)\b/.test(lower)) {
    return 'Sri Lanka';
  }
  if (/\b(bangladesh|dhaka|chittagong|chattogram|sylhet|khulna|rajshahi)\b/.test(lower)) {
    return 'Bangladesh';
  }
  if (
    /\b(india|mumbai|delhi|bengaluru|bangalore|hyderabad|chennai|kolkata|pune|kochi|jaipur|ahmedabad|goa|chandigarh|lucknow|indore|surat|coimbatore|vizag|visakhapatnam|secunderabad|telangana|kerala|maharashtra|karnataka|tamil nadu)\b/.test(
      lower
    )
  ) {
    return 'India';
  }
  return null;
}

function rankAndTrimVendors(
  vendors: JoshVendorContext[],
  targetCountry: string | null,
  queryText: string
): JoshVendorContext[] {
  const qLower = queryText.toLowerCase();
  const tokens = qLower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  const scored = vendors.map((v) => {
    let score = 0;
    // Strongest boost: same country
    if (targetCountry && targetCountry !== 'All') {
      if (v.country.toLowerCase() === targetCountry.toLowerCase()) {
        score += 120;
      } else {
        score -= 80;
      }
    }
    // Paid & cloud vendor priority
    if (v.planTier === 'business') score += 20;
    else if (v.planTier === 'pro') score += 12;

    const hay = [
      v.name,
      v.category,
      v.city,
      v.area ?? '',
      v.state ?? '',
      v.country,
      v.tagline ?? '',
      ...(v.specialties ?? []),
      ...(v.serviceAreas ?? []),
      ...(v.serviceStates ?? []),
      ...(v.products ?? []).flatMap((p) => [
        p.name,
        p.foodType ?? '',
        ...(p.dietaryTags ?? []),
      ]),
    ]
      .join(' ')
      .toLowerCase();

    for (const tok of tokens) {
      if (hay.includes(tok)) score += 18;
    }

    if (v.city && qLower.includes(v.city.toLowerCase())) score += 45;
    if (v.area && qLower.includes(v.area.toLowerCase())) score += 40;
    if (v.christmasSpecial && /christmas|xmas|plum|yule|nye|new year|festive/.test(qLower)) {
      score += 35;
    }
    return { v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // If a target country is active/mentioned, keep primarily that country (up to 75)
  // plus a small fallback sample only if very few exist in that country
  const sameCountry =
    targetCountry && targetCountry !== 'All'
      ? scored.filter((item) => item.v.country.toLowerCase() === targetCountry.toLowerCase())
      : scored;

  if (sameCountry.length >= 6) {
    return sameCountry.slice(0, 80).map((s) => s.v);
  }
  return scored.slice(0, 80).map((s) => s.v);
}

function buildCompactVendorDirectory(vendors: JoshVendorContext[]): string {
  return vendors
    .map((v) => {
      const coverage = v.allStatesCoverage
        ? `All ${v.country}`
        : v.serviceStates && v.serviceStates.length > 0
          ? v.serviceStates.slice(0, 4).join('/')
          : '';
      const loc = [v.area, v.city, v.state, v.country].filter(Boolean).join(', ');
      const prodList = (v.products ?? [])
        .slice(0, 8)
        .map((p) => {
          const tags = [
            p.foodType === 'veg' ? 'Veg' : p.foodType === 'non-veg' ? 'Non-Veg' : '',
            ...(p.dietaryTags ?? []).slice(0, 3),
          ]
            .filter(Boolean)
            .join('/');
          const pricePart = p.priceUsd ? `~$${p.priceUsd}` : '';
          const unitPart = p.unit ? ` (${p.unit})` : '';
          const varPart = p.variants && p.variants.length > 0 ? ` [${p.variants.slice(0, 3).join(', ')}]` : '';
          return `${p.name}${pricePart ? ` ${pricePart}` : ''}${unitPart}${tags ? ` {${tags}}` : ''}${varPart}`;
        })
        .join(' ; ');

      return [
        `ID:${v.id}`,
        `Name:${v.name}`,
        `URL:/v/${v.slug || v.id}`,
        `Market:${v.marketplace === 'food' ? 'FindMyBites' : 'PimpMyParty'}`,
        `Cat:${v.category}`,
        `Loc:${loc}`,
        coverage ? `Covers:${coverage}` : '',
        v.planTier ? `Plan:${v.planTier}` : '',
        v.startingPriceUsd ? `From:$${v.startingPriceUsd}` : '',
        v.rating ? `Rating:${v.rating}` : '',
        v.specialties?.length ? `Specialties:${v.specialties.slice(0, 5).join(', ')}` : '',
        v.christmasSpecial ? `ChristmasOffer:${v.christmasOffer || 'Taking Christmas & NYE Pre-Orders'}` : '',
        prodList ? `Menu:[${prodList}]` : '',
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
  return trimmed;
}

function buildSmartLocalFallback(
  message: string,
  rankedVendors: JoshVendorContext[],
  targetCountry: string | null,
  currency: string
): JoshPlannerResult {
  const lower = message.toLowerCase();
  const isCorporate = /corporate|office|bulk|hamper|box\s*&?\s*bite|client gift|diwali|employee/.test(lower);
  const isListBusiness = /list my|sell cake|join findmybites|baker plan|pricing plan|subscription|how to list/.test(lower);
  const isChristmas = /christmas|xmas|plum cake|yule log|feast|turkey|roast|nye|new year/.test(lower);

  const localMatches = rankedVendors
    .filter((v) => !targetCountry || targetCountry === 'All' || v.country === targetCountry)
    .slice(0, 4);

  const recommendedIds = localMatches.map((v) => v.id);
  const countryLabel = targetCountry && targetCountry !== 'All' ? targetCountry : 'your area';

  if (isCorporate) {
    return {
      reply: `For corporate gifting & bulk branded food hampers, check out **BOX & BITE by FindMyBites** — customizable dessert & snack boxes with your company logo sleeves, GST invoicing, and dispatch across India (MOQ starting from 15–25 boxes). I've also pulled our top local hamper & bake studios in ${countryLabel} below so you can message them directly on WhatsApp with 0% commission!`,
      recommendedVendorIds: recommendedIds,
      estimatedBudget: `Varies by box count (custom bulk quotes in ${currency})`,
      checklist: [
        'Confirm total box quantity & delivery pincode(s)',
        'Pick Veg / Eggless / Sugar-Free or Assorted selection',
        'Share company logo for custom sleeve branding',
        'Lock dispatch date at least 4–7 days in advance',
      ],
      suggestedAction: 'box_and_bite',
      fallback: true,
    };
  }

  if (isListBusiness) {
    return {
      reply: `You can list your bakery, kitchen, catering, or event brand on **FindMyBites × PimpMyParty** in under 2 minutes with **0% commission** on orders! Every store gets a shareable storefront link (\`findmybites.com/v/your-store\`), an Instagram Bio-Link (\`findmybites.com/fmb/your-handle\`), direct WhatsApp ordering, and access to our Baker Growth Hub & Cake Pricing Kit. Free listing is available to start right away, with Pro & Business Spotlight plans for top search ranking!`,
      recommendedVendorIds: [],
      estimatedBudget: `Free to start · Pro & Spotlight plans available in ${currency}`,
      checklist: [
        'Click "List your business" and select your Country, State & Area',
        'Upload 3–6 crisp photos of your best cakes or packages with prices',
        'Add your WhatsApp number & Google Maps link for instant customer trust',
        'Share your new /fmb/ Bio-Link in your Instagram bio',
      ],
      suggestedAction: 'list_business',
      fallback: true,
    };
  }

  const vendorNames =
    localMatches.length > 0
      ? localMatches.map((v) => `**${v.name}** (${v.city})`).join(', ')
      : '';

  return {
    reply:
      localMatches.length > 0
        ? `I found ${localMatches.length} verified ${isChristmas ? 'festive ' : ''}vendors in **${countryLabel}** matching your request: ${vendorNames}. Tap any card below to view their full menu, eggless/dietary tags, and message them directly on WhatsApp with **0% commission**. Want me to narrow down by exact area, guest count, or budget?`
        : `I'm here to help plan your cakes, desserts, catering, or party in **${countryLabel}**! Tell me your **city/area, guest count, occasion, and budget** (plus any preferences like Eggless, Sugar-Free, or Veg), and I'll match you with the best local vendors and a step-by-step plan.`,
    recommendedVendorIds: recommendedIds,
    estimatedBudget: `Direct vendor quotes in ${currency} (0% commission)`,
    checklist: [
      'Share your event date, city/neighbourhood, and guest count',
      'Confirm dietary preferences (Eggless, Pure Veg, Sugar-Free, Gluten-Free)',
      'Tap any recommended vendor to browse real menu prices & photos',
      'Message directly on WhatsApp to confirm availability & delivery slot',
    ],
    suggestedAction: isChristmas ? 'christmas_menu' : 'none',
    fallback: true,
  };
}

export async function runJoshEventPlanner(body: JoshPlannerRequest): Promise<JoshPlannerResult> {
  const {
    message = '',
    history = [],
    vendors = [],
    christmasDishes = [],
    boxBiteProducts = [],
    currency = 'INR',
    userLocation = '',
    userCountry = '',
    userState = '',
  } = body;

  const trimmedMessage = String(message).trim();
  if (!trimmedMessage) {
    throw new Error('Message is required');
  }

  // Combine latest message + recent user history to accurately detect country intent
  const combinedUserText = [
    ...history.filter((h) => h.role === 'user').slice(-3).map((h) => h.text),
    trimmedMessage,
  ].join(' ');

  const mentionedCountry = detectMentionedCountry(combinedUserText);
  const effectiveCountry =
    mentionedCountry ||
    (userCountry && userCountry !== 'All' && (KNOWN_COUNTRIES as readonly string[]).includes(userCountry)
      ? userCountry
      : null);

  const rankedVendors = rankAndTrimVendors(vendors, effectiveCountry, combinedUserText);
  const validVendorIds = new Set(vendors.map((v) => v.id));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildSmartLocalFallback(trimmedMessage, rankedVendors, effectiveCountry, currency);
  }

  const vendorContext = buildCompactVendorDirectory(rankedVendors);

  const christmasContext =
    christmasDishes.length > 0
      ? christmasDishes
          .slice(0, 35)
          .map(
            (d) =>
              `${d.name} (${d.category}, ${d.foodType || 'mixed'}${d.priceInr ? `, ₹${d.priceInr}` : ''}${d.serves ? `, ${d.serves}` : ''})`
          )
          .join(' | ')
      : 'Custom Hyderabad Christmas Dinner & Lunch Menu (Roast Chicken, Plum Cakes, Biryani, Appetizers, Desserts) + Pan-regional Christmas Plum Cake Bakers.';

  const boxBiteContext =
    boxBiteProducts.length > 0
      ? boxBiteProducts
          .slice(0, 20)
          .map(
            (b) =>
              `${b.name}${b.category ? ` [${b.category}]` : ''}${b.priceInr ? ` ₹${b.priceInr}` : ''}${b.moq ? ` (MOQ ${b.moq})` : ''}${b.tagline ? ` - ${b.tagline}` : ''}`
          )
          .join(' | ')
      : 'BOX & BITE Corporate Food Gifting: Custom branded dessert boxes, brownie hampers, healthy dry-fruit & artisan treat boxes with company logo sleeves, GST billing, pan-India dispatch.';

  const systemInstruction = `You are the super-helpful **Plan your Event** Concierge for **FindMyBites × PimpMyParty** (www.findmybites.com).

## PLATFORM KNOWLEDGE (YOU KNOW EVERYTHING ABOUT FINDMYBITES × PIMPMYPARTY):
1. **FindMyBites (Food Marketplace)**: Verified Home Bakers, Custom Birthday/Wedding Cakes, Eggless & Sugar-Free Cakes, Brownies, Cupcakes, Cheesecakes, Cloud Kitchens, Catering, Live Food Counters, Mocktail & Bartending Bars, Snack Boxes, Mithai & Gifting Hampers.
2. **PimpMyParty (Events Marketplace)**: Birthday & Wedding Decor, Balloon Stylists, Photography & Videography, DJs & Live Bands, Anchors/MCs, Magicians, Kids Entertainment, Return Gifts, Party Planners.
3. **Zero Commission & Direct WhatsApp**: Customers browse real menus & prices and message vendors directly on WhatsApp — 0% platform commission.
4. **Launch Markets (6 Countries)**: India, Dubai / UAE, Sri Lanka, Pakistan, Bangladesh, Nepal.
5. **BOX & BITE (Corporate Gifting Sub-Brand)**: Custom branded corporate food & dessert gift boxes with custom logo sleeves, Build-Your-Own-Box builder, GST invoicing, bulk employee & client gifting.
   Live BOX & BITE Catalog: ${boxBiteContext}
6. **Christmas & NYE 2026 Specials**: Plum cakes, Yule logs, festive gift hampers, NYE bars & decor — plus a dedicated **Hyderabad Christmas Dinner & Lunch Custom Menu Builder**.
   Live Christmas Menu Highlights: ${christmasContext}
7. **For Vendors / Bakers**: Anyone can list their store in 2 minutes (Free plan to start; Pro & Business Spotlight plans for top search ranking & promo banners). Every vendor gets a live storefront (/v/slug), an Instagram Bio-Link (/fmb/handle), Google Business Profile linking toolkit, Cake Pricing Kit calculator, and Growth Hub inside their Vendor Dashboard.

## CRITICAL GEOGRAPHY & ISOLATION RULES (NEVER VIOLATE):
- Customer's detected location: ${userLocation || 'Not shared yet'}
- Customer's active country: ${effectiveCountry || 'Not specified'}
- Customer's active state: ${userState || 'Not specified'}
- Customer's preferred currency: ${currency}
- **STRICT COUNTRY RULE**: NEVER recommend a vendor from Pakistan/Nepal/Dubai/Sri Lanka/Bangladesh to a customer asking for India, and NEVER recommend an India vendor to a customer in Pakistan, Nepal, Dubai/UAE, Sri Lanka, or Bangladesh!
- Always prioritize vendors matching the customer's requested city/area and country. If a vendor has "Covers:All <Country>" or covers the customer's state, you may recommend them for that country.
- If NO vendor in the catalog matches the customer's specific city/country yet, DO NOT invent fake vendors and DO NOT recommend vendors from another country — instead tell them honestly that we're onboarding more bakers/vendors in their city and offer to help them post an Event Request or check nearby cities in their SAME country.

## RESPONSE STYLE:
- Warm, practical, crisp, and tailored to what the user asked (birthday cakes, brownies, eggless cakes, weddings, house parties, corporate gifting, or listing a business).
- Reference REAL products, prices (converted roughly into ${currency} if helpful), dietary tags (Eggless, Pure Veg, Sugar-Free, Jaggery, etc.), and specific vendor names from the live catalog below.
- Only return vendor IDs in \`recommendedVendorIds\` that appear EXACTLY in the Live Catalog below and match the customer's country (max 4 IDs).
- Set \`suggestedAction\` to:
  - "box_and_bite" if the user asks about corporate gifting, bulk office boxes, employee hampers, or BOX & BITE.
  - "list_business" if the user asks how to join/list as a baker/vendor or asks about vendor plans.
  - "christmas_menu" if the user asks about Hyderabad Christmas dinner/lunch feast or Christmas plum cake specials.
  - "none" otherwise.

## LIVE VENDOR CATALOG (${rankedVendors.length} relevant verified stores):
${vendorContext || 'No vendors loaded for this region yet.'}`;

  const conversationLines = history
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'Customer' : 'Event Planner'}: ${h.text}`)
    .join('\n');

  const userPrompt = `${conversationLines ? `Recent conversation:\n${conversationLines}\n\n` : ''}Customer's latest message: ${trimmedMessage}`;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: userPrompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description:
                'Warm, detailed, actionable answer referencing real local vendors, specific products/dietary options, or platform features. Use concise formatting.',
            },
            recommendedVendorIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 4 exact vendor IDs from the live catalog matching the customer country & request.',
            },
            estimatedBudget: {
              type: Type.STRING,
              description: 'Realistic estimated budget range in the user currency (or "Free to start" for vendor listing queries).',
            },
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 to 5 crisp, actionable next steps.',
            },
            suggestedAction: {
              type: Type.STRING,
              description: 'One of: none, box_and_bite, list_business, christmas_menu',
            },
          },
          required: ['reply', 'recommendedVendorIds', 'estimatedBudget', 'checklist'],
        },
      },
    });

    const rawText = stripJsonFences(response.text || '{}');
    const parsed = JSON.parse(rawText) as Partial<JoshPlannerResult>;

    // Strictly validate returned vendor IDs against real vendors AND country isolation
    const filteredIds = Array.isArray(parsed.recommendedVendorIds)
      ? parsed.recommendedVendorIds
          .filter((id): id is string => typeof id === 'string' && validVendorIds.has(id))
          .filter((id) => {
            if (!effectiveCountry || effectiveCountry === 'All') return true;
            const found = vendors.find((v) => v.id === id);
            return !found || found.country.toLowerCase() === effectiveCountry.toLowerCase();
          })
          .slice(0, 4)
      : [];

    const validActions = new Set(['none', 'box_and_bite', 'list_business', 'christmas_menu']);
    const suggestedAction =
      typeof parsed.suggestedAction === 'string' && validActions.has(parsed.suggestedAction)
        ? (parsed.suggestedAction as JoshPlannerResult['suggestedAction'])
        : 'none';

    return {
      reply:
        typeof parsed.reply === 'string' && parsed.reply.trim()
          ? parsed.reply.trim()
          : buildSmartLocalFallback(trimmedMessage, rankedVendors, effectiveCountry, currency).reply,
      recommendedVendorIds: filteredIds,
      estimatedBudget:
        typeof parsed.estimatedBudget === 'string' && parsed.estimatedBudget.trim()
          ? parsed.estimatedBudget.trim()
          : `Custom quote in ${currency}`,
      checklist: Array.isArray(parsed.checklist)
        ? parsed.checklist.filter((c): c is string => typeof c === 'string' && c.trim().length > 0).slice(0, 5)
        : [],
      suggestedAction,
      model: 'gemini-4-hydrogen',
    };
  } catch (err) {
    console.error('[Josh AI Event Planner] Gemini error, returning smart local fallback:', err);
    return buildSmartLocalFallback(trimmedMessage, rankedVendors, effectiveCountry, currency);
  }
}
