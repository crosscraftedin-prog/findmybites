import { FormEvent, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Check,
  Edit3,
  ExternalLink,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BOXBITE_IMAGES,
  BUILT_IN_BOXBITE_BUILDER_ITEM_IDS,
  BUILT_IN_BOXBITE_PRODUCT_IDS,
  BoxBuilderItem,
  BoxBuilderItemGroup,
  CORPORATE_CATEGORIES,
  CorporateBoxProduct,
  CorporateCategoryId,
  CorporateDietaryType,
  CorporatePackTier,
  CorporateProductVariant,
  mergeBoxBiteBuilderItems,
  mergeBoxBiteProducts,
} from '../data/boxAndBiteCatalog';
import { formatInr } from '../data/boxAndBiteConfig';
import {
  adminDeleteBoxBiteBuilderItem,
  adminDeleteBoxBiteProduct,
  adminRestoreBoxBiteProduct,
  adminSaveBoxBiteBuilderItem,
  adminSaveBoxBiteProduct,
} from '../services/firestoreService';
import { compressImageFile } from '../utils/imageUpload';

interface AdminBoxBiteTabProps {
  cloudProducts: CorporateBoxProduct[];
  cloudBuilderItems: BoxBuilderItem[];
  onPreviewStorefront: () => void;
  onToast: (message: string) => void;
}

interface ProductFormState {
  id: string | null;
  sku: string;
  name: string;
  categoryId: CorporateCategoryId;
  dietary: CorporateDietaryType;
  dietaryBadgeText: string;
  subtitle: string;
  description: string;
  servingsInfo: string;
  netWeightOrCount: string;
  moqSingleSample: boolean;
  moqBulk: string;
  samplePriceInr: string;
  bulkStartingPriceInr: string;
  isDemoPrice: boolean;
  featured: boolean;
  image: string;
  gallery: string[];
  contentsText: string;
  tiers: CorporatePackTier[];
  variants: CorporateProductVariant[];
  logoBellySleeve: boolean;
  ribbonChoice: boolean;
  printedWelcomeCard: boolean;
  foilStampingMinQty: string;
  ingredientsPlaceholder: string;
  allergensPlaceholder: string;
  shelfLifeAndStorage: string;
  deliveryTimeline: string;
}

interface BuilderItemFormState {
  id: string | null;
  name: string;
  group: BoxBuilderItemGroup;
  portion: string;
  dietary: 'veg' | 'non-veg';
  priceInr: string;
  available: boolean;
  unavailableReason: string;
  note: string;
}

const DEFAULT_INGREDIENTS =
  'Sample kitchen ingredient declaration — update with confirmed batch ingredients (e.g. roasted nuts, flour, butter, cocoa solids, sugar, spices).';
const DEFAULT_ALLERGENS =
  'Prepared in a kitchen handling dairy, wheat/gluten, soy, peanuts, and tree nuts. Request batch-specific allergen sheet before dispatch.';
const DEFAULT_STORAGE =
  'Store dry confections & snacks in a cool, dry place below 24°C away from direct sunlight.';
const DEFAULT_DELIVERY =
  'Single samples dispatch in 2–4 business days. Branded bulk runs dispatch in 5–8 business days.';

