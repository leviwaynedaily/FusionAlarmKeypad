import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Global debug logging utility
 * Checks localStorage for debug mode setting and provides consistent logging
 */
export const globalDebugLog = (message: string, data?: any) => {
  if (typeof window !== 'undefined') {
    const debugMode = localStorage.getItem('fusion_debug_mode') === 'true';
    if (debugMode) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
};

/**
 * Check if debug mode is currently enabled
 */
export const isDebugMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fusion_debug_mode') === 'true';
  }
  return false;
};
