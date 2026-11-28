import type { MysteryBoxSeasonalEdition } from '../../data/mysteryBoxes';

export interface SeasonalThemeClasses {
  isChristmas: boolean;
  pageCanvas: string;
  sectionBg: string;
  promoBar: string;
  headerSurface: string;
  heroCard: string;
  heroEyebrow: string;
  heroQuote: string;
  cardSurface: string;
  cardHoverBorder: string;
  cardCategoryText: string;
  cardTaglineText: string;
  cardRibbonBadge: string;
  lockNoticeBox: string;
  lockIconColor: string;
  primaryButton: string;
  secondaryButton: string;
  activeTabPrimary: string;
  activeTabSecondary: string;
  corporateBanner: string;
  corporateEyebrow: string;
  unboxingLidClass: string;
  unboxingBodyClass: string;
  unboxingRibbonClass: string;
  unboxingConfettiColors: string[];
}

export function getSeasonalThemeClasses(
  edition: MysteryBoxSeasonalEdition = 'christmas'
): SeasonalThemeClasses {
  if (edition === 'christmas') {
    return {
      isChristmas: true,
      pageCanvas:
        'bg-[#FAF6EE] text-[#1C1917] dark:bg-[#0A1612] dark:text-[#FAF6EE]',
      sectionBg:
        'border-y border-[#E6D5B8] bg-gradient-to-b from-[#FAF6EE] via-[#FDF9F1] to-[#F6EFE2] dark:border-[#244336] dark:bg-gradient-to-b dark:from-[#0B1712] dark:via-[#0E1E18] dark:to-[#0A1410]',
      promoBar:
        'bg-gradient-to-r from-[#7F1D1D] via-[#991B1B] to-[#14532D] text-[#FDF8EC]',
      headerSurface:
        'border-b border-[#E6D5B8] bg-[#FFFDF9]/95 backdrop-blur-md dark:border-[#234135] dark:bg-[#0D1D17]/95',
      heroCard:
        'border border-[#E5D3B3] bg-gradient-to-br from-[#FFFDF8] via-[#FBF5E9] to-[#F5EBD8] shadow-sm dark:border-[#2A4B3C] dark:bg-gradient-to-br dark:from-[#12261E] dark:via-[#0F211A] dark:to-[#1E1315]',
      heroEyebrow: 'text-[#991B1B] dark:text-[#E5C068]',
      heroQuote: 'text-[#14532D] dark:text-[#F3D58D]',
      cardSurface:
        'border border-[#E6D6BC] bg-[#FFFDF9] dark:border-[#244236] dark:bg-[#11221B]',
      cardHoverBorder: 'hover:border-[#C89B3C]/80 dark:hover:border-[#D4AF37]/70',
      cardCategoryText: 'text-[#14532D] dark:text-[#E5C068]',
      cardTaglineText: 'text-[#991B1B] dark:text-[#F2B8B5]',
      cardRibbonBadge:
        'bg-[#14532D]/92 text-[#FDF6E3] border border-[#D4AF37]/50',
      lockNoticeBox:
        'border border-[#E6D6BC] bg-[#FAF4E8] text-[#3F3A34] dark:border-[#27483A] dark:bg-[#0D1A15] dark:text-[#E6DEC8]',
      lockIconColor: 'text-[#991B1B] dark:text-[#E5C068]',
      primaryButton:
        'bg-[#991B1B] text-[#FFFDF8] hover:bg-[#7F1D1D] shadow-sm',
      secondaryButton:
        'border border-[#C89B3C]/50 bg-[#FFFDF9] text-[#14532D] hover:bg-[#F7EFE0] dark:border-[#D4AF37]/40 dark:bg-[#142920] dark:text-[#F3D58D] dark:hover:bg-[#1A352A]',
      activeTabPrimary: 'bg-[#991B1B] text-[#FFFDF8]',
      activeTabSecondary: 'bg-[#14532D] text-[#FDF6E3]',
      corporateBanner:
        'border border-[#D4AF37]/40 bg-gradient-to-r from-[#0F3325] via-[#144230] to-[#6E1717] text-[#FDF8EC]',
      corporateEyebrow: 'text-[#F3D58D]',
      unboxingLidClass:
        'bg-gradient-to-b from-[#991B1B] to-[#7F1D1D] border border-[#D4AF37]/50',
      unboxingBodyClass:
        'bg-gradient-to-b from-[#14532D] to-[#0D3B20] border border-[#D4AF37]/40',
      unboxingRibbonClass: 'bg-gradient-to-b from-[#F3D58D] via-[#D4AF37] to-[#B08926]',
      unboxingConfettiColors: ['#991B1B', '#14532D', '#D4AF37', '#F3D58D', '#DC2626', '#166534'],
    };
  }

  return {
    isChristmas: false,
    pageCanvas: 'bg-[#FFF8F0] text-neutral-950 dark:bg-[#140E1A] dark:text-white',
    sectionBg:
      'border-y border-[#E9D8C8] bg-[#FFF8F0] dark:border-purple-900/40 dark:bg-[#140E1A]',
    promoBar: 'bg-[#6B21A8] text-white',
    headerSurface:
      'border-b border-[#EAD9C8] bg-white/95 backdrop-blur-md dark:border-purple-900/40 dark:bg-[#1B1325]/95',
    heroCard:
      'border border-[#EAD9C8] bg-white shadow-sm dark:border-purple-900/40 dark:bg-[#1C1425]',
    heroEyebrow: 'text-[#6B21A8] dark:text-purple-300',
    heroQuote: 'text-[#FF6B35]',
    cardSurface:
      'border border-[#EAD9C8] bg-white dark:border-purple-900/40 dark:bg-[#1C1425]',
    cardHoverBorder: 'hover:border-[#FF6B35]/60 dark:hover:border-[#FF6B35]/60',
    cardCategoryText: 'text-[#6B21A8] dark:text-purple-300',
    cardTaglineText: 'text-[#FF6B35]',
    cardRibbonBadge:
      'bg-white/95 text-[#6B21A8] dark:bg-[#1A1224]/95 dark:text-purple-200',
    lockNoticeBox:
      'border border-[#EAD9C8] bg-[#FFF8F0] text-neutral-700 dark:border-purple-900/40 dark:bg-purple-950/30 dark:text-purple-100',
    lockIconColor: 'text-[#6B21A8] dark:text-purple-300',
    primaryButton: 'bg-[#FF6B35] text-white hover:bg-[#EA5822] shadow-sm',
    secondaryButton:
      'border border-[#6B21A8]/30 bg-white text-[#6B21A8] hover:bg-[#6B21A8]/5 dark:border-purple-400/30 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-900/40',
    activeTabPrimary: 'bg-[#FF6B35] text-white',
    activeTabSecondary: 'bg-[#6B21A8] text-white',
    corporateBanner: 'border border-[#6B21A8]/25 bg-[#6B21A8] text-white',
    corporateEyebrow: 'text-amber-300',
    unboxingLidClass: 'bg-gradient-to-b from-[#7E22CE] to-[#581C87]',
    unboxingBodyClass: 'bg-gradient-to-b from-[#6B21A8] to-[#4C1D95]',
    unboxingRibbonClass: 'bg-[#FF6B35]',
    unboxingConfettiColors: ['#FF6B35', '#6B21A8', '#F59E0B', '#EC4899', '#10B981', '#FBBF24'],
  };
}
