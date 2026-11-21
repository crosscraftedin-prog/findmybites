import type { ProductFoodType } from './vendors';

export const CHRISTMAS_BOOKING_WHATSAPP = '917799874374';
export const CHRISTMAS_BOOKING_PHONE_DISPLAY = '+91 77998 74374';
export const MIN_CHRISTMAS_GUESTS = 10;

export type ChristmasMealType = 'Christmas Lunch' | 'Christmas Dinner';

export type CustomMenuCategoryId =
  | 'christmas-specials'
  | 'starters'
  | 'biryani-rice'
  | 'curries-dal'
  | 'breads'
  | 'soups-chinese'
  | 'desserts'
  | 'beverages-sides';

export interface CustomMenuCategory {
  id: CustomMenuCategoryId;
  label: string;
}

export type ChristmasPresetId = 'christmas-veg' | 'christmas-non-veg' | 'cocktail-snacks';

export interface CustomMenuDish {
  id: string;
  name: string;
  category: CustomMenuCategoryId;
  foodType: ProductFoodType;
  priceInrPerGuest: number;
  portion: string;
  description: string;
  image?: string;
  popular?: boolean;
  presets?: ChristmasPresetId[];
  active?: boolean;
  sortOrder?: number;
  isCloudSaved?: boolean;
}

export interface ChristmasPlatterPreset {
  id: ChristmasPresetId;
  title: string;
  subtitle: string;
  foodBadge: 'veg' | 'non-veg' | 'cocktail';
  defaultDishIds: string[];
}

export const HYDERABAD_LOCALITIES = [
  'Banjara Hills',
  'Jubilee Hills',
  'Madhapur',
  'Hitech City',
  'Gachibowli',
  'Kondapur',
  'Kokapet / Financial District',
  'Manikonda',
  'Kukatpally / KPHB',
  'Miyapur',
  'Begumpet',
  'Somajiguda / Panjagutta',
  'Secunderabad / Trimulgherry',
  'Sainikpuri / Yapral',
  'Ameerpet',
  'Abids / Himayatnagar',
  'Uppal / Habsiguda',
  'LB Nagar / Dilsukhnagar',
  'Attapur / Mehdipatnam',
  'Kompally',
  'Other Hyderabad Area',
] as const;

export const CUSTOM_MENU_CATEGORIES: CustomMenuCategory[] = [
  { id: 'christmas-specials', label: 'Christmas Specials' },
  { id: 'starters', label: 'Starters & Kebabs' },
  { id: 'biryani-rice', label: 'Biryani & Rice' },
  { id: 'curries-dal', label: 'Curries & Dal' },
  { id: 'breads', label: 'Breads' },
  { id: 'soups-chinese', label: 'Soups & Chinese' },
  { id: 'desserts', label: 'Sweets & Desserts' },
  { id: 'beverages-sides', label: 'Beverages & Sides' },
];

