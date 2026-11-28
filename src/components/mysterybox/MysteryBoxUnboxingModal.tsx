import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { motion, useReducedMotion } from 'motion/react';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Loader2,
  MapPin,
  Package,
  RotateCcw,
  Share2,
  Sparkles,
  Store,
  Truck,
  X,
} from 'lucide-react';
import {
  DELIVERY_STATUS_META,
  type MysteryBoxDeliveryStatus,
  type MysteryBoxOrder,
  type MysteryBoxSeasonalEdition,
  formatInr,
} from '../../data/mysteryBoxes';
import { resolveRevealedItemImage } from '../../data/mysteryBoxImages';
import { unboxMysteryBoxOrder } from '../../services/mysteryBoxService';

interface MysteryBoxUnboxingModalProps {
  order: MysteryBoxOrder | null;
  seasonalEdition?: MysteryBoxSeasonalEdition;
  user: User | null;
  onClose: () => void;
  onOrderUpdated: (order: MysteryBoxOrder) => void;
  onNotify?: (msg: string) => void;
}

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, idx) => {
  const angle = (idx / 28) * Math.PI * 2;
  const distance = 90 + (idx % 4) * 38;
  const colors = ['#FF6B35', '#6B21A8', '#F59E0B', '#EC4899', '#10B981', '#FBBF24'];
  return {
    id: idx,
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance - 40),
    rotate: (idx % 2 === 0 ? 1 : -1) * (120 + idx * 17),
    color: colors[idx % colors.length],
    size: idx % 3 === 0 ? 10 : 7,
    delay: (idx % 5) * 0.04,
  };
});

const TRACKING_STEPS: MysteryBoxDeliveryStatus[] = [
  'confirmed',
  'vendor_preparing',
  'packing',
  'dispatched',
  'out_for_delivery',
  'delivered',
];