const EMPTY_PRODUCT_FORM: ProductFormState = {
  id: null,
  sku: 'BB-CUS-01',
  name: '',
  categoryId: 'welcome-onboarding',
  dietary: 'veg',
  dietaryBadgeText: '100% Vegetarian',
  subtitle: '',
  description: '',
  servingsInfo: 'Curated for 1 recipient',
  netWeightOrCount: '450g net · 4 artisanal items',
  moqSingleSample: true,
  moqBulk: '10',
  samplePriceInr: '1250',
  bulkStartingPriceInr: '990',
  isDemoPrice: false,
  featured: true,
  image: BOXBITE_IMAGES.heroEditorial,
  gallery: [],
  contentsText:
    'Handcrafted Masala Chai Shortbread Cookies (100g)\nSlow-Roasted Himalayan Pink Salt Almonds (90g)\n70% Single-Origin Dark Chocolate Squares (6 pcs)\nCustom Printed Corporate Welcome Card (350 GSM)',
  tiers: [
    {
      id: 'sample',
      label: 'Single Sample Box',
      minQty: 1,
      maxQty: 1,
      unitPriceInr: 1250,
      note: 'Tasting sample rate',
    },
    {
      id: 'pack-10',
      label: 'Team Pack (10–49 boxes)',
      minQty: 10,
      maxQty: 49,
      unitPriceInr: 1090,
      note: 'Includes custom logo belly sleeve',
    },
    {
      id: 'pack-50',
      label: 'Enterprise Batch (50+ boxes)',
      minQty: 50,
      unitPriceInr: 990,
      note: 'Includes foil sleeve + welcome card',
    },
  ],
  variants: [
    {
      id: 'veg-standard',
      label: '100% Vegetarian · Standard Edition',
      dietary: 'veg',
      priceDeltaInr: 0,
      contentsNote: 'Eggless bakes & pure vegetarian assortment.',
    },
  ],
  logoBellySleeve: true,
  ribbonChoice: true,
  printedWelcomeCard: true,
  foilStampingMinQty: '25',
  ingredientsPlaceholder: DEFAULT_INGREDIENTS,
  allergensPlaceholder: DEFAULT_ALLERGENS,
  shelfLifeAndStorage: DEFAULT_STORAGE,
  deliveryTimeline: DEFAULT_DELIVERY,
};

const BUILDER_GROUPS: BoxBuilderItemGroup[] = [
  'Roasted Nuts',
  'Snacks & Savouries',
  'Artisanal Chocolates',
  'Cookies & Brownies',
  'Beverages',
];

const EMPTY_BUILDER_FORM: BuilderItemFormState = {
  id: null,
  name: '',
  group: 'Snacks & Savouries',
  portion: '85g pouch',
  dietary: 'veg',
  priceInr: '165',
  available: true,
  unavailableReason: '',
  note: '',
};

