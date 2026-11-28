import type { MysteryBoxSeasonalEdition } from './mysteryBoxes';

// Christmas Special Edition sealed luxury gift boxes (100% closed opaque presents, zero food visible)
import xmasHeroImg from '../assets/images/xmas_mystery_hero_1795873212104.jpg';
import xmasLittleBoxImg from '../assets/images/xmas_little_box_1795873213530.jpg';
import xmasHappyBoxImg from '../assets/images/xmas_happy_box_1795873214000.jpg';
import xmasCelebrationBoxImg from '../assets/images/xmas_celebration_box_1795873216100.jpg';
import xmasPremiumBoxImg from '../assets/images/xmas_premium_box_1795873219109.jpg';
import xmasUltimateBoxImg from '../assets/images/xmas_ultimate_box_1795873219347.jpg';

// Classic year-round sealed luxury gift boxes (used when seasonalEdition is switched off Christmas)
import sealedMysteryHeroImg from '../assets/images/sealed_mystery_hero_1795871910247.jpg';
import sealedLittleBoxImg from '../assets/images/sealed_little_box_1795871910689.jpg';
import sealedHappyBoxImg from '../assets/images/sealed_happy_box_1795871912000.jpg';
import sealedCelebrationBoxImg from '../assets/images/sealed_celebration_box_1795871913205.jpg';
import sealedPremiumBoxImg from '../assets/images/sealed_premium_box_1795871914370.jpg';
import sealedUltimateBoxImg from '../assets/images/sealed_ultimate_box_1795871915369.jpg';

// Post-unboxing revealed treat photos (ONLY rendered inside MysteryBoxUnboxingModal AFTER verified payment)
import revealedHeroImg from '../assets/images/mystery_box_hero_1795865787615.jpg';
import revealedLittleImg from '../assets/images/mystery_little_box_1795865788645.jpg';
import revealedHappyImg from '../assets/images/mystery_happy_box_1795865789325.jpg';
import revealedCelebrationImg from '../assets/images/mystery_celebration_box_1795865790804.jpg';
import revealedPremiumImg from '../assets/images/mystery_premium_box_1795865791948.jpg';
import revealedUltimateImg from '../assets/images/mystery_ultimate_box_1795865791391.jpg';

export const CHRISTMAS_BOX_IMAGES: Record<string, string> = {
  hero: xmasHeroImg,
  little: xmasLittleBoxImg,
  happy: xmasHappyBoxImg,
  celebration: xmasCelebrationBoxImg,
  premium: xmasPremiumBoxImg,
  ultimate: xmasUltimateBoxImg,
};

export const CLASSIC_SEALED_BOX_IMAGES: Record<string, string> = {
  hero: sealedMysteryHeroImg,
  little: sealedLittleBoxImg,
  happy: sealedHappyBoxImg,
  celebration: sealedCelebrationBoxImg,
  premium: sealedPremiumBoxImg,
  ultimate: sealedUltimateBoxImg,
};

export const MYSTERY_BOX_HERO_IMAGE = xmasHeroImg;

/** Active default sealed-only closed gift box photos (Christmas Special Edition). */
export const MYSTERY_BOX_IMAGE_BY_KEY: Record<string, string> = CHRISTMAS_BOX_IMAGES;

/** Revealed bakery & goodies photos used ONLY after verified payment during/after unboxing. */
const REVEALED_ITEM_IMAGE_BY_KEY: Record<string, string> = {
  hero: revealedHeroImg,
  little: revealedLittleImg,
  happy: revealedHappyImg,
  celebration: revealedCelebrationImg,
  premium: revealedPremiumImg,
  ultimate: revealedUltimateImg,
};

function getEditionImageMap(edition: MysteryBoxSeasonalEdition = 'christmas'): Record<string, string> {
  return edition === 'christmas' ? CHRISTMAS_BOX_IMAGES : CLASSIC_SEALED_BOX_IMAGES;
}

export function getMysteryBoxHeroImage(edition: MysteryBoxSeasonalEdition = 'christmas'): string {
  return getEditionImageMap(edition).hero;
}

export function resolveMysteryBoxImage(
  raw?: string | null,
  fallbackKey = 'celebration',
  edition: MysteryBoxSeasonalEdition = 'christmas'
): string {
  const map = getEditionImageMap(edition);
  const fallback = map[fallbackKey] || map.celebration;

  if (!raw || !raw.trim()) {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('preset:')) {
    const key = trimmed.slice('preset:'.length);
    return map[key] || fallback;
  }
  if (trimmed.includes('little_box')) return map.little;
  if (trimmed.includes('happy_box')) return map.happy;
  if (trimmed.includes('celebration_box')) return map.celebration;
  if (trimmed.includes('premium_box')) return map.premium;
  if (trimmed.includes('ultimate_box')) return map.ultimate;
  if (trimmed.includes('mystery_hero') || trimmed.includes('mystery_box_hero')) {
    return map.hero;
  }
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return fallback;
}

export function resolveRevealedItemImage(raw?: string | null, fallbackKey = 'celebration'): string {
  if (!raw || !raw.trim()) {
    return REVEALED_ITEM_IMAGE_BY_KEY[fallbackKey] || revealedCelebrationImg;
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('preset:')) {
    const key = trimmed.slice('preset:'.length);
    return (
      REVEALED_ITEM_IMAGE_BY_KEY[key] ||
      REVEALED_ITEM_IMAGE_BY_KEY[fallbackKey] ||
      revealedCelebrationImg
    );
  }
  if (trimmed.includes('little_box')) return revealedLittleImg;
  if (trimmed.includes('happy_box')) return revealedHappyImg;
  if (trimmed.includes('celebration_box')) return revealedCelebrationImg;
  if (trimmed.includes('premium_box')) return revealedPremiumImg;
  if (trimmed.includes('ultimate_box')) return revealedUltimateImg;
  if (trimmed.includes('mystery_hero') || trimmed.includes('mystery_box_hero')) {
    return revealedHeroImg;
  }
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return REVEALED_ITEM_IMAGE_BY_KEY[fallbackKey] || revealedCelebrationImg;
}
