// 🔒 SECURITY: Secure logging utilities to prevent sensitive data exposure

/**
 * Masks sensitive strings like API keys for safe logging
 * @param value - The sensitive value to mask
 * @param showStart - Number of characters to show at start (default: 8)
 * @param showEnd - Number of characters to show at end (default: 4)
 * @returns Masked string like "abc12345...wxyz" or "NONE" if empty
 */
export function maskSensitiveValue(value: string | null | undefined, showStart = 8, showEnd = 4): string {
  if (!value || value.length === 0) {
    return 'NONE';
  }
  
  if (value.length <= showStart + showEnd) {
    // If string is too short, mask more aggressively
    return value.length <= 4 ? '****' : `${value.substring(0, 2)}...${value.substring(value.length - 2)}`;
  }
  
  return `${value.substring(0, showStart)}...${value.substring(value.length - showEnd)}`;
}

/**
 * Removes sensitive fields from objects before logging
 * @param obj - Object that might contain sensitive data
 * @returns Safe object for logging
 */
export function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogging(item));
  }
  
  const sensitiveFields = [
    'apiKey', 'api_key', 'x-api-key', 
    'password', 'token', 'secret', 'key',
    'authorization', 'auth', 'credential',
    'private', 'sensitive'
  ];
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => keyLower.includes(field));
    
    if (isSensitive && typeof value === 'string') {
      sanitized[key] = maskSensitiveValue(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Safe console.log that automatically sanitizes sensitive data
 * @param message - Log message
 * @param data - Optional data to log (will be sanitized)
 */
export function secureLog(message: string, data?: any): void {
  if (data !== undefined) {
    console.log(message, sanitizeForLogging(data));
  } else {
    console.log(message);
  }
}

/**
 * Safe console.error that automatically sanitizes sensitive data
 * @param message - Error message
 * @param data - Optional data to log (will be sanitized)
 */
export function secureError(message: string, data?: any): void {
  if (data !== undefined) {
    console.error(message, sanitizeForLogging(data));
  } else {
    console.error(message);
  }
}