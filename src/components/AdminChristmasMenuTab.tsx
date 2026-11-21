import { FormEvent, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Check,
  Edit3,
  ImagePlus,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UtensilsCrossed,
  Wine,
  X,
} from 'lucide-react';
import {
  BUILT_IN_CHRISTMAS_DISH_IDS,
  CHRISTMAS_BOOKING_PHONE_DISPLAY,
  CHRISTMAS_PLATTER_PRESETS,
  CUSTOM_MENU_CATEGORIES,
  ChristmasPresetId,
  CustomMenuCategoryId,
  CustomMenuDish,
  MIN_CHRISTMAS_GUESTS,
  mergeChristmasDishes,
} from '../data/christmasMenu';
import type { ProductFoodType } from '../data/vendors';
import {
  adminDeleteChristmasDish,
  adminRestoreChristmasDish,
  adminSaveChristmasDish,
} from '../services/firestoreService';
import { compressImageFile } from '../utils/imageUpload';
import { FoodTypeIcon } from './FoodTypeBadge';

interface AdminChristmasMenuTabProps {
  adminUser: User;
  cloudChristmasDishes: CustomMenuDish[];
  onToast: (message: string) => void;
}

interface DishFormState {
  id: string | null;
  name: string;
  category: CustomMenuCategoryId;
  foodType: ProductFoodType;
  priceInrPerGuest: string;
  portion: string;
  description: string;
  image: string;
  popular: boolean;
  presets: ChristmasPresetId[];
}

const EMPTY_FORM: DishFormState = {
  id: null,
  name: '',
  category: 'christmas-specials',
  foodType: 'veg',
  priceInrPerGuest: '',
  portion: '150g',
  description: '',
  image: '',
  popular: false,
  presets: [],
};

export function AdminChristmasMenuTab({
  adminUser,
  cloudChristmasDishes,
  onToast,
}: AdminChristmasMenuTabProps) {
  const { activeDishes, hiddenBuiltInDishes } = useMemo(
    () => mergeChristmasDishes(cloudChristmasDishes),
    [cloudChristmasDishes]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<DishFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // List filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CustomMenuCategoryId | 'all'>('all');
  const [foodFilter, setFoodFilter] = useState<'all' | 'veg' | 'non-veg'>('all');
  const [presetFilter, setPresetFilter] = useState<ChristmasPresetId | 'all' | 'unassigned'>('all');
  const [onlyMissingPhoto, setOnlyMissingPhoto] = useState(false);
  const [showHiddenDrawer, setShowHiddenDrawer] = useState(false);
  const [togglingPresetKey, setTogglingPresetKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);

  const categoryLabelMap = useMemo(() => {
    const map = new Map<CustomMenuCategoryId, string>();
    for (const c of CUSTOM_MENU_CATEGORIES) map.set(c.id, c.label);
    return map;
  }, []);

  const presetCounts = useMemo(() => {
    const counts: Record<ChristmasPresetId, { count: number; perPlate: number }> = {
      'christmas-veg': { count: 0, perPlate: 0 },
      'christmas-non-veg': { count: 0, perPlate: 0 },
      'cocktail-snacks': { count: 0, perPlate: 0 },
    };
    for (const dish of activeDishes) {
      for (const pid of dish.presets ?? []) {
        if (counts[pid]) {
          counts[pid].count += 1;
          counts[pid].perPlate += dish.priceInrPerGuest;
        }
      }
    }
    return counts;
  }, [activeDishes]);

  const withPhotosCount = useMemo(
    () => activeDishes.filter((d) => Boolean(d.image)).length,
    [activeDishes]
  );

  const filteredDishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeDishes.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (foodFilter !== 'all' && d.foodType !== foodFilter) return false;
      if (presetFilter === 'unassigned') {
        if ((d.presets ?? []).length > 0) return false;
      } else if (presetFilter !== 'all') {
        if (!(d.presets ?? []).includes(presetFilter)) return false;
      }
      if (onlyMissingPhoto && Boolean(d.image)) return false;
      if (q) {
        const hay = `${d.name} ${d.description} ${d.portion} ${categoryLabelMap.get(d.category) ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    activeDishes,
    categoryFilter,
    foodFilter,
    presetFilter,
    onlyMissingPhoto,
    searchQuery,
    categoryLabelMap,
  ]);

  const startCreateNew = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
    setConfirmDeleteId(null);
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const startEditDish = (dish: CustomMenuDish) => {
    setForm({
      id: dish.id,
      name: dish.name,
      category: dish.category,
      foodType: dish.foodType,
      priceInrPerGuest: String(dish.priceInrPerGuest),
      portion: dish.portion,
      description: dish.description,
      image: dish.image ?? '',
      popular: Boolean(dish.popular),
      presets: [...(dish.presets ?? [])],
    });
    setFormError(null);
    setFormOpen(true);
    setConfirmDeleteId(null);
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const toggleFormPreset = (presetId: ChristmasPresetId) => {
    setForm((prev) => ({
      ...prev,
      presets: prev.presets.includes(presetId)
        ? prev.presets.filter((p) => p !== presetId)
        : [...prev.presets, presetId],
    }));
  };

  const handleQuickToggleDishPreset = async (
    dish: CustomMenuDish,
    presetId: ChristmasPresetId
  ) => {
    const current = dish.presets ?? [];
    const exists = current.includes(presetId);
    const nextPresets = exists
      ? current.filter((p) => p !== presetId)
      : [...current, presetId];

    const presetLabel =
      CHRISTMAS_PLATTER_PRESETS.find((p) => p.id === presetId)?.title ?? presetId;
    const key = `${dish.id}:${presetId}`;
    setTogglingPresetKey(key);
    try {
      await adminSaveChristmasDish(
        {
          ...dish,
          id: dish.id,
          presets: nextPresets,
          active: true,
        },
        adminUser.uid
      );
      onToast(
        exists
          ? `Removed "${dish.name}" from ${presetLabel}.`
          : `Sent "${dish.name}" to ${presetLabel}!`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not update menu preset.');
    } finally {
      setTogglingPresetKey(null);
    }
  };

  const handleImageFileChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid JPG, PNG, or WebP image file.');
      return;
    }
    setUploadingImage(true);
    setFormError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 640,
        maxHeight: 480,
        quality: 0.78,
        maxChars: 110000,
      });
      setForm((prev) => ({ ...prev, image: dataUrl }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveDish = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      setFormError('Dish name must be at least 2 characters.');
      return;
    }
    const parsedPrice = Math.round(Number(form.priceInrPerGuest));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 1 || parsedPrice > 50000) {
      setFormError('Please enter a valid per-guest price in ₹ (between ₹1 and ₹50,000).');
      return;
    }
    const trimmedPortion = form.portion.trim();
    if (!trimmedPortion) {
      setFormError('Please enter a portion size (e.g., 150g, 2 pcs, 200ml).');
      return;
    }

    setSaving(true);
    try {
      const saved = await adminSaveChristmasDish(
        {
          id: form.id ?? undefined,
          name: trimmedName,
          category: form.category,
          foodType: form.foodType,
          priceInrPerGuest: parsedPrice,
          portion: trimmedPortion,
          description: form.description.trim(),
          image: form.image.trim() || undefined,
          popular: form.popular,
          presets: form.presets,
          active: true,
        },
        adminUser.uid
      );
      onToast(
        form.id
          ? `Updated "${saved.name}" live on the Hyderabad Christmas menu!`
          : `Added "${saved.name}" live to the Hyderabad Christmas menu!`
      );
      setForm(EMPTY_FORM);
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save dish to Cloud Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDish = async (dish: CustomMenuDish) => {
    const isBuiltIn = BUILT_IN_CHRISTMAS_DISH_IDS.has(dish.id);
    setBusyId(dish.id);
    try {
      await adminDeleteChristmasDish(dish, adminUser.uid, isBuiltIn);
      if (form.id === dish.id) {
        setForm(EMPTY_FORM);
        setFormOpen(false);
      }
      setConfirmDeleteId(null);
      onToast(
        isBuiltIn
          ? `Removed "${dish.name}" from the live menu (you can restore it anytime below).`
          : `Permanently deleted "${dish.name}" from the Christmas menu.`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to delete dish.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestoreDish = async (dish: CustomMenuDish) => {
    setBusyId(dish.id);
    try {
      await adminRestoreChristmasDish(dish.id);
      onToast(`Restored "${dish.name}" back to the live Hyderabad Christmas menu!`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to restore dish.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & KPI Bar */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="size-4 text-brand" aria-hidden="true" />
            <h3 className="text-base font-extrabold text-foreground">
              Christmas Dinner &amp; Lunch Menu Manager (Hyderabad)
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Add, edit, delete, or upload 4:3 dish photos. Changes sync live to the Hyderabad custom
            menu builder (Min {MIN_CHRISTMAS_GUESTS} guests · WhatsApp{' '}
            {CHRISTMAS_BOOKING_PHONE_DISPLAY}).
          </p>
        </div>

        <button
          type="button"
          onClick={startCreateNew}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-extrabold text-brand-foreground shadow-sm transition-colors hover:bg-brand-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add New Dish
        </button>
      </div>

      {/* Quick Stats + Live Preset Menus Overview (Tap any card to filter its dishes) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CHRISTMAS_PLATTER_PRESETS.map((preset) => {
          const stats = presetCounts[preset.id];
          const isFiltered = presetFilter === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                setPresetFilter((curr) => (curr === preset.id ? 'all' : preset.id))
              }
              className={`flex cursor-pointer flex-col items-start rounded-xl border p-3.5 text-left transition-colors ${
                isFiltered
                  ? 'border-brand bg-brand-soft/60 shadow-xs'
                  : 'border-border bg-card hover:border-brand/50'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-foreground">
                  {preset.foodBadge === 'veg' && <FoodTypeIcon foodType="veg" size="xs" />}
                  {preset.foodBadge === 'non-veg' && <FoodTypeIcon foodType="non-veg" size="xs" />}
                  {preset.foodBadge === 'cocktail' && (
                    <Wine className="size-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  )}
                  {preset.title}
                </span>
                <span className="font-mono text-xs font-extrabold tabular-nums text-brand">
                  ₹{stats.perPlate}/p
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground">{stats.count} dishes assigned</span> ·{' '}
                {isFiltered ? 'Showing assigned dishes (tap to clear)' : 'Tap to view dishes'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>
          <strong className="font-mono text-foreground">{activeDishes.length}</strong> live dishes
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-emerald-600 dark:text-emerald-400">{withPhotosCount}</strong>{' '}
          with 4:3 photos
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="font-mono text-foreground">{hiddenBuiltInDishes.length}</strong> removed
          defaults
        </span>
      </div>

      {/* Add / Edit Dish Form */}
      <div ref={formTopRef}>
        {formOpen && (
          <form
            onSubmit={handleSaveDish}
            className="rounded-2xl border-2 border-brand/40 bg-card p-5 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-foreground">
                  {form.id ? `Edit Dish: ${form.name || 'Christmas Dish'}` : 'Add New Christmas Dish'}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Standard photo spec: 640×480 px (4:3 landscape), displayed completely without
                  cropping.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setForm(EMPTY_FORM);
                  setFormError(null);
                }}
                aria-label="Close dish form"
                className="grid size-8 cursor-pointer place-items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left Fields */}
              <div className="space-y-3 lg:col-span-7">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Dish Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Whole Roast Turkey, Hyderabadi Haleem, Plum Cake"
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Course / Category
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          category: e.target.value as CustomMenuCategoryId,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
                    >
                      {CUSTOM_MENU_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Dietary Type (Veg / Non-Veg)
                    </label>
                    <div className="mt-1 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, foodType: 'veg' }))}
                        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          form.foodType === 'veg'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-border bg-background text-foreground hover:border-emerald-500'
                        }`}
                      >
                        <FoodTypeIcon foodType="veg" size="xs" />
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, foodType: 'non-veg' }))}
                        className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                          form.foodType === 'non-veg'
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-border bg-background text-foreground hover:border-red-500'
                        }`}
                      >
                        <FoodTypeIcon foodType="non-veg" size="xs" />
                        Non-Veg
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Price per Guest (₹ INR) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50000}
                      value={form.priceInrPerGuest}
                      onChange={(e) => setForm((p) => ({ ...p, priceInrPerGuest: e.target.value }))}
                      placeholder="e.g. 145"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs font-bold text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Portion per Guest <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={60}
                      value={form.portion}
                      onChange={(e) => setForm((p) => ({ ...p, portion: e.target.value }))}
                      placeholder="e.g. 150g, 2 pcs, 200ml"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    maxLength={400}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Key ingredients, style, spice notes, or eggless option..."
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-brand focus:outline-none"
                  />
                </div>

                {/* Assign Dish to Quick-Start Menu Presets */}
                <div className="rounded-xl border border-border bg-muted/30 p-3">
                  <p className="text-xs font-bold text-foreground">
                    Send Dish to Quick-Start Menu Option(s)
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Choose which preset menu(s) include this dish when customers tap it.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHRISTMAS_PLATTER_PRESETS.map((preset) => {
                      const active = form.presets.includes(preset.id);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => toggleFormPreset(preset.id)}
                          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                            active
                              ? 'border-brand bg-brand text-brand-foreground shadow-xs'
                              : 'border-border bg-background text-foreground hover:border-brand/60'
                          }`}
                        >
                          {preset.foodBadge === 'veg' && <FoodTypeIcon foodType="veg" size="xs" />}
                          {preset.foodBadge === 'non-veg' && (
                            <FoodTypeIcon foodType="non-veg" size="xs" />
                          )}
                          {preset.foodBadge === 'cocktail' && (
                            <Wine className="size-3.5" aria-hidden="true" />
                          )}
                          <span>{preset.title}</span>
                          {active && <Check className="size-3.5" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={form.popular}
                    onChange={(e) => setForm((p) => ({ ...p, popular: e.target.checked }))}
                    className="size-4 rounded border-border accent-brand"
                  />
                  <Sparkles className="size-3.5 text-amber-500" aria-hidden="true" />
                  Highlight as &ldquo;Popular pick&rdquo; on customer menu
                </label>
              </div>

              {/* Right: Dish Image Upload & 4:3 Preview */}
              <div className="space-y-2.5 lg:col-span-5">
                <label className="block text-xs font-bold text-foreground">
                  Dish Photo (Optional · 640×480 / 4:3)
                </label>

                <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-1.5">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt={form.name || 'Dish preview'}
                      className="h-full w-full object-contain object-center"
                    />
                  ) : (
                    <div className="text-center text-neutral-400">
                      <ImagePlus className="mx-auto size-7 opacity-60" aria-hidden="true" />
                      <p className="mt-1 text-[11px] font-medium">No photo added yet</p>
                      <p className="text-[10px]">640×480 px · Displayed uncropped</p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleImageFileChange(file);
                    e.currentTarget.value = '';
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-foreground hover:border-brand disabled:opacity-50"
                  >
                    {uploadingImage ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="size-3.5" aria-hidden="true" />
                    )}
                    {uploadingImage ? 'Compressing...' : form.image ? 'Replace Photo' : 'Upload Photo'}
                  </button>

                  {form.image && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, image: '' }))}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  value={form.image.startsWith('data:image/') ? '' : form.image}
                  onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setForm(EMPTY_FORM);
                  setFormError(null);
                }}
                className="cursor-pointer rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-xs font-extrabold text-brand-foreground shadow-sm hover:bg-brand-hover disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Check className="size-3.5" aria-hidden="true" />
                )}
                {saving ? 'Saving to Cloud...' : form.id ? 'Save Dish Changes' : 'Add Dish to Live Menu'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-muted/30 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative min-w-[200px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dishes to edit, add photo, or delete..."
            className="w-full rounded-xl border border-border bg-background py-2 pl-8 pr-3 text-xs text-foreground focus:border-brand focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by course"
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as CustomMenuCategoryId | 'all')
            }
            className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
          >
            <option value="all">All Courses ({activeDishes.length})</option>
            {CUSTOM_MENU_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Quick-Start Preset"
            value={presetFilter}
            onChange={(e) =>
              setPresetFilter(e.target.value as ChristmasPresetId | 'all' | 'unassigned')
            }
            className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
          >
            <option value="all">All Presets</option>
            {CHRISTMAS_PLATTER_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                In {p.title} ({presetCounts[p.id].count})
              </option>
            ))}
            <option value="unassigned">Not in any preset</option>
          </select>

          <select
            aria-label="Filter by Veg or Non-Veg"
            value={foodFilter}
            onChange={(e) => setFoodFilter(e.target.value as 'all' | 'veg' | 'non-veg')}
            className="rounded-xl border border-border bg-background px-2.5 py-2 text-xs font-semibold text-foreground focus:border-brand focus:outline-none"
          >
            <option value="all">Veg &amp; Non-Veg</option>
            <option value="veg">Veg Only</option>
            <option value="non-veg">Non-Veg Only</option>
          </select>

          <button
            type="button"
            onClick={() => setOnlyMissingPhoto((v) => !v)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
              onlyMissingPhoto
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImagePlus className="size-3.5" aria-hidden="true" />
            Needs Photo
          </button>
        </div>
      </div>

      {/* Dishes Grid */}
      {filteredDishes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-bold text-foreground">No dishes match your filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setFoodFilter('all');
              setPresetFilter('all');
              setOnlyMissingPhoto(false);
            }}
            className="mt-2 cursor-pointer text-xs font-bold text-brand hover:underline"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDishes.map((dish) => {
            const isBuiltIn = BUILT_IN_CHRISTMAS_DISH_IDS.has(dish.id);
            const isBusy = busyId === dish.id;
            const confirmingDelete = confirmDeleteId === dish.id;

            return (
              <div
                key={dish.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-colors hover:border-brand/40"
              >
                {/* Dish Image (4:3 Uncropped) or Quick Add Photo Bar */}
                {dish.image ? (
                  <div className="relative aspect-[4/3] w-full border-b border-border bg-white p-1.5">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="h-full w-full object-contain object-center"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditDish(dish)}
                    className="flex h-20 w-full cursor-pointer items-center justify-center gap-1.5 border-b border-dashed border-border bg-muted/40 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                  >
                    <ImagePlus className="size-4" aria-hidden="true" />
                    Add 4:3 Dish Photo
                  </button>
                )}

                <div className="flex flex-1 flex-col p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span className="mt-0.5">
                        <FoodTypeIcon foodType={dish.foodType} size="sm" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="line-clamp-1 text-sm font-bold text-foreground">
                          {dish.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {categoryLabelMap.get(dish.category)} · {dish.portion}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-extrabold tabular-nums text-foreground">
                      ₹{dish.priceInrPerGuest}
                    </span>
                  </div>

                  {dish.description && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {dish.description}
                    </p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                    {!isBuiltIn && (
                      <span className="rounded bg-brand-soft px-1.5 py-0.5 text-brand">
                        Custom Dish
                      </span>
                    )}
                    {isBuiltIn && dish.isCloudSaved && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
                        Edited in Cloud
                      </span>
                    )}
                    {dish.popular && (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                        Popular Pick
                      </span>
                    )}
                  </div>

                  {/* Quick 1-Click Send to Christmas Veg / Christmas Non-Veg / Cocktail Snacks */}
                  <div className="mt-3 rounded-xl border border-border/80 bg-muted/30 p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      Send to Preset Menu:
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {CHRISTMAS_PLATTER_PRESETS.map((preset) => {
                        const assigned = (dish.presets ?? []).includes(preset.id);
                        const isToggling = togglingPresetKey === `${dish.id}:${preset.id}`;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            disabled={isToggling || isBusy}
                            onClick={() => void handleQuickToggleDishPreset(dish, preset.id)}
                            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold transition-colors disabled:opacity-60 ${
                              assigned
                                ? preset.id === 'christmas-veg'
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : preset.id === 'christmas-non-veg'
                                    ? 'border-red-600 bg-red-600 text-white'
                                    : 'border-amber-600 bg-amber-600 text-white'
                                : 'border-border bg-background text-muted-foreground hover:border-brand hover:text-foreground'
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="size-2.5 animate-spin" aria-hidden="true" />
                            ) : assigned ? (
                              <Check className="size-2.5" aria-hidden="true" />
                            ) : (
                              <Plus className="size-2.5" aria-hidden="true" />
                            )}
                            <span>{preset.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2 border-t border-border pt-3 mt-3">
                    {confirmingDelete ? (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleDeleteDish(dish)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="size-3.5" aria-hidden="true" />
                          )}
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="cursor-pointer rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-accent"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditDish(dish)}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-brand hover:text-brand"
                        >
                          <Edit3 className="size-3.5" aria-hidden="true" />
                          Edit / Photo
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setConfirmDeleteId(dish.id)}
                          aria-label={`Delete ${dish.name}`}
                          className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden Built-In Dishes Recovery Section */}
      {hiddenBuiltInDishes.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/25 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-extrabold text-foreground">
                Removed Starter Dishes ({hiddenBuiltInDishes.length})
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Hidden from customers. Restore any dish back to the live menu with one click.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHiddenDrawer((s) => !s)}
              className="cursor-pointer rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:border-brand"
            >
              {showHiddenDrawer ? 'Hide List' : 'View & Restore'}
            </button>
          </div>

          {showHiddenDrawer && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {hiddenBuiltInDishes.map((dish) => {
                const isBusy = busyId === dish.id;
                return (
                  <div
                    key={dish.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FoodTypeIcon foodType={dish.foodType} size="xs" />
                      <span className="truncate font-semibold text-foreground">{dish.name}</span>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleRestoreDish(dish)}
                      className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" aria-hidden="true" />
                      Restore
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