export function MysteryBoxUnboxingModal({
  order,
  seasonalEdition = 'christmas',
  user,
  onClose,
  onOrderUpdated,
  onNotify,
}: MysteryBoxUnboxingModalProps) {
  const isChristmas = seasonalEdition === 'christmas';
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<'sealed' | 'unwrapping' | 'revealed'>('sealed');
  const [unboxingBusy, setUnboxingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTracker, setShowTracker] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    if (!order) return;
    setError(null);
    setShowTracker(false);
    setStage(order.unboxedAt ? 'revealed' : 'sealed');
  }, [order?.id]);

  useEffect(() => {
    if (!order) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [order, onClose]);

  const assignedItems = useMemo(() => order?.assignedItems || [], [order?.assignedItems]);

  if (!order) return null;

  const isVerified = order.paymentStatus === 'verified';
  const currentStepIndex = DELIVERY_STATUS_META[order.deliveryStatus]?.stepIndex ?? 1;

  const handleUnwrap = async () => {
    if (!isVerified || unboxingBusy) return;
    setError(null);
    setUnboxingBusy(true);
    try {
      let latest = order;
      if (!order.unboxedAt) {
        const res = await unboxMysteryBoxOrder(order.id, user);
        latest = res.order;
        onOrderUpdated(latest);
      }
      if (prefersReducedMotion) {
        setStage('revealed');
      } else {
        setStage('unwrapping');
        window.setTimeout(() => {
          setStage('revealed');
        }, 1250);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to unwrap your Mystery Box.');
    } finally {
      setUnboxingBusy(false);
    }
  };

  const handleReplayAnimation = () => {
    if (prefersReducedMotion) return;
    setShowTracker(false);
    setStage('sealed');
    window.setTimeout(() => {
      setStage('unwrapping');
      window.setTimeout(() => {
        setStage('revealed');
      }, 1250);
    }, 80);
  };

  const handleShareUnboxing = async () => {
    const itemSummary = assignedItems
      .slice(0, 4)
      .map((i) => i.productName)
      .join(', ');
    const shareText = `I just unwrapped my ${order.packageName} on FindMyBites! Inside: ${itemSummary}. Unwrap yours at ${window.location.origin}/mystery-boxes`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `FindMyBites ${order.packageName}`,
          text: shareText,
          url: `${window.location.origin}/mystery-boxes`,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setCopiedShare(true);
        onNotify?.('Unboxing summary copied to clipboard!');
        window.setTimeout(() => setCopiedShare(false), 2400);
      }
    } catch {
      // User dismissed native share sheet
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="FindMyBites Mystery Box Digital Unboxing"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-950/80 p-3 backdrop-blur-md sm:p-6"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#E9D8C8] bg-[#FFF8F0] shadow-2xl dark:border-purple-800/50 dark:bg-[#171020]">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[#EAD9C8] bg-white/80 px-5 py-3.5 dark:border-purple-900/40 dark:bg-[#1E1529]/90">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#6B21A8] dark:text-purple-300">
              FINDMYBITES MYSTERY BOXES · {order.orderRef}
            </p>
            <p className="truncate text-sm font-bold text-neutral-950 dark:text-white">
              {order.packageName}
              {order.isGift ? ` · Gift for ${order.recipientName}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stage === 'revealed' && !prefersReducedMotion && (
              <button
                type="button"
                onClick={handleReplayAnimation}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#E5D4C3] bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-200 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Replay
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close unboxing"
              className="grid size-8 cursor-pointer place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-neutral-200"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Main scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
          {!isVerified ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <Clock className="size-7" aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-xl font-extrabold text-neutral-950 dark:text-white">
                Payment Verification Pending
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                Your digital unboxing unlocks immediately once payment is verified on the server.
              </p>
            </div>
          ) : stage !== 'revealed' ? (
            /* STAGE 1 & 2: SEALED GIFT BOX -> RIBBON LOOSENS -> LID OPENS -> CONFETTI BURST */
            <div className="mx-auto flex max-w-lg flex-col items-center py-4 text-center">
              <h3 className="text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
                Your Mystery Box Is Ready!
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                Something delicious is waiting for you. Are you ready to discover your surprise?
              </p>

              {/* Animated Branded Mystery Gift Box Stage (compositor-only transform/opacity) */}
              <div className="relative my-10 flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
                {/* Confetti burst during unwrap */}
                {stage === 'unwrapping' && !prefersReducedMotion && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {CONFETTI_PIECES.map((piece) => (
                      <motion.span
                        key={piece.id}
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                        animate={{
                          x: piece.x,
                          y: piece.y,
                          scale: [0, 1.15, 0.9],
                          opacity: [1, 1, 0],
                          rotate: piece.rotate,
                        }}
                        transition={{
                          duration: 1.05,
                          delay: 0.25 + piece.delay,
                          ease: 'easeOut',
                        }}
                        style={{
                          width: piece.size,
                          height: piece.size * 0.65,
                          backgroundColor: piece.color,
                        }}
                        className="absolute rounded-[2px]"
                      />
                    ))}
                  </div>
                )}

                {/* Warm glow halo on lid open */}
                <motion.div
                  aria-hidden="true"
                  animate={
                    stage === 'unwrapping'
                      ? { scale: [0.85, 1.35], opacity: [0.25, 0.85] }
                      : { scale: 1, opacity: 0.25 }
                  }
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`pointer-events-none absolute size-52 rounded-full blur-2xl ${
                    isChristmas
                      ? 'bg-gradient-to-tr from-[#991B1B]/40 via-[#D4AF37]/45 to-[#14532D]/40'
                      : 'bg-gradient-to-tr from-[#FF6B35]/35 via-amber-300/35 to-[#6B21A8]/35'
                  }`}
                />

                {/* Gift Box Assembly */}
                <motion.div
                  animate={
                    stage === 'unwrapping'
                      ? { scale: [1, 1.04, 0.98, 1.05] }
                      : { y: [0, -5, 0] }
                  }
                  transition={
                    stage === 'unwrapping'
                      ? { duration: 0.6 }
                      : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                  }
                  className="relative flex flex-col items-center"
                >
                  {/* Ribbon Bow */}
                  <motion.div
                    animate={
                      stage === 'unwrapping'
                        ? { y: -64, scale: 0.65, opacity: 0, rotate: -18 }
                        : { y: 0, scale: 1, opacity: 1, rotate: 0 }
                    }
                    transition={{ duration: 0.55, ease: 'easeInOut' }}
                    className="relative z-30 -mb-2.5 flex items-end justify-center"
                  >
                    <div
                      className={`h-9 w-12 -rotate-12 rounded-full border-[5px] shadow-sm ${
                        isChristmas
                          ? 'border-[#D4AF37] bg-[#F3D58D]/25'
                          : 'border-[#6B21A8] bg-[#7E22CE]/20'
                      }`}
                    />
                    <div
                      className={`z-10 -mx-2.5 grid size-7 place-items-center rounded-full shadow ${
                        isChristmas
                          ? 'bg-[#D4AF37] text-[#1C1404]'
                          : 'bg-[#6B21A8] text-white'
                      }`}
                    >
                      <Sparkles className="size-3.5" aria-hidden="true" />
                    </div>
                    <div
                      className={`h-9 w-12 rotate-12 rounded-full border-[5px] shadow-sm ${
                        isChristmas
                          ? 'border-[#D4AF37] bg-[#F3D58D]/25'
                          : 'border-[#6B21A8] bg-[#7E22CE]/20'
                      }`}
                    />
                  </motion.div>

                  {/* Box Lid */}
                  <motion.div
                    animate={
                      stage === 'unwrapping'
                        ? { y: -76, rotate: -16, opacity: 0 }
                        : { y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{ duration: 0.65, delay: 0.2, ease: 'easeOut' }}
                    className={`relative z-20 flex h-12 w-52 items-center justify-center rounded-t-2xl border-2 shadow-md sm:w-56 ${
                      isChristmas
                        ? 'border-[#D4AF37]/60 bg-gradient-to-b from-[#B91C1C] to-[#881313]'
                        : 'border-[#EA5822] bg-gradient-to-b from-[#FF7B4A] to-[#FF6B35]'
                    }`}
                  >
                    <div
                      className={`h-full w-9 ${
                        isChristmas
                          ? 'bg-gradient-to-b from-[#F3D58D] via-[#D4AF37] to-[#B58C28]'
                          : 'bg-[#6B21A8]'
                      }`}
                    />
                  </motion.div>

                  {/* Box Base */}
                  <div
                    className={`relative z-10 flex h-36 w-48 flex-col items-center justify-center overflow-hidden rounded-b-2xl border-2 border-t-0 shadow-xl sm:h-40 sm:w-52 ${
                      isChristmas
                        ? 'border-[#D4AF37]/45 bg-gradient-to-b from-[#14532D] to-[#0B341C]'
                        : 'border-[#E9D8C8] bg-gradient-to-b from-[#FFFDF9] to-[#FCEEE0] dark:border-purple-800/60 dark:from-[#261B33] dark:to-[#1C1327]'
                    }`}
                  >
                    {/* Vertical satin ribbon */}
                    <motion.div
                      animate={
                        stage === 'unwrapping'
                          ? { opacity: 0, scaleY: 0.3 }
                          : { opacity: 1, scaleY: 1 }
                      }
                      transition={{ duration: 0.45 }}
                      className={`absolute inset-y-0 w-9 ${
                        isChristmas
                          ? 'bg-gradient-to-b from-[#F3D58D] via-[#D4AF37] to-[#B58C28]'
                          : 'bg-[#6B21A8]'
                      }`}
                    />
                    {/* FindMyBites wax seal badge */}
                    <div
                      className={`relative z-10 flex flex-col items-center rounded-full border-2 px-4 py-2 text-center shadow-md ${
                        isChristmas
                          ? 'border-[#F3D58D] bg-[#991B1B]'
                          : 'border-amber-300 bg-[#FF6B35]'
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white">
                        FindMyBites
                      </span>
                      <span className="text-[9px] font-semibold text-amber-100">
                        {isChristmas ? 'Christmas Seal' : 'Mystery Seal'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {error && (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleUnwrap}
                disabled={unboxingBusy || stage === 'unwrapping'}
                className={`inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-8 py-4 text-sm font-extrabold tracking-wide text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
                  isChristmas
                    ? 'bg-gradient-to-r from-[#991B1B] via-[#B91C1C] to-[#14532D]'
                    : 'bg-gradient-to-r from-[#FF6B35] to-[#6B21A8]'
                }`}
              >
                {unboxingBusy || stage === 'unwrapping' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    UNWRAPPING YOUR SURPRISE...
                  </>
                ) : (
                  <>
                    <Gift className="size-4" aria-hidden="true" />
                    {isChristmas ? 'UNWRAP THE CHRISTMAS MAGIC' : 'UNWRAP YOUR SURPRISE'}
                  </>
                )}
              </button>

              <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
                Your exact goodies are already locked &amp; reserved against {order.orderRef}.
              </p>
            </div>
          ) : (
            /* STAGE 3: REVEALED ACTUAL BOX CONTENTS + TRACKING */
            <div>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#FF6B35]">
                  UNWRAPPED · {assignedItems.length} SURPRISE GOODIES INSIDE
                </p>
                <h3 className="mt-1.5 text-2xl font-extrabold tracking-tight text-neutral-950 dark:text-white sm:text-3xl">
                  Surprise! Your goodies are on their way!
                </h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                  Guaranteed retail value{' '}
                  <strong className="font-bold text-[#6B21A8] dark:text-purple-300">
                    {formatInr(order.assignedTotalRetailValueInr || order.guaranteedMinValueInr)}
                  </strong>{' '}
                  · Paid{' '}
                  <strong className="font-bold text-neutral-950 dark:text-white">
                    {formatInr(order.totalPaidInr)}
                  </strong>{' '}
                  · Locked permanently to order {order.orderRef}
                </p>
              </motion.div>

              {/* Revealed Actual Assigned Products Grid */}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {assignedItems.map((item, idx) => (
                  <motion.div
                    key={`${item.id}-${idx}`}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, delay: prefersReducedMotion ? 0 : idx * 0.08 }}
                    className="flex gap-3.5 overflow-hidden rounded-2xl border border-[#EAD9C8] bg-white p-3.5 shadow-sm dark:border-purple-900/40 dark:bg-[#22182F]"
                  >
                    <img
                      src={resolveRevealedItemImage(item.image, 'celebration')}
                      alt={item.productName}
                      className="size-20 shrink-0 rounded-xl object-cover bg-[#F7EFE6]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B21A8] dark:text-purple-300">
                        {item.category} · {item.quantity} {item.unitLabel}
                      </p>
                      <h4 className="mt-0.5 text-sm font-bold text-neutral-950 dark:text-white">
                        {item.productName}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">
                        {item.shortDescription}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                        {item.showVendorName && (
                          <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-200">
                            <Store className="size-3 text-[#FF6B35]" aria-hidden="true" />
                            {item.vendorName}
                          </span>
                        )}
                        <span>· {item.dietary === 'eggless' ? 'Eggless' : item.dietary}</span>
                        <span>· Best before: {item.bestBefore}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Action CTA Bar */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTracker((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#FF6B35] px-6 py-3 text-sm font-extrabold tracking-wide text-white shadow-sm transition-colors hover:bg-[#EA5822] whitespace-nowrap shrink-0"
                >
                  <Truck className="size-4" aria-hidden="true" />
                  {showTracker ? 'HIDE ORDER TRACKER' : 'TRACK MY MYSTERY BOX'}
                </button>
                <button
                  type="button"
                  onClick={handleShareUnboxing}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6B21A8]/35 bg-white px-5 py-3 text-sm font-bold text-[#6B21A8] transition-colors hover:bg-[#6B21A8]/5 dark:border-purple-400/35 dark:bg-purple-950/30 dark:text-purple-200 whitespace-nowrap shrink-0"
                >
                  {copiedShare ? (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Copied to Share
                    </>
                  ) : (
                    <>
                      <Share2 className="size-4" aria-hidden="true" />
                      Share My Unboxing
                    </>
                  )}
                </button>
              </div>

              {/* Live Order Tracking Timeline */}
              {showTracker && (
                <div className="mt-6 rounded-2xl border border-[#EAD9C8] bg-white p-5 dark:border-purple-900/40 dark:bg-[#22182F]">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-4 dark:border-purple-900/30">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B21A8] dark:text-purple-300">
                        Live Order Tracking
                      </p>
                      <h4 className="mt-0.5 text-base font-extrabold text-neutral-950 dark:text-white">
                        {DELIVERY_STATUS_META[order.deliveryStatus]?.label || 'Confirmed'}
                      </h4>
                      <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
                        {DELIVERY_STATUS_META[order.deliveryStatus]?.description}
                      </p>
                    </div>
                    <div className="text-right text-xs text-neutral-600 dark:text-neutral-300">
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {order.deliveryDate} · {order.deliverySlot}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1">
                        <MapPin className="size-3 text-[#FF6B35]" aria-hidden="true" />
                        {order.deliveryCity}
                      </p>
                    </div>
                  </div>

                  {order.deliveryStatus === 'cancelled' || order.deliveryStatus === 'refunded' ? (
                    <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">
                      Status: {DELIVERY_STATUS_META[order.deliveryStatus].label}
                      {order.refundReason ? ` — ${order.refundReason}` : ''}
                    </p>
                  ) : (
                    <ol className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {TRACKING_STEPS.map((stepKey) => {
                        const meta = DELIVERY_STATUS_META[stepKey];
                        const reached = currentStepIndex >= meta.stepIndex;
                        return (
                          <li
                            key={stepKey}
                            className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs ${
                              reached
                                ? 'border-[#6B21A8]/30 bg-[#6B21A8]/5 font-semibold text-neutral-950 dark:border-purple-400/40 dark:bg-purple-900/25 dark:text-white'
                                : 'border-neutral-200/70 text-neutral-400 dark:border-purple-900/30 dark:text-neutral-500'
                            }`}
                          >
                            {reached ? (
                              <CheckCircle2
                                className="size-4 shrink-0 text-[#6B21A8] dark:text-purple-300"
                                aria-hidden="true"
                              />
                            ) : (
                              <Package className="size-4 shrink-0 opacity-50" aria-hidden="true" />
                            )}
                            <span className="truncate">{meta.label}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {order.isGift && order.giftMessage && (
                    <div className="mt-4 rounded-xl bg-[#FFF8F0] p-3 text-xs text-neutral-700 dark:bg-purple-950/30 dark:text-purple-100">
                      <span className="font-bold text-[#6B21A8] dark:text-purple-300">
                        Gift Note for {order.recipientName}:
                      </span>{' '}
                      “{order.giftMessage}”
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <span>Delivering to: {order.deliveryAddress}</span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(order.orderRef);
                        onNotify?.(`Order ref ${order.orderRef} copied.`);
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 font-semibold text-[#6B21A8] hover:underline dark:text-purple-300 whitespace-nowrap shrink-0"
                    >
                      <Copy className="size-3" aria-hidden="true" />
                      {order.orderRef}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
