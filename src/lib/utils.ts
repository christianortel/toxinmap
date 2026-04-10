import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatYearRange(startYear: number, endYear?: number) {
  return endYear ? `${startYear}-${endYear}` : `${startYear}`;
}
