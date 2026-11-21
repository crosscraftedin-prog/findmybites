import type { ProductFoodType } from '../data/vendors';

interface FoodTypeIconProps {
  foodType: ProductFoodType;
  size?: 'xs' | 'sm';
}

export function FoodTypeIcon({ foodType, size = 'sm' }: FoodTypeIconProps) {
  const isVeg = foodType === 'veg';
  const boxCls = size === 'xs' ? 'size-3 rounded-[2px]' : 'size-3.5 rounded-[3px]';
  const dotCls = size === 'xs' ? 'size-1.5' : 'size-2';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border-[1.5px] bg-white dark:bg-neutral-950 ${boxCls} ${
        isVeg ? 'border-emerald-600' : 'border-red-600'
      }`}
    >
      <span
        className={`rounded-full ${dotCls} ${isVeg ? 'bg-emerald-600' : 'bg-red-600'}`}
      />
    </span>
  );
}

interface FoodTypeBadgeProps {
  foodType?: ProductFoodType;
  size?: 'xs' | 'sm';
  className?: string;
}

export function FoodTypeBadge({ foodType, size = 'sm', className = '' }: FoodTypeBadgeProps) {
  if (!foodType) return null;
  const isVeg = foodType === 'veg';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border font-bold whitespace-nowrap ${
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${
        isVeg
          ? 'border-emerald-600/35 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-300'
          : 'border-red-600/35 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-300'
      } ${className}`}
    >
      <FoodTypeIcon foodType={foodType} size={size} />
      {isVeg ? 'Veg' : 'Non-Veg'}
    </span>
  );
}