export function AdminBoxBiteTab({
  cloudProducts,
  cloudBuilderItems,
  onPreviewStorefront,
  onToast,
}: AdminBoxBiteTabProps) {
  const { activeProducts, hiddenBuiltInProducts } = useMemo(
    () => mergeBoxBiteProducts(cloudProducts),
    [cloudProducts]
  );
  const activeBuilderItems = useMemo(
    () => mergeBoxBiteBuilderItems(cloudBuilderItems),
    [cloudBuilderItems]
  );

  const [subTab, setSubTab] = useState<'boxes' | 'builder-items'>('boxes');

  // Product form state
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showHiddenDrawer, setShowHiddenDrawer] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | CorporateCategoryId>('all');

  // Builder item form state
  const [builderFormOpen, setBuilderFormOpen] = useState(false);
  const [builderForm, setBuilderForm] = useState<BuilderItemFormState>(EMPTY_BUILDER_FORM);
  const [savingBuilderItem, setSavingBuilderItem] = useState(false);
  const [builderFormError, setBuilderFormError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const formTopRef = useRef<HTMLDivElement | null>(null);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeProducts.filter((p) => {
      if (catFilter !== 'all' && p.categoryId !== catFilter) return false;
      if (q) {
        const hay = `${p.name} ${p.sku} ${p.categoryName} ${p.subtitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeProducts, catFilter, searchQuery]);

  const startCreateProduct = () => {
    const nextNum = String(activeProducts.length + 1).padStart(2, '0');
    setForm({
      ...EMPTY_PRODUCT_FORM,
      sku: `BB-CUS-${nextNum}`,
    });
    setFormError(null);
    setFormOpen(true);
    setConfirmDeleteId(null);
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const startEditProduct = (prod: CorporateBoxProduct) => {
    setForm({
      id: prod.id,
      sku: prod.sku,
      name: prod.name,
      categoryId: prod.categoryId,
      dietary: prod.dietary,
      dietaryBadgeText: prod.dietaryBadgeText,
      subtitle: prod.subtitle,
      description: prod.description,
      servingsInfo: prod.servingsInfo,
      netWeightOrCount: prod.netWeightOrCount,
      moqSingleSample: prod.moqSingleSample,
      moqBulk: String(prod.moqBulk),
      samplePriceInr: String(prod.samplePriceInr),
      bulkStartingPriceInr: String(prod.bulkStartingPriceInr),
      isDemoPrice: prod.isDemoPrice,
      featured: prod.featured,
      image: prod.image,
      gallery: [...prod.gallery],
      contentsText: prod.contents.join('\n'),
      tiers: prod.tiers.map((t) => ({ ...t })),
      variants: prod.variants.map((v) => ({ ...v })),
      logoBellySleeve: prod.customisationSupported.logoBellySleeve,
      ribbonChoice: prod.customisationSupported.ribbonChoice,
      printedWelcomeCard: prod.customisationSupported.printedWelcomeCard,
      foilStampingMinQty: String(prod.customisationSupported.foilStampingMinQty),
      ingredientsPlaceholder: prod.disclosures.ingredientsPlaceholder,
      allergensPlaceholder: prod.disclosures.allergensPlaceholder,
      shelfLifeAndStorage: prod.disclosures.shelfLifeAndStorage,
      deliveryTimeline: prod.disclosures.deliveryTimeline,
    });
    setFormError(null);
    setFormOpen(true);
    setConfirmDeleteId(null);
    setTimeout(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  };

  const handleMainPhotoUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid JPG, PNG, or WebP image file.');
      return;
    }
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const dataUrl = await compressImageFile(file, {
        maxWidth: 1080,
        maxHeight: 810,
        quality: 0.82,
        maxChars: 240000,
      });
      setForm((prev) => ({
        ...prev,
        image: dataUrl,
        gallery: prev.gallery.length === 0 ? [dataUrl] : [dataUrl, ...prev.gallery.slice(1)],
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not process image file.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    setFormError(null);
    try {
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, 3)) {
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await compressImageFile(file, {
          maxWidth: 1080,
          maxHeight: 810,
          quality: 0.8,
          maxChars: 220000,
        });
        added.push(dataUrl);
      }
      if (added.length > 0) {
        setForm((prev) => ({
          ...prev,
          gallery: [...prev.gallery, ...added].slice(0, 4),
        }));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not add gallery photos.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const syncTiersWithPrices = (sampleStr: string, bulkStr: string, moqStr: string) => {
    const sample = Math.max(50, Math.round(Number(sampleStr) || 0));
    const bulk = Math.max(50, Math.round(Number(bulkStr) || sample));
    const moq = Math.max(2, Math.round(Number(moqStr) || 10));
    const mid = Math.round((sample + bulk) / 2);
    setForm((prev) => ({
      ...prev,
      tiers: [
        {
          id: 'sample',
          label: 'Single Sample Box',
          minQty: 1,
          maxQty: 1,
          unitPriceInr: sample,
          note: 'Sample dispatch rate',
        },
        {
          id: 'pack-moq',
          label: `Team Pack (${moq}–49 boxes)`,
          minQty: moq,
          maxQty: 49,
          unitPriceInr: mid,
          note: 'Includes custom logo belly sleeve',
        },
        {
          id: 'pack-50',
          label: 'Enterprise Batch (50+ boxes)',
          minQty: 50,
          unitPriceInr: bulk,
          note: 'Includes foil sleeve + welcome card',
        },
      ],
    }));
  };

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (name.length < 2) {
      setFormError('Enter a product name (at least 2 characters).');
      return;
    }
    const samplePrice = Math.round(Number(form.samplePriceInr));
    if (!Number.isFinite(samplePrice) || samplePrice < 50) {
      setFormError('Enter a valid Sample Price in INR (minimum ₹50).');
      return;
    }
    const bulkPrice = Math.round(Number(form.bulkStartingPriceInr) || samplePrice);
    const moqBulk = Math.max(2, Math.round(Number(form.moqBulk) || 10));

    const categoryObj =
      CORPORATE_CATEGORIES.find((c) => c.id === form.categoryId) ?? CORPORATE_CATEGORIES[0];

    const contents = form.contentsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const dietaryBadgeText =
      form.dietaryBadgeText.trim() ||
      (form.dietary === 'veg'
        ? '100% Vegetarian'
        : form.dietary === 'non-veg'
          ? 'Non-Vegetarian'
          : 'Veg & Non-Veg Options');

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    setSavingProduct(true);
    try {
      const saved = await adminSaveBoxBiteProduct({
        id: form.id || undefined,
        slug: slug || 'box-bite-product',
        sku: form.sku.trim() || 'BB-CUS-01',
        name,
        categoryId: form.categoryId,
        categoryName: categoryObj.name,
        subtitle: form.subtitle.trim() || `${categoryObj.shortName} curated gift box`,
        description:
          form.description.trim() ||
          `Self-owned BOX & BITE corporate box crafted for ${categoryObj.name.toLowerCase()}.`,
        dietary: form.dietary,
        dietaryBadgeText,
        servingsInfo: form.servingsInfo.trim() || 'Curated for 1 recipient',
        netWeightOrCount: form.netWeightOrCount.trim() || '400g net',
        moqSingleSample: form.moqSingleSample,
        moqBulk,
        samplePriceInr: samplePrice,
        bulkStartingPriceInr: bulkPrice,
        isDemoPrice: form.isDemoPrice,
        featured: form.featured,
        image: form.image || BOXBITE_IMAGES.heroEditorial,
        gallery:
          form.gallery.length > 0
            ? form.gallery
            : [form.image || BOXBITE_IMAGES.heroEditorial],
        contents: contents.length > 0 ? contents : ['Assorted BOX & BITE treats'],
        tiers: form.tiers,
        variants: form.variants,
        customisationSupported: {
          logoBellySleeve: form.logoBellySleeve,
          ribbonChoice: form.ribbonChoice,
          printedWelcomeCard: form.printedWelcomeCard,
          foilStampingMinQty: Math.max(10, Math.round(Number(form.foilStampingMinQty) || 25)),
        },
        disclosures: {
          ingredientsPlaceholder: form.ingredientsPlaceholder.trim() || DEFAULT_INGREDIENTS,
          allergensPlaceholder: form.allergensPlaceholder.trim() || DEFAULT_ALLERGENS,
          shelfLifeAndStorage: form.shelfLifeAndStorage.trim() || DEFAULT_STORAGE,
          deliveryTimeline: form.deliveryTimeline.trim() || DEFAULT_DELIVERY,
        },
        active: true,
      });

      onToast(
        form.id
          ? `Updated BOX & BITE product "${saved.name}"!`
          : `Uploaded "${saved.name}" to live BOX & BITE catalog!`
      );
      setFormOpen(false);
      setForm(EMPTY_PRODUCT_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save BOX & BITE product.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteOrHideProduct = async (prod: CorporateBoxProduct) => {
    const isBuiltIn = BUILT_IN_BOXBITE_PRODUCT_IDS.has(prod.id);
    setBusyId(prod.id);
    try {
      await adminDeleteBoxBiteProduct(prod, isBuiltIn);
      onToast(
        isBuiltIn
          ? `Hid "${prod.name}" from BOX & BITE (can be restored anytime).`
          : `Deleted custom product "${prod.name}".`
      );
      setConfirmDeleteId(null);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not remove product.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRestoreProduct = async (prod: CorporateBoxProduct) => {
    setBusyId(prod.id);
    try {
      await adminRestoreBoxBiteProduct(prod.id);
      onToast(`Restored "${prod.name}" to BOX & BITE.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Could not restore product.');
    } finally {
      setBusyId(null);
    }
  };

  // Builder item actions
  const startEditBuilderItem = (item: BoxBuilderItem) => {
    setBuilderForm({
      id: item.id,
      name: item.name,
      group: item.group,
      portion: item.portion,
      dietary: item.dietary,
      priceInr: String(item.priceInr),
      available: item.available,
      unavailableReason: item.unavailableReason || '',
      note: item.note,
    });
    setBuilderFormError(null);
    setBuilderFormOpen(true);
  };

  const handleSaveBuilderItem = async (e: FormEvent) => {
    e.preventDefault();
    setBuilderFormError(null);
    if (builderForm.name.trim().length < 2) {
      setBuilderFormError('Enter an item name.');
      return;
    }
    const price = Math.round(Number(builderForm.priceInr));
    if (!Number.isFinite(price) || price < 20) {
      setBuilderFormError('Enter a valid INR price (₹20+).');
      return;
    }
    setSavingBuilderItem(true);
    try {
      const saved = await adminSaveBoxBiteBuilderItem({
        id: builderForm.id || undefined,
        name: builderForm.name.trim(),
        group: builderForm.group,
        portion: builderForm.portion.trim() || '80g pack',
        dietary: builderForm.dietary,
        priceInr: price,
        available: builderForm.available,
        unavailableReason: builderForm.available
          ? undefined
          : builderForm.unavailableReason.trim() || 'Currently out of stock',
        note: builderForm.note.trim() || 'Artisanal BOX & BITE selection',
        active: true,
      });
      onToast(`Saved "${saved.name}" to Box Builder items!`);
      setBuilderFormOpen(false);
      setBuilderForm(EMPTY_BUILDER_FORM);
    } catch (err) {
      setBuilderFormError(err instanceof Error ? err.message : 'Could not save builder item.');
    } finally {
      setSavingBuilderItem(false);
    }
  };

  const handleQuickToggleBuilderStock = async (item: BoxBuilderItem) => {
    setBusyId(item.id);
    try {
      await adminSaveBoxBiteBuilderItem({
        ...item,
        available: !item.available,
        unavailableReason: !item.available ? undefined : 'Temporarily out of stock',
      });
      onToast(
        `${item.name} marked ${!item.available ? 'In Stock' : 'Out of Stock'} in Custom Box Builder.`
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update stock status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteBuilderItem = async (item: BoxBuilderItem) => {
    const isBuiltIn = BUILT_IN_BOXBITE_BUILDER_ITEM_IDS.has(item.id);
    setBusyId(item.id);
    try {
      await adminDeleteBoxBiteBuilderItem(item, isBuiltIn);
      onToast(`Removed "${item.name}" from Custom Box Builder.`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to remove builder item.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Brand Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C58B55]/40 bg-[#38231E] p-4 text-[#FFF8EF]">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#C58B55]/20 text-[#C58B55]">
            <Briefcase className="size-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-wide">
                BOX &amp; BITE — Self-Owned Product Catalog
              </h3>
              <span className="rounded-full bg-[#C58B55]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#EDE0D0]">
                {activeProducts.length} Boxes · {activeBuilderItems.length} Builder Items
              </span>
            </div>
            <p className="mt-1 text-xs text-[#FFF8EF]/75">
              Upload new corporate boxes, upload product photos (stored on CDN), adjust INR pricing
              tiers &amp; box contents, or manage Build-Your-Own-Box stock. Changes go live
              immediately.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPreviewStorefront}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#C58B55] px-3.5 py-2 text-xs font-bold text-[#38231E] transition-colors hover:bg-[#b87d47] whitespace-nowrap"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" />
          Open BOX &amp; BITE Storefront
        </button>
      </div>

      {/* Sub-navigation: Gift Boxes vs Custom Box Builder Items */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setSubTab('boxes')}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              subTab === 'boxes'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Corporate Gift Boxes ({activeProducts.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('builder-items')}
            className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
              subTab === 'builder-items'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Build-Your-Own-Box Items ({activeBuilderItems.length})
          </button>
        </div>

        {subTab === 'boxes' ? (
          <button
            type="button"
            onClick={startCreateProduct}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground shadow-xs transition-colors hover:bg-brand-hover"
          >
            <Plus className="size-4" aria-hidden="true" />
            Upload New BOX &amp; BITE Product
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setBuilderForm(EMPTY_BUILDER_FORM);
              setBuilderFormError(null);
              setBuilderFormOpen(true);
            }}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground shadow-xs transition-colors hover:bg-brand-hover"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Builder Item
          </button>
        )}
      </div>

      {subTab === 'boxes' ? (
        <>
          {/* Upload / Edit Product Form */}
          <div ref={formTopRef} />
          {formOpen && (
            <form
              onSubmit={handleSaveProduct}
              className="space-y-5 rounded-2xl border border-[#C58B55]/50 bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Package className="size-4 text-brand" aria-hidden="true" />
                  <h4 className="text-sm font-extrabold text-foreground">
                    {form.id ? `Edit Product (${form.sku})` : 'Upload New Self-Owned BOX & BITE Product'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="cursor-pointer rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Close product form"
                >
                  <X className="size-4" />
                </button>
              </div>

              {formError && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                  {formError}
                </div>
              )}

              {/* Row 1: Photo Upload + Core Identity */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
                <div className="space-y-2 md:col-span-4">
                  <label className="block text-xs font-bold text-foreground">
                    Main Product Photo *
                  </label>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
                    {form.image ? (
                      <img
                        src={form.image}
                        alt="Product preview"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        No photo
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                        <Loader2 className="size-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => void handleMainPhotoUpload(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      disabled={uploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:border-brand"
                    >
                      <Upload className="size-3.5" aria-hidden="true" />
                      Upload Photo
                    </button>

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => void handleGalleryUpload(e.target.files)}
                    />
                    <button
                      type="button"
                      disabled={uploadingGallery}
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:border-brand"
                      title="Upload additional gallery angles"
                    >
                      <ImagePlus className="size-3.5" aria-hidden="true" />
                      Gallery ({form.gallery.length})
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                    placeholder="Or paste image URL..."
                    className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px]"
                  />
                </div>

                <div className="space-y-3 md:col-span-8">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-foreground">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. The Deccan Executive Artisan Box"
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground">SKU Code</label>
                      <input
                        type="text"
                        value={form.sku}
                        onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                        placeholder="BB-CUS-01"
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Corporate Category *
                      </label>
                      <select
                        value={form.categoryId}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            categoryId: e.target.value as CorporateCategoryId,
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
                      >
                        {CORPORATE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-foreground">
                        Dietary Format *
                      </label>
                      <select
                        value={form.dietary}
                        onChange={(e) => {
                          const next = e.target.value as CorporateDietaryType;
                          setForm((p) => ({
                            ...p,
                            dietary: next,
                            dietaryBadgeText:
                              next === 'veg'
                                ? '100% Vegetarian'
                                : next === 'non-veg'
                                  ? 'Non-Vegetarian'
                                  : 'Veg & Non-Veg Options',
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium"
                      >
                        <option value="veg">100% Vegetarian</option>
                        <option value="mixed">Has Vegetarian &amp; Non-Veg Options</option>
                        <option value="non-veg">Non-Vegetarian</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Short Subtitle / Card Summary *
                    </label>
                    <input
                      type="text"
                      value={form.subtitle}
                      onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
                      placeholder="Roasted almonds, masala chai shortbread & custom welcome card"
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-foreground">
                      Full Product Description
                    </label>
                    <textarea
                      rows={2}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the occasion, box finish, and tasting highlights..."
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Pricing, MOQ, Weight & Flags */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3.5 sm:grid-cols-5">
                <div>
                  <label className="block text-[11px] font-bold text-foreground">
                    Sample Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={50}
                    required
                    value={form.samplePriceInr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, samplePriceInr: val }));
                      syncTiersWithPrices(val, form.bulkStartingPriceInr, form.moqBulk);
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-foreground">
                    Bulk Price (₹) *
                  </label>
                  <input
                    type="number"
                    min={50}
                    required
                    value={form.bulkStartingPriceInr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, bulkStartingPriceInr: val }));
                      syncTiersWithPrices(form.samplePriceInr, val, form.moqBulk);
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-foreground">Bulk MOQ</label>
                  <input
                    type="number"
                    min={2}
                    value={form.moqBulk}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, moqBulk: val }));
                      syncTiersWithPrices(form.samplePriceInr, form.bulkStartingPriceInr, val);
                    }}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-foreground">Servings Info</label>
                  <input
                    type="text"
                    value={form.servingsInfo}
                    onChange={(e) => setForm((p) => ({ ...p, servingsInfo: e.target.value }))}
                    placeholder="Serves 1–2"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-foreground">Net Weight / Items</label>
                  <input
                    type="text"
                    value={form.netWeightOrCount}
                    onChange={(e) => setForm((p) => ({ ...p, netWeightOrCount: e.target.value }))}
                    placeholder="450g · 4 items"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Row 3: Box Contents & Variants */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-foreground">
                    Box Contents (One Item per Line)
                  </label>
                  <textarea
                    rows={4}
                    value={form.contentsText}
                    onChange={(e) => setForm((p) => ({ ...p, contentsText: e.target.value }))}
                    placeholder="Enter each included item on a new line..."
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Box Variants (Veg / Non-Veg / Editions)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          variants: [
                            ...p.variants,
                            {
                              id: `var-${Date.now()}`,
                              label: 'New Edition Variant',
                              dietary: p.dietary === 'non-veg' ? 'non-veg' : 'veg',
                              priceDeltaInr: 0,
                              contentsNote: 'Custom edition note',
                            },
                          ],
                        }))
                      }
                      className="cursor-pointer text-[11px] font-bold text-brand hover:underline"
                    >
                      + Add Variant
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.variants.map((v, idx) => (
                      <div
                        key={v.id + idx}
                        className="grid grid-cols-12 items-center gap-1.5 rounded-lg border border-border bg-background p-2"
                      >
                        <input
                          type="text"
                          value={v.label}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = { ...v, label: e.target.value };
                            setForm((p) => ({ ...p, variants: next }));
                          }}
                          className="col-span-5 rounded border border-border px-2 py-1 text-[11px]"
                        />
                        <select
                          value={v.dietary}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = {
                              ...v,
                              dietary: e.target.value as 'veg' | 'non-veg',
                            };
                            setForm((p) => ({ ...p, variants: next }));
                          }}
                          className="col-span-3 rounded border border-border px-1.5 py-1 text-[11px]"
                        >
                          <option value="veg">Veg</option>
                          <option value="non-veg">Non-Veg</option>
                        </select>
                        <input
                          type="number"
                          value={v.priceDeltaInr}
                          onChange={(e) => {
                            const next = [...form.variants];
                            next[idx] = { ...v, priceDeltaInr: Number(e.target.value) || 0 };
                            setForm((p) => ({ ...p, variants: next }));
                          }}
                          title="Extra ₹ vs base price"
                          className="col-span-3 rounded border border-border px-2 py-1 font-mono text-[11px]"
                        />
                        {form.variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setForm((p) => ({
                                ...p,
                                variants: p.variants.filter((_, i) => i !== idx),
                              }))
                            }
                            className="col-span-1 cursor-pointer text-rose-600"
                            aria-label="Remove variant"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 4: Branding Customisation Toggles & Disclosures */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-3.5 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">Corporate Branding Support</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.logoBellySleeve}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, logoBellySleeve: e.target.checked }))
                        }
                      />
                      Logo Belly Sleeve
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.ribbonChoice}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, ribbonChoice: e.target.checked }))
                        }
                      />
                      Satin Ribbon
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.printedWelcomeCard}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, printedWelcomeCard: e.target.checked }))
                        }
                      />
                      Welcome Card
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, featured: e.target.checked }))
                        }
                      />
                      Featured
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold">Storage / Shelf Life</label>
                    <input
                      type="text"
                      value={form.shelfLifeAndStorage}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, shelfLifeAndStorage: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold">Delivery Timeline</label>
                    <input
                      type="text"
                      value={form.deliveryTimeline}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, deliveryTimeline: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="cursor-pointer rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || uploadingPhoto || uploadingGallery}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-5 py-2 text-xs font-bold text-brand-foreground shadow-sm hover:bg-brand-hover disabled:opacity-60"
                >
                  {savingProduct ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  {savingProduct
                    ? 'Saving to BOX & BITE...'
                    : form.id
                      ? 'Save Product Changes'
                      : 'Publish to BOX & BITE'}
                </button>
              </div>
            </form>
          )}

          {/* Filter Bar */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search BOX & BITE products by name, SKU, or category..."
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-xs"
              />
            </div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as 'all' | CorporateCategoryId)}
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold"
            >
              <option value="all">All 7 Categories ({activeProducts.length})</option>
              {CORPORATE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Product Grid / List */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {filteredProducts.map((prod) => {
              const isBuiltIn = BUILT_IN_BOXBITE_PRODUCT_IDS.has(prod.id);
              const isBusy = busyId === prod.id;
              return (
                <div
                  key={prod.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-[#C58B55]/60"
                >
                  <img
                    src={prod.image}
                    alt={prod.name}
                    referrerPolicy="no-referrer"
                    className="size-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono font-bold">
                        {prod.sku}
                      </span>
                      <span className="font-semibold text-muted-foreground">
                        {prod.categoryName.split('(')[0].trim()}
                      </span>
                      {prod.isCloudSaved && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 font-bold text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="size-2.5" />
                          {isBuiltIn ? 'Edited Live' : 'Admin Uploaded'}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 truncate text-sm font-extrabold text-foreground">
                      {prod.name}
                    </h4>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">
                      Sample {formatInr(prod.samplePriceInr)} · Bulk {formatInr(prod.bulkStartingPriceInr)} ({prod.moqBulk}+ MOQ)
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditProduct(prod)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] font-bold hover:border-brand"
                      >
                        <Edit3 className="size-3" />
                        Edit
                      </button>

                      {confirmDeleteId === prod.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleDeleteOrHideProduct(prod)}
                            className="cursor-pointer rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            {isBusy ? 'Removing...' : isBuiltIn ? 'Confirm Hide' : 'Confirm Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(prod.id)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                        >
                          <Trash2 className="size-3" />
                          {isBuiltIn ? 'Hide' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restore Hidden Built-in Sample Boxes */}
          {hiddenBuiltInProducts.length > 0 && (
            <div className="rounded-2xl border border-border bg-muted/30 p-3.5">
              <button
                type="button"
                onClick={() => setShowHiddenDrawer((s) => !s)}
                className="flex w-full cursor-pointer items-center justify-between text-xs font-bold"
              >
                <span>Hidden Sample Boxes ({hiddenBuiltInProducts.length})</span>
                <span className="text-brand">{showHiddenDrawer ? 'Hide' : 'Show & Restore'}</span>
              </button>
              {showHiddenDrawer && (
                <div className="mt-3 space-y-2">
                  {hiddenBuiltInProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"
                    >
                      <span className="font-semibold">
                        {prod.name} ({prod.sku})
                      </span>
                      <button
                        type="button"
                        disabled={busyId === prod.id}
                        onClick={() => void handleRestoreProduct(prod)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-bold hover:border-brand"
                      >
                        <RotateCcw className="size-3" />
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* SUBTAB 2: BUILD-YOUR-OWN-BOX ITEMS */
        <div className="space-y-4">
          {builderFormOpen && (
            <form
              onSubmit={handleSaveBuilderItem}
              className="space-y-3 rounded-2xl border border-[#C58B55]/50 bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider">
                  {builderForm.id ? 'Edit Custom Box Item' : 'Add Custom Box Builder Item'}
                </h4>
                <button
                  type="button"
                  onClick={() => setBuilderFormOpen(false)}
                  className="cursor-pointer rounded p-1 hover:bg-accent"
                >
                  <X className="size-4" />
                </button>
              </div>
              {builderFormError && (
                <p className="text-xs font-semibold text-rose-600">{builderFormError}</p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input
                  type="text"
                  required
                  value={builderForm.name}
                  onChange={(e) => setBuilderForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Item name *"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs sm:col-span-2"
                />
                <select
                  value={builderForm.group}
                  onChange={(e) =>
                    setBuilderForm((p) => ({ ...p, group: e.target.value as BoxBuilderItemGroup }))
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  {BUILDER_GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={20}
                  required
                  value={builderForm.priceInr}
                  onChange={(e) => setBuilderForm((p) => ({ ...p, priceInr: e.target.value }))}
                  placeholder="Price ₹ *"
                  className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  value={builderForm.portion}
                  onChange={(e) => setBuilderForm((p) => ({ ...p, portion: e.target.value }))}
                  placeholder="Portion (e.g. 90g kraft tin)"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={builderForm.note}
                  onChange={(e) => setBuilderForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="Short tasting note"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs sm:col-span-2"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={builderForm.available}
                    onChange={(e) =>
                      setBuilderForm((p) => ({ ...p, available: e.target.checked }))
                    }
                  />
                  In Stock &amp; Selectable in Custom Box Builder
                </label>
                <button
                  type="submit"
                  disabled={savingBuilderItem}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-brand-foreground"
                >
                  {savingBuilderItem ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                  Save Builder Item
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {activeBuilderItems.map((item) => {
              const isBusy = busyId === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="font-semibold text-muted-foreground">
                        {item.group} · {item.portion}
                      </span>
                      <span
                        className={`font-bold ${
                          item.available ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {item.available ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-foreground">{item.name}</p>
                    <p className="mt-0.5 font-mono font-semibold">{formatInr(item.priceInr)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleQuickToggleBuilderStock(item)}
                      className="cursor-pointer rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:border-brand"
                    >
                      {item.available ? 'Mark Out of Stock' : 'Mark In Stock'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditBuilderItem(item)}
                      className="cursor-pointer rounded-lg border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:border-brand"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDeleteBuilderItem(item)}
                      className="cursor-pointer rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-500/20 dark:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
