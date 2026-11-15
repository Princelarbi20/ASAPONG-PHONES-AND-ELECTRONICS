import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price) {
  if (price === null || price === undefined) return "GH₵ 0";

  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return "GH₵ 0";

  // Check if price has decimals
  const hasDecimals = numPrice % 1 !== 0;

  // Format with comma separator
  const formatted = numPrice.toLocaleString('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  });

  return `GH₵ ${formatted}`;
}