export const CHRISTMAS_CUSTOM_DISHES: CustomMenuDish[] = [
  // 1. Christmas Specials & Roasts
  {
    id: 'xmas-roast-chicken',
    name: 'Herb-Crusted Roast Chicken',
    category: 'christmas-specials',
    foodType: 'non-veg',
    priceInrPerGuest: 165,
    portion: '150g',
    description: 'Rosemary, garlic butter & citrus-glazed holiday roast chicken with jus.',
    popular: true,
  },
  {
    id: 'xmas-honey-roast-veg',
    name: 'Honey-Glazed Roast Veg & Baby Potatoes',
    category: 'christmas-specials',
    foodType: 'veg',
    priceInrPerGuest: 85,
    portion: '150g',
    description: 'Oven-roasted baby potatoes, carrots, bell peppers & herbs.',
    popular: true,
  },
  {
    id: 'xmas-shepherds-pie',
    name: "Classic Chicken Shepherd's Pie",
    category: 'christmas-specials',
    foodType: 'non-veg',
    priceInrPerGuest: 145,
    portion: '160g',
    description: 'Savory minced chicken ragout topped with golden buttery mashed potatoes.',
  },
  {
    id: 'xmas-baked-mac',
    name: 'Creamy Baked Mac & Cheese',
    category: 'christmas-specials',
    foodType: 'veg',
    priceInrPerGuest: 95,
    portion: '150g',
    description: 'Cheddar & mozzarella baked pasta with herb breadcrumb crust.',
  },
  {
    id: 'xmas-plum-cake-slice',
    name: 'Rich Spiced Christmas Plum Cake',
    category: 'christmas-specials',
    foodType: 'veg',
    priceInrPerGuest: 75,
    portion: '90g slice',
    description: 'Slow-matured dry fruit & warm spice Christmas plum cake (eggless available).',
    popular: true,
  },
  {
    id: 'xmas-yule-log',
    name: 'Chocolate Hazelnut Yule Log',
    category: 'christmas-specials',
    foodType: 'veg',
    priceInrPerGuest: 110,
    portion: '90g slice',
    description: 'Belgian dark cocoa sponge rolled with praline cream.',
  },

  // 2. Starters & Kebabs
  {
    id: 'st-veg-manchurian',
    name: 'Veg Manchurian (Dry)',
    category: 'starters',
    foodType: 'veg',
    priceInrPerGuest: 45,
    portion: '100g',
    description: 'Crisp vegetable dumplings tossed in savory garlic soy glaze.',
  },
  {
    id: 'st-crispy-corn',
    name: 'Crispy Corn Salt & Pepper',
    category: 'starters',
    foodType: 'veg',
    priceInrPerGuest: 50,
    portion: '100g',
    description: 'Golden fried sweet corn kernels with scallions, pepper & lime.',
    popular: true,
  },
  {
    id: 'st-spring-rolls',
    name: 'Veg Spring Rolls',
    category: 'starters',
    foodType: 'veg',
    priceInrPerGuest: 45,
    portion: '2 pcs',
    description: 'Crunchy golden rolls stuffed with seasoned julienned veggies.',
  },
  {
    id: 'st-cheese-balls',
    name: 'Corn & Cheese Jalapeno Balls',
    category: 'starters',
    foodType: 'veg',
    priceInrPerGuest: 55,
    portion: '3 pcs',
    description: 'Melty mozzarella & sweet corn bites served with spiced dip.',
  },
  {
    id: 'st-chilli-paneer',
    name: 'Chilli Paneer',
    category: 'starters',
    foodType: 'veg',
    priceInrPerGuest: 80,
    portion: '110g',
    description: 'Soft cottage cheese tossed with bell peppers, garlic & chilli sauce.',
  },
  {
    id: 'st-paneer-65',
    name: 'Hyderabadi Paneer 65 / Tikka',
    category: 'starters',
    foodType: 'veg',
    priceInrPerGuest: 85,
    portion: '110g',
    description: 'Spiced curry-leaf tempered Paneer 65 or chargrilled Paneer Tikka.',
    popular: true,
  },
  {
    id: 'st-chicken-65',
    name: 'Hyderabadi Chicken 65',
    category: 'starters',
    foodType: 'non-veg',
    priceInrPerGuest: 95,
    portion: '120g',
    description: 'Crispy boneless chicken tossed with yogurt, curry leaves & green chillies.',
    popular: true,
  },
  {
    id: 'st-pepper-chicken',
    name: 'Black Pepper Roast Chicken',
    category: 'starters',
    foodType: 'non-veg',
    priceInrPerGuest: 105,
    portion: '120g',
    description: 'Juicy pan-roasted chicken finished with crushed Tellicherry pepper.',
  },
  {
    id: 'st-chicken-tikka',
    name: 'Tandoori Chicken Tikka',
    category: 'starters',
    foodType: 'non-veg',
    priceInrPerGuest: 115,
    portion: '3 pcs',
    description: 'Smoky clay-oven chicken skewers served with mint chutney.',
  },
  {
    id: 'st-apollo-fish',
    name: 'Hyderabadi Apollo Fish',
    category: 'starters',
    foodType: 'non-veg',
    priceInrPerGuest: 125,
    portion: '110g',
    description: 'Boneless spiced fish strips tempered with garlic and curry leaves.',
  },

  // 3. Biryani & Rice
  {
    id: 'br-veg-dum-biryani',
    name: 'Hyderabadi Veg Dum Biryani',
    category: 'biryani-rice',
    foodType: 'veg',
    priceInrPerGuest: 75,
    portion: '250g',
    description: 'Fragrant saffron basmati slow-cooked with spiced garden vegetables.',
    popular: true,
  },
  {
    id: 'br-paneer-biryani',
    name: 'Paneer Dum Biryani',
    category: 'biryani-rice',
    foodType: 'veg',
    priceInrPerGuest: 115,
    portion: '280g',
    description: 'Rich marinated paneer cubes layered with aromatic dum basmati.',
  },
  {
    id: 'br-kaju-pulao',
    name: 'Kaju & Veg Pulao',
    category: 'biryani-rice',
    foodType: 'veg',
    priceInrPerGuest: 85,
    portion: '240g',
    description: 'Ghee-roasted cashews, whole spices & long-grain basmati pulao.',
  },
  {
    id: 'br-jeera-rice',
    name: 'Jeera / Ghee Rice',
    category: 'biryani-rice',
    foodType: 'veg',
    priceInrPerGuest: 70,
    portion: '220g',
    description: 'Light cumin & pure ghee tempered basmati rice.',
  },
  {
    id: 'br-chicken-dum-biryani',
    name: 'Hyderabadi Chicken Dum Biryani',
    category: 'biryani-rice',
    foodType: 'non-veg',
    priceInrPerGuest: 135,
    portion: '300g',
    description: 'Authentic kacchi-style Hyderabadi chicken biryani with fried onions & saffron.',
    popular: true,
  },
  {
    id: 'br-mutton-dum-biryani',
    name: 'Hyderabadi Mutton Dum Biryani',
    category: 'biryani-rice',
    foodType: 'non-veg',
    priceInrPerGuest: 195,
    portion: '300g',
    description: 'Tender slow-braised goat pieces layered with aromatic saffron rice.',
  },
  {
    id: 'br-veg-fried-rice',
    name: 'Veg Fried Rice',
    category: 'biryani-rice',
    foodType: 'veg',
    priceInrPerGuest: 80,
    portion: '240g',
    description: 'Wok-tossed basmati rice with crisp vegetables & spring onions.',
  },

  // 4. Curries, Gravies & Dal
  {
    id: 'cu-dal-makhani',
    name: 'Slow-Simmered Dal Makhani',
    category: 'curries-dal',
    foodType: 'veg',
    priceInrPerGuest: 65,
    portion: '150g',
    description: 'Creamy black lentils cooked overnight with butter and tomatoes.',
    popular: true,
  },
  {
    id: 'cu-dal-tadka',
    name: 'Yellow Dal Tadka',
    category: 'curries-dal',
    foodType: 'veg',
    priceInrPerGuest: 50,
    portion: '150g',
    description: 'Comforting yellow lentils finished with garlic & ghee tadka.',
  },
  {
    id: 'cu-paneer-butter-masala',
    name: 'Paneer Butter Masala',
    category: 'curries-dal',
    foodType: 'veg',
    priceInrPerGuest: 95,
    portion: '150g',
    description: 'Velvety tomato-cashew makhani gravy with soft paneer cubes.',
    popular: true,
  },
  {
    id: 'cu-kadai-veg',
    name: 'Kadai Mixed Veg Curry',
    category: 'curries-dal',
    foodType: 'veg',
    priceInrPerGuest: 75,
    portion: '150g',
    description: 'Seasonal vegetables simmered with freshly pounded kadai spices.',
  },
  {
    id: 'cu-butter-chicken',
    name: 'Classic Butter Chicken',
    category: 'curries-dal',
    foodType: 'non-veg',
    priceInrPerGuest: 120,
    portion: '160g',
    description: 'Chargrilled chicken tikka folded into rich spiced tomato-butter sauce.',
    popular: true,
  },
  {
    id: 'cu-telangana-chicken',
    name: 'Telangana / Home-Style Chicken Curry',
    category: 'curries-dal',
    foodType: 'non-veg',
    priceInrPerGuest: 115,
    portion: '160g',
    description: 'Aromatic Hyderabadi spiced chicken gravy ideal with biryani or parotta.',
  },
  {
    id: 'cu-mutton-curry',
    name: 'Mutton Rogan Josh / Gongura Mutton',
    category: 'curries-dal',
    foodType: 'non-veg',
    priceInrPerGuest: 175,
    portion: '160g',
    description: 'Rich festive slow-cooked mutton curry.',
  },

  // 5. Breads
  {
    id: 'bd-butter-naan',
    name: 'Butter Naan',
    category: 'breads',
    foodType: 'veg',
    priceInrPerGuest: 35,
    portion: '1 pc',
    description: 'Soft tandoor-baked flatbread brushed with melted butter.',
    popular: true,
  },
  {
    id: 'bd-garlic-naan',
    name: 'Garlic Butter Naan',
    category: 'breads',
    foodType: 'veg',
    priceInrPerGuest: 40,
    portion: '1 pc',
    description: 'Fluffy tandoor naan topped with roasted garlic & fresh coriander.',
  },
  {
    id: 'bd-rumali-roti',
    name: 'Rumali Roti',
    category: 'breads',
    foodType: 'veg',
    priceInrPerGuest: 25,
    portion: '1 pc',
    description: 'Paper-thin, soft folded flatbread.',
  },
  {
    id: 'bd-malabar-parotta',
    name: 'Flaky Malabar Parotta',
    category: 'breads',
    foodType: 'veg',
    priceInrPerGuest: 35,
    portion: '1 pc',
    description: 'Crisp layered South Indian Christmas favorite.',
  },

  // 6. Soups & Chinese
  {
    id: 'sc-tomato-soup',
    name: 'Cream of Tomato & Basil Soup',
    category: 'soups-chinese',
    foodType: 'veg',
    priceInrPerGuest: 45,
    portion: '180ml',
    description: 'Warm festive roasted tomato soup with herb croutons.',
  },
  {
    id: 'sc-sweet-corn-soup',
    name: 'Veg Sweet Corn Soup',
    category: 'soups-chinese',
    foodType: 'veg',
    priceInrPerGuest: 45,
    portion: '180ml',
    description: 'Silky sweet corn & minced vegetable soup.',
  },
  {
    id: 'sc-chicken-manchow',
    name: 'Chicken Manchow Soup',
    category: 'soups-chinese',
    foodType: 'non-veg',
    priceInrPerGuest: 60,
    portion: '180ml',
    description: 'Spiced garlic chicken broth topped with crispy noodles.',
  },
  {
    id: 'sc-veg-noodles',
    name: 'Veg Hakka Noodles',
    category: 'soups-chinese',
    foodType: 'veg',
    priceInrPerGuest: 70,
    portion: '180g',
    description: 'Stir-fried noodles with shredded cabbage, carrots & bell peppers.',
  },
  {
    id: 'sc-chicken-noodles',
    name: 'Chicken Schezwan Noodles',
    category: 'soups-chinese',
    foodType: 'non-veg',
    priceInrPerGuest: 95,
    portion: '180g',
    description: 'Bold wok-tossed chicken noodles with house Schezwan sauce.',
  },

  // 7. Sweets & Desserts
  {
    id: 'ds-gulab-jamun',
    name: 'Warm Gulab Jamun',
    category: 'desserts',
    foodType: 'veg',
    priceInrPerGuest: 35,
    portion: '2 pcs',
    description: 'Soft khoya dumplings steeped in cardamom rose syrup.',
  },
  {
    id: 'ds-double-ka-meetha',
    name: 'Hyderabadi Double Ka Meetha',
    category: 'desserts',
    foodType: 'veg',
    priceInrPerGuest: 55,
    portion: '100g',
    description: 'Classic saffron bread pudding enriched with rabri & pistachios.',
    popular: true,
  },
  {
    id: 'ds-fudge-brownie',
    name: 'Warm Chocolate Fudge Brownie',
    category: 'desserts',
    foodType: 'veg',
    priceInrPerGuest: 65,
    portion: '85g',
    description: 'Rich dark chocolate walnut brownie square.',
  },
  {
    id: 'ds-caramel-custard',
    name: 'Classic Caramel Custard',
    category: 'desserts',
    foodType: 'veg',
    priceInrPerGuest: 55,
    portion: '100g',
    description: 'Silky baked vanilla custard glazed with golden caramel.',
  },
  {
    id: 'ds-apricot-delight',
    name: 'Hyderabadi Apricot Delight',
    category: 'desserts',
    foodType: 'veg',
    priceInrPerGuest: 75,
    portion: '110g',
    description: 'Stewed Hunza apricots layered with whipped cream & custard.',
  },

  // 8. Beverages & Sides
  {
    id: 'bv-christmas-punch',
    name: 'Spiced Christmas Berry Punch',
    category: 'beverages-sides',
    foodType: 'veg',
    priceInrPerGuest: 55,
    portion: '200ml',
    description: 'Festive non-alcoholic cranberry, orange, cinnamon & mint cooler.',
    popular: true,
  },
  {
    id: 'bv-mint-mojito',
    name: 'Fresh Mint Lime Mojito',
    category: 'beverages-sides',
    foodType: 'veg',
    priceInrPerGuest: 50,
    portion: '200ml',
    description: 'Chilled sparkling mint & lime party refresher.',
  },
  {
    id: 'bv-raita-salan',
    name: 'Mirchi Ka Salan & Boondi Raita',
    category: 'beverages-sides',
    foodType: 'veg',
    priceInrPerGuest: 30,
    portion: '120g',
    description: 'Essential Hyderabadi biryani accompaniments.',
  },
  {
    id: 'bv-salad-papad',
    name: 'Fresh Garden Salad & Papad',
    category: 'beverages-sides',
    foodType: 'veg',
    priceInrPerGuest: 25,
    portion: '80g',
    description: 'Crisp cucumber, carrot, onion wedges, lemon & roasted papad.',
  },
];

