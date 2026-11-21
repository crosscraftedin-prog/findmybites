import { useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import {
  CHRISTMAS_BOOKING_PHONE_DISPLAY,
  CHRISTMAS_BOOKING_WHATSAPP,
  CHRISTMAS_CUSTOM_DISHES,
  CHRISTMAS_PLATTER_PRESETS,
  CUSTOM_MENU_CATEGORIES,
  ChristmasMealType,
  CustomMenuCategoryId,
  CustomMenuDish,
  HYDERABAD_LOCALITIES,
  MIN_CHRISTMAS_GUESTS,
} from '../data/christmasMenu';
import { FoodTypeIcon } from './FoodTypeBadge';

interface ChristmasCustomMenuBuilderProps {
  dishes?: CustomMenuDish[];
  onOrderSent?: (summary: string) => void;
}

const QUICK_GUEST_COUNTS = [10, 15, 25, 40, 60, 100] as const;

const QUICK_DATES = [
  { value: '2026-12-24', label: 'Dec 24 (Eve)' },
  { value: '2026-12-25', label: 'Dec 25 (Christmas)' },
  { value: '2026-12-26', label: 'Dec 26' },
  { value: '2026-12-31', label: 'Dec 31 (NYE)' },
] as const;

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function ChristmasCustomMenuBuilder({
  dishes,
  onOrderSent,
}: ChristmasCustomMenuBuilderProps) {
  const catalogDishes = useMemo(
    () => (dishes && dishes.length > 0 ? dishes : CHRISTMAS_CUSTOM_DISHES),
    [dishes]
  );

  const [mealType, setMealType] = useState<ChristmasMealType>('Christmas Dinner');
  const [eventDate, setEventDate] = useState('2026-12-25');
  const [guests, setGuests] = useState<number>(15);
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [activeCategory, setActiveCategory] = useState<CustomMenuCategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pre-seed a balanced starter menu so customers immediately see live pricing math
  const [selectedIds, setSelectedIds] = useState<string[]>([
    'xmas-roast-chicken',
    'st-paneer-65',
    'br-chicken-dum-biryani',
    'cu-paneer-butter-masala',
    'bd-butter-naan',
    'xmas-plum-cake-slice',
  ]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [customDishRequest, setCustomDishRequest] = useState('');

  // Customer delivery details (Hyderabad)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [locality, setLocality] = useState<string>(HYDERABAD_LOCALITIES[0]);
  const [servingStyle, setServingStyle] = useState<'Platter Boxes (Ready to Serve)' | 'Buffet Setup with Chafing Dishes'>(
    'Platter Boxes (Ready to Serve)'
  );
  const [specialNotes, setSpecialNotes] = useState('');
  const [formHint, setFormHint] = useState<string | null>(null);

  const dishesById = useMemo(() => {
    const map = new Map<string, CustomMenuDish>();
    for (const d of catalogDishes) map.set(d.id, d);
    return map;
  }, [catalogDishes]);

  const selectedDishes = useMemo(
    () =>
      selectedIds
        .map((id) => dishesById.get(id))
        .filter((d): d is CustomMenuDish => Boolean(d)),
    [selectedIds, dishesById]
  );

  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogDishes.filter((dish) => {
      if (foodFilter !== 'all' && dish.foodType !== foodFilter) return false;
      if (activeCategory !== 'all' && dish.category !== activeCategory) return false;
      if (q) {
        const hay = `${dish.name} ${dish.description} ${dish.portion}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogDishes, foodFilter, activeCategory, searchQuery]);

  const selectedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const dish of selectedDishes) {
      counts[dish.category] = (counts[dish.category] || 0) + 1;
    }
    return counts;
  }, [selectedDishes]);

  const perPlateInr = useMemo(
    () => selectedDishes.reduce((sum, d) => sum + d.priceInrPerGuest, 0),
    [selectedDishes]
  );
  const effectiveGuests = Math.max(MIN_CHRISTMAS_GUESTS, guests || MIN_CHRISTMAS_GUESTS);
  const totalInr = perPlateInr * effectiveGuests;
  const vegSelectedCount = selectedDishes.filter((d) => d.foodType === 'veg').length;
  const nonVegSelectedCount = selectedDishes.filter((d) => d.foodType === 'non-veg').length;

  const toggleDish = (dishId: string) => {
    setActivePresetId(null);
    setFormHint(null);
    setSelectedIds((prev) =>
      prev.includes(dishId) ? prev.filter((id) => id !== dishId) : [...prev, dishId]
    );
  };

  const applyPreset = (presetId: string, dishIds: string[]) => {
    setSelectedIds(dishIds.filter((id) => dishesById.has(id)));
    setActivePresetId(presetId);
    setFoodFilter('all');
    setActiveCategory('all');
    setFormHint(null);
  };

  const updateGuests = (next: number) => {
    const clamped = Math.max(MIN_CHRISTMAS_GUESTS, Math.min(2000, Math.round(next || MIN_CHRISTMAS_GUESTS)));
    setGuests(clamped);
  };

  const canSubmitOrder = selectedDishes.length > 0 || customDishRequest.trim().length > 0;

  const whatsappOrderUrl = useMemo(() => {
    const groupedLines: string[] = [];
    for (const cat of CUSTOM_MENU_CATEGORIES) {
      const catDishes = selectedDishes.filter((d) => d.category === cat.id);
      if (catDishes.length === 0) continue;
      groupedLines.push(`*${cat.label}:*`);
      for (const dish of catDishes) {
        const typeLabel = dish.foodType === 'veg' ? 'Veg' : 'Non-Veg';
        groupedLines.push(
          `  • ${dish.name} [${typeLabel}] (${dish.portion}) — ${formatInr(dish.priceInrPerGuest)}/guest`
        );
      }
    }

    const message = [
      `Hi FindMyBites Hyderabad! I'd like to book a Custom ${mealType} Menu:`,
      '',
      `Meal: ${mealType}`,
      `Date: ${eventDate}`,
      `Guests: ${effectiveGuests} pax`,
      `Serving Style: ${servingStyle}`,
      `Hyderabad Delivery Area: ${locality}, Hyderabad`,
      customerName.trim() ? `Name: ${customerName.trim()}` : '',
      customerPhone.trim() ? `Phone: ${customerPhone.trim()}` : '',
      '',
      `*Selected Custom Menu (${selectedDishes.length} dishes — ${vegSelectedCount} Veg, ${nonVegSelectedCount} Non-Veg):*`,
      ...groupedLines,
      customDishRequest.trim() ? `\n*Extra Custom Dish Request:* ${customDishRequest.trim()}` : '',
      '',
      `Estimated Per Plate: ${formatInr(perPlateInr)} / guest`,
      `Estimated Total (${effectiveGuests} guests): ${formatInr(totalInr)}`,
      specialNotes.trim() ? `Notes: ${specialNotes.trim()}` : '',
      '',
      'Please confirm availability and final quote for our Hyderabad Christmas order!',
    ]
      .filter((line) => line !== '')
      .join('\n');

    return `https://wa.me/${CHRISTMAS_BOOKING_WHATSAPP}?text=${encodeURIComponent(message)}`;
  }, [
    selectedDishes,
    mealType,
    eventDate,
    effectiveGuests,
    servingStyle,
    locality,
    customerName,
    customerPhone,
    vegSelectedCount,
    nonVegSelectedCount,
    customDishRequest,
    perPlateInr,
    totalInr,
    specialNotes,
  ]);

  return (
    <div className="mt-7 rounded-2xl border border-white/15 bg-card text-foreground shadow-2xl">
      {/* Top Header & Hyderabad Exclusive Notice */}
      <div className="border-b border-border px-5 py-5 sm:px-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Hyderabad Exclusive</span>
              <span aria-hidden="true">·</span>
              <span>Starts from {MIN_CHRISTMAS_GUESTS} Guests</span>
              <span aria-hidden="true">·</span>
              <span>Booking Desk {CHRISTMAS_BOOKING_PHONE_DISPLAY}</span>
            </p>
            <h3 className="mt-1.5 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              Build Your Own Christmas Lunch &amp; Dinner Menu
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick every starter, roast, biryani, curry, bread &amp; dessert dish-by-dish with
              transparent per-guest pricing, then confirm your Hyderabad order directly on WhatsApp.
            </p>
          </div>

          {/* Meal Slot Segmented Control */}
          <div
            className="inline-flex shrink-0 self-start rounded-xl border border-border bg-muted/60 p-1 lg:self-auto"
            role="group"
            aria-label="Choose Christmas meal slot"
          >
            {(['Christmas Lunch', 'Christmas Dinner'] as const).map((slot) => {
              const active = mealType === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setMealType(slot)}
                  className={`cursor-pointer rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-foreground text-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Date & Guest Count Bar */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 lg:grid-cols-12">
          {/* Guest Count Selector (Starts at 10) */}
          <div className="lg:col-span-6">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Users className="size-3.5 text-brand" aria-hidden="true" />
              Number of Guests (Minimum {MIN_CHRISTMAS_GUESTS})
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-border bg-background">
                <button
                  type="button"
                  aria-label="Decrease guests"
                  onClick={() => updateGuests(effectiveGuests - 5)}
                  disabled={effectiveGuests <= MIN_CHRISTMAS_GUESTS}
                  className="grid size-9 cursor-pointer place-items-center text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-3.5" aria-hidden="true" />
                </button>
                <input
                  type="number"
                  min={MIN_CHRISTMAS_GUESTS}
                  max={2000}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  onBlur={() => updateGuests(guests)}
                  aria-label="Guest count"
                  className="w-16 bg-transparent text-center font-mono text-sm font-bold tabular-nums text-foreground focus:outline-none"
                />
                <button
                  type="button"
                  aria-label="Increase guests"
                  onClick={() => updateGuests(effectiveGuests + 5)}
                  className="grid size-9 cursor-pointer place-items-center text-foreground hover:bg-accent"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_GUEST_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setGuests(count)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1.5 font-mono text-xs font-bold tabular-nums transition-colors ${
                      effectiveGuests === count
                        ? 'border-brand bg-brand text-brand-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date Selector */}
          <div className="lg:col-span-6">
            <label className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Calendar className="size-3.5 text-brand" aria-hidden="true" />
              Celebration Date
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {QUICK_DATES.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setEventDate(d.value)}
                  className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    eventDate === d.value
                      ? 'border-brand bg-brand text-brand-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.label}
                </button>
              ))}
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                aria-label="Custom celebration date"
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 1-Click Pre-Set Christmas Feast Templates */}
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-bold text-muted-foreground">
            Quick-Start Feast Presets (tap any preset to load, then customize any dish):
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {CHRISTMAS_PLATTER_PRESETS.map((preset) => {
              const presetPerPlate = preset.dishIds.reduce(
                (sum, id) => sum + (dishesById.get(id)?.priceInrPerGuest ?? 0),
                0
              );
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id, preset.dishIds)}
                  className={`flex cursor-pointer flex-col items-start rounded-xl border p-3 text-left transition-colors ${
                    isActive
                      ? 'border-brand bg-brand-soft/60'
                      : 'border-border bg-background hover:border-brand/50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                      {preset.foodBadge === 'veg' && <FoodTypeIcon foodType="veg" size="xs" />}
                      {preset.foodBadge === 'non-veg' && (
                        <FoodTypeIcon foodType="non-veg" size="xs" />
                      )}
                      {preset.foodBadge === 'mixed' && (
                        <>
                          <FoodTypeIcon foodType="veg" size="xs" />
                          <FoodTypeIcon foodType="non-veg" size="xs" />
                        </>
                      )}
                      <span className="line-clamp-1">{preset.title}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs font-extrabold tabular-nums text-brand">
                      {formatInr(presetPerPlate)}/p
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground">{preset.subtitle}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main 2-Column Custom Menu Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT COLUMN: Dish Browser & Category Tabs */}
        <div className="border-b border-border p-5 sm:p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
          {/* Dietary Filter + Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1"
              role="group"
              aria-label="Filter dishes by Veg or Non-Veg"
            >
              <button
                type="button"
                onClick={() => setFoodFilter('all')}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  foodFilter === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({catalogDishes.length})
              </button>
              <button
                type="button"
                onClick={() => setFoodFilter('veg')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  foodFilter === 'veg'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
                }`}
              >
                <FoodTypeIcon foodType="veg" size="xs" />
                Veg Only
              </button>
              <button
                type="button"
                onClick={() => setFoodFilter('non-veg')}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                  foodFilter === 'non-veg'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40'
                }`}
              >
                <FoodTypeIcon foodType="non-veg" size="xs" />
                Non-Veg
              </button>
            </div>

            <div className="relative sm:w-56">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search biryani, roast, cake..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-4">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                activeCategory === 'all'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              All Courses
            </button>
            {CUSTOM_MENU_CATEGORIES.map((cat) => {
              const count = selectedCountByCategory[cat.id] || 0;
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-brand bg-brand text-brand-foreground'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat.label}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          {/* Dish List */}
          {filteredDishes.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm font-semibold text-foreground">No dishes match this filter.</p>
              <button
                type="button"
                onClick={() => {
                  setFoodFilter('all');
                  setActiveCategory('all');
                  setSearchQuery('');
                }}
                className="mt-2 cursor-pointer text-xs font-bold text-brand hover:underline"
              >
                Show all Christmas dishes
              </button>
            </div>
          ) : (
            <div className="mt-4 grid max-h-[620px] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredDishes.map((dish) => {
                const isSelected = selectedIds.includes(dish.id);
                return (
                  <div
                    key={dish.id}
                    className={`flex flex-col justify-between overflow-hidden rounded-xl border transition-colors ${
                      isSelected
                        ? 'border-emerald-600/70 bg-emerald-500/5'
                        : 'border-border bg-background hover:border-foreground/25'
                    }`}
                  >
                    <div>
                      {dish.image && (
                        <div className="aspect-[4/3] w-full border-b border-border/70 bg-white p-1.5">
                          <img
                            src={dish.image}
                            alt={dish.name}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-contain object-center"
                          />
                        </div>
                      )}
                      <div className="p-3.5 pb-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5">
                              <FoodTypeIcon foodType={dish.foodType} size="sm" />
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold leading-snug text-foreground">
                                {dish.name}
                              </h4>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                {dish.portion}
                                {dish.popular ? ' · Popular pick' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                        {dish.description && (
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                            {dish.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/70 px-3.5 py-2.5">
                      <div>
                        <span className="font-mono text-sm font-extrabold tabular-nums text-foreground">
                          {formatInr(dish.priceInrPerGuest)}
                        </span>
                        <span className="text-[11px] text-muted-foreground"> / guest</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleDish(dish.id)}
                        className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'border-border bg-card text-foreground hover:border-brand hover:text-brand'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="size-3.5" aria-hidden="true" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="size-3.5" aria-hidden="true" />
                            Add
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom Extra Dish Request */}
          <div className="mt-4 border-t border-border pt-4">
            <label className="block text-xs font-bold text-foreground">
              Want a dish not listed above? Add your own request (optional)
            </label>
            <input
              type="text"
              value={customDishRequest}
              onChange={(e) => setCustomDishRequest(e.target.value)}
              maxLength={220}
              placeholder="e.g. Whole Roast Turkey, Eggless Rum Plum Cake, Haleem, Kids Mini Burgers..."
              className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Live Custom Plate Summary & Hyderabad Checkout */}
        <div className="flex flex-col justify-between bg-muted/25 p-5 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 text-base font-extrabold text-foreground">
                <UtensilsCrossed className="size-4 text-brand" aria-hidden="true" />
                Your Custom {mealType}
              </h4>
              {selectedDishes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds([]);
                    setActivePresetId(null);
                  }}
                  className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-rose-600"
                >
                  Clear all
                </button>
              )}
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              {selectedDishes.length} dishes selected · {vegSelectedCount} Veg ·{' '}
              {nonVegSelectedCount} Non-Veg · {effectiveGuests} Guests
            </p>

            {/* Selected Dishes List */}
            {selectedDishes.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-6 text-center">
                <Sparkles className="mx-auto size-5 text-brand" aria-hidden="true" />
                <p className="mt-2 text-xs font-semibold text-foreground">
                  Your plate is empty — add dishes from the left or choose a quick preset above.
                </p>
              </div>
            ) : (
              <div className="mt-3 max-h-56 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-background px-3">
                {selectedDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FoodTypeIcon foodType={dish.foodType} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{dish.name}</p>
                        <p className="text-[11px] text-muted-foreground">{dish.portion}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono font-bold tabular-nums text-foreground">
                        {formatInr(dish.priceInrPerGuest)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove ${dish.name}`}
                        onClick={() => toggleDish(dish.id)}
                        className="grid size-6 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transparent Price Breakdown */}
            <div className="mt-4 rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Cost per plate ({selectedDishes.length} dishes)</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  {formatInr(perPlateInr)} / guest
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
                <span>Guest count</span>
                <span className="font-mono font-bold tabular-nums text-foreground">
                  × {effectiveGuests} guests
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                <div>
                  <p className="text-xs font-bold text-foreground">Estimated Total</p>
                  <p className="text-[11px] text-muted-foreground">
                    Hyderabad delivery · Final quote confirmed on WhatsApp
                  </p>
                </div>
                <span className="font-mono text-2xl font-extrabold tabular-nums text-foreground">
                  {formatInr(totalInr)}
                </span>
              </div>
            </div>

            {/* Hyderabad Delivery & Contact Details */}
            <div className="mt-4 space-y-2.5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Mobile / WhatsApp No."
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  aria-label="Hyderabad Delivery Area"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                >
                  {HYDERABAD_LOCALITIES.map((area) => (
                    <option key={area} value={area}>
                      {area}, Hyderabad
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Serving style"
                  value={servingStyle}
                  onChange={(e) =>
                    setServingStyle(
                      e.target.value as
                        | 'Platter Boxes (Ready to Serve)'
                        | 'Buffet Setup with Chafing Dishes'
                    )
                  }
                  className="rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                >
                  <option value="Platter Boxes (Ready to Serve)">
                    Platter Boxes (Ready to Serve)
                  </option>
                  <option value="Buffet Setup with Chafing Dishes">
                    Buffet Setup with Chafing Dishes
                  </option>
                </select>
              </div>

              <input
                type="text"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Notes (spice level, eggless cake, exact delivery time...)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
              />
            </div>

            {formHint && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{formHint}</p>
            )}
          </div>

          {/* Primary WhatsApp Order Button */}
          <div className="mt-5">
            {canSubmitOrder ? (
              <a
                href={whatsappOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setFormHint(null);
                  onOrderSent?.(
                    `Custom ${mealType} order (${selectedDishes.length} dishes · ${effectiveGuests} guests) opened on WhatsApp!`
                  );
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-[#1ebe5d]"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                Order Custom Menu on WhatsApp
              </a>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setFormHint(
                    'Please add at least 1 dish from the menu (or type a custom dish request) to place your order.'
                  )
                }
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#25D366]/60 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-colors hover:bg-[#25D366]/75"
              >
                <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                Order Custom Menu on WhatsApp
              </button>
            )}
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Sends your full dish list directly to Hyderabad Booking Desk ({CHRISTMAS_BOOKING_PHONE_DISPLAY}) · 0% platform fee
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
