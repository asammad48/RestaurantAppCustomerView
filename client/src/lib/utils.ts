import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format decimal values to 2 decimal places
export function formatDecimalToTwoPlaces(value: number): number {
  return Math.round(value * 100) / 100;
}

// Format branch decimal fields to 2 decimal places
export function formatBranchDecimals<T extends Record<string, any>>(branch: T): T {
  const fieldsToFormat = ['deliveryCharges', 'minDeliveryAmount', 'serviceCharges', 'taxPercentage', 'maxDiscountAmount'];
  
  const formatted = { ...branch } as any;
  
  fieldsToFormat.forEach(field => {
    if (typeof formatted[field] === 'number') {
      formatted[field] = formatDecimalToTwoPlaces(formatted[field]);
    }
  });
  
  return formatted as T;
}