export const CHRISTMAS_PLATTER_PRESETS: ChristmasPlatterPreset[] = [
  {
    id: 'christmas-veg',
    title: 'Christmas Veg',
    subtitle: 'Curated vegetarian Christmas lunch & dinner feast',
    foodBadge: 'veg',
    defaultDishIds: [
      'sc-tomato-soup',
      'st-paneer-65',
      'br-veg-dum-biryani',
      'cu-paneer-butter-masala',
      'bd-butter-naan',
      'xmas-plum-cake-slice',
    ],
  },
  {
    id: 'christmas-non-veg',
    title: 'Christmas Non-Veg',
    subtitle: 'Signature roasts, Hyderabadi biryani & festive spread',
    foodBadge: 'non-veg',
    defaultDishIds: [
      'xmas-roast-chicken',
      'st-chicken-65',
      'br-chicken-dum-biryani',
      'cu-butter-chicken',
      'bd-garlic-naan',
      'bv-raita-salan',
      'xmas-plum-cake-slice',
    ],
  },
  {
    id: 'cocktail-snacks',
    title: 'Cocktail Snacks',
    subtitle: 'Party starters, kebabs, finger foods & festive drinks',
    foodBadge: 'cocktail',
    defaultDishIds: [
      'st-crispy-corn',
      'st-cheese-balls',
      'st-paneer-65',
      'st-chicken-65',
      'st-chicken-tikka',
      'st-apollo-fish',
      'bv-christmas-punch',
    ],
  },
];

