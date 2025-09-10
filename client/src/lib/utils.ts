import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid } from 'date-fns'

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

/**
 * Safely converts various date/time formats to local time display
 * Handles UTC strings without timezone indicators, ISO strings with timezone, and timestamps
 * @param dateValue - Date string, number timestamp, or Date object
 * @param formatPattern - Date format pattern for date-fns
 * @returns Formatted local time string or fallback for invalid dates
 */
export function formatToLocalTime(dateValue: string | number | Date | null | undefined, formatPattern: string = 'MMM dd, yyyy • hh:mm a'): string {
  if (!dateValue) {
    return 'Date not available';
  }

  try {
    let date: Date;

    if (typeof dateValue === 'number') {
      // Assume timestamp in milliseconds
      date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      const trimmed = dateValue.trim();
      
      // Check if already has timezone info (Z, +HH:MM, -HH:MM, +HHMM, -HHMM)
      const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(trimmed);
      
      if (hasTimezone) {
        // Already has timezone, parse as-is
        date = parseISO(trimmed);
      } else {
        // No timezone indicator, treat as UTC by appending Z
        date = parseISO(trimmed + 'Z');
      }
    } else {
      return 'Invalid date format';
    }

    // Validate the resulting date
    if (!isValid(date)) {
      console.warn('Invalid date parsed:', dateValue);
      return 'Invalid date';
    }

    return format(date, formatPattern);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateValue);
    return 'Date error';
  }
}

/**
 * Formats currency amount using the specified currency code
 * @param amount - Amount to format (in base currency units)
 * @param currencyCode - Currency code (e.g., 'PKR', 'USD', 'EUR')
 * @returns Formatted currency string
 */
export function formatBranchCurrency(amount: number, currencyCode: string = 'PKR'): string {
  try {
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return `${currencyCode} ${formattedAmount}`;
  } catch (error) {
    console.error('Error formatting currency:', error, 'Amount:', amount, 'Currency:', currencyCode);
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
