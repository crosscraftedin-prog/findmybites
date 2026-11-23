export interface BoxAndBiteColorPalette {
  chocolate: string;
  chocolateDeep: string;
  cream: string;
  caramel: string;
  caramelHover: string;
  beige: string;
  olive: string;
  oliveSoft: string;
  hairline: string;
}

export interface BoxAndBiteContactConfig {
  email: string;
  whatsappDigits: string;
  phoneDisplay: string;
  conciergeHours: string;
  dispatchHub: string;
  serviceCoverage: string;
}

export interface BoxAndBitePromoCode {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minSubtotalInr: number;
  label: string;
}

export interface RibbonOption {
  id: string;
  label: string;
  hex: string;
}

export interface GreetingCardStyle {
  id: string;
  name: string;
  description: string;
  accentHex: string;
  surfaceHex: string;
}

export interface BoxAndBiteConfig {
  brandName: string;
  tagline: string;
  parentBrandName: string;
  subBrandDescriptor: string;
  heroHeadline: string;
  heroSupportingCopy: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  samplePriceNotice: string;
  paymentGatewayNotice: string;
  colors: BoxAndBiteColorPalette;
  contact: BoxAndBiteContactConfig;
  ribbonOptions: RibbonOption[];
  sleeveFinishes: string[];
  greetingCardStyles: GreetingCardStyle[];
  promoCodes: BoxAndBitePromoCode[];
  shipping: {
    sampleFlatInr: number;
    freeShippingThresholdInr: number;
    bulkLeadTimeDays: string;
    sampleLeadTimeDays: string;
  };
}

/**
 * Central BOX & BITE brand, contact, palette, and merchandising configuration.
 * Update values here to rebrand or adjust colours, contact details, ribbons, or promos globally.
 */
export const BOX_AND_BITE_CONFIG: BoxAndBiteConfig = {
  brandName: 'BOX & BITE',
  tagline: 'Good Food. Beautifully Boxed.',
  parentBrandName: 'Find My Bites',
  subBrandDescriptor: 'Corporate Food Gifting by Find My Bites',
  heroHeadline: 'MAKE EVERY BUSINESS GIFT MEMORABLE.',
  heroSupportingCopy:
    'Curated Indian snack boxes, meeting meal boxes, handmade chocolates, cookies, and festive hampers designed for teams, clients, and corporate events.',
  primaryCtaLabel: 'REQUEST A CORPORATE QUOTE',
  secondaryCtaLabel: 'BUILD A CUSTOM CORPORATE BOX',
  samplePriceNotice:
    'All listed INR rates are illustrative sample/demo prices. Final corporate quotations are confirmed based on volume, branding finish, and delivery schedule.',
  paymentGatewayNotice:
    'Demo sample checkout — no live payment gateway is connected. Submitting places a sample reservation request for manual confirmation.',
  colors: {
    chocolate: '#38231E',
    chocolateDeep: '#2A1915',
    cream: '#FFF8EF',
    caramel: '#C58B55',
    caramelHover: '#B37944',
    beige: '#EDE0D0',
    olive: '#777B50',
    oliveSoft: '#EAEBD9',
    hairline: 'rgba(56, 35, 30, 0.14)',
  },
  contact: {
    email: 'gifting@boxandbite.in',
    whatsappDigits: '919052681374',
    phoneDisplay: '+91 90526 81374',
    conciergeHours: 'Mon – Sat · 9:30 AM to 7:00 PM IST',
    dispatchHub: 'Hyderabad, Mumbai & Bengaluru Partner Kitchens',
    serviceCoverage: 'Single-office bulk drops & pan-India multi-address dispatch',
  },
  ribbonOptions: [
    { id: 'caramel-satin', label: 'Caramel Satin', hex: '#C58B55' },
    { id: 'chocolate-grosgrain', label: 'Deep Chocolate', hex: '#38231E' },
    { id: 'muted-olive', label: 'Muted Olive', hex: '#777B50' },
    { id: 'ivory-linen', label: 'Warm Ivory', hex: '#EDE0D0' },
  ],
  sleeveFinishes: [
    'Matte Cream Belly Sleeve (Full-Colour Logo)',
    'Deep Chocolate Sleeve with Caramel Foil Stamping',
    'Custom Brand-Matched Pantone Sleeve (MOQ 50+)',
  ],
  greetingCardStyles: [
    {
      id: 'editorial-cream',
      name: 'Editorial Cream Stock',
      description: '350 GSM textured cotton card with refined serif header.',
      accentHex: '#C58B55',
      surfaceHex: '#FFF8EF',
    },
    {
      id: 'chocolate-foil',
      name: 'Chocolate & Brass Foil',
      description: 'Deep espresso card stock framed with warm metallic border.',
      accentHex: '#C58B55',
      surfaceHex: '#38231E',
    },
    {
      id: 'botanical-olive',
      name: 'Botanical Olive Frame',
      description: 'Soft beige card with understated olive stationery trim.',
      accentHex: '#777B50',
      surfaceHex: '#EDE0D0',
    },
  ],
  promoCodes: [
    {
      code: 'BITE10',
      type: 'percent',
      value: 10,
      minSubtotalInr: 1000,
      label: '10% off sample orders above ₹1,000',
    },
    {
      code: 'CORP15',
      type: 'percent',
      value: 15,
      minSubtotalInr: 5000,
      label: '15% off team packs above ₹5,000',
    },
    {
      code: 'WELCOME500',
      type: 'flat',
      value: 500,
      minSubtotalInr: 3500,
      label: '₹500 off orders above ₹3,500',
    },
  ],
  shipping: {
    sampleFlatInr: 150,
    freeShippingThresholdInr: 4000,
    sampleLeadTimeDays: '2–4 business days (metro cities)',
    bulkLeadTimeDays: '5–10 business days depending on custom sleeve & print proofing',
  },
};

export function formatInr(amount: number): string {
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}