export const BUILT_IN_CHRISTMAS_DISH_IDS = new Set(
  CHRISTMAS_CUSTOM_DISHES.map((d) => d.id)
);

export function getDefaultPresetsForDish(dishId: string): ChristmasPresetId[] {
  const result: ChristmasPresetId[] = [];
  for (const preset of CHRISTMAS_PLATTER_PRESETS) {
    if (preset.defaultDishIds.includes(dishId)) {
      result.push(preset.id);
    }
  }
  return result;
}

/**
 * Merges the built-in starter dishes with live Cloud Firestore overrides,
 * newly created admin dishes, preset assignments, and soft-hidden built-in defaults.
 */
export function mergeChristmasDishes(cloudDishes: CustomMenuDish[]): {
  activeDishes: CustomMenuDish[];
  hiddenBuiltInDishes: CustomMenuDish[];
} {
  const cloudById = new Map<string, CustomMenuDish>();
  for (const dish of cloudDishes) {
    cloudById.set(dish.id, { ...dish, isCloudSaved: true });
  }

  const activeDishes: CustomMenuDish[] = [];
  const hiddenBuiltInDishes: CustomMenuDish[] = [];

  // 1. Custom dishes created by Admin (not in built-in starter IDs) appear first so new additions are immediately visible
  const customCloudDishes = cloudDishes
    .filter((d) => !BUILT_IN_CHRISTMAS_DISH_IDS.has(d.id) && d.active !== false)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));

  for (const dish of customCloudDishes) {
    activeDishes.push({
      ...dish,
      presets: dish.presets ?? [],
      isCloudSaved: true,
    });
  }

  // 2. Built-in starter dishes overlaid with any Cloud edits or soft-deletes
  for (const builtIn of CHRISTMAS_CUSTOM_DISHES) {
    const defaultPresets = getDefaultPresetsForDish(builtIn.id);
    const override = cloudById.get(builtIn.id);
    if (override) {
      const resolvedPresets =
        override.presets !== undefined ? override.presets : defaultPresets;
      if (override.active === false) {
        hiddenBuiltInDishes.push({ ...override, presets: resolvedPresets });
      } else {
        activeDishes.push({ ...override, presets: resolvedPresets });
      }
    } else {
      activeDishes.push({ ...builtIn, presets: defaultPresets });
    }
  }

  return { activeDishes, hiddenBuiltInDishes };
}

