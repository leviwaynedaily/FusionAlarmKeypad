// 🔒 SECURITY: Basic rate limiting utility

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private requests: Map<string, RateLimitInfo> = new Map();
  private readonly defaultLimit = 60; // requests per minute
  private readonly defaultWindow = 60 * 1000; // 1 minute in ms

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @param limit - Max requests per window (default: 60)
   * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
   * @returns Object with isAllowed boolean and remaining count
   */
  checkLimit(
    identifier: string, 
    limit: number = this.defaultLimit, 
    windowMs: number = this.defaultWindow
  ): { isAllowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const current = this.requests.get(identifier);

    // Clean up old entries
    this.cleanup();

    if (!current || now > current.resetTime) {
      // New window or expired entry
      const resetTime = now + windowMs;
      this.requests.set(identifier, { count: 1, resetTime });
      return { isAllowed: true, remaining: limit - 1, resetTime };
    }

    if (current.count >= limit) {
      // Rate limit exceeded
      return { isAllowed: false, remaining: 0, resetTime: current.resetTime };
    }

    // Increment counter
    current.count += 1;
    this.requests.set(identifier, current);
    return { isAllowed: true, remaining: limit - current.count, resetTime: current.resetTime };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.requests.entries()) {
      if (now > info.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Get current rate limit status for an identifier
   */
  getStatus(identifier: string): { count: number; resetTime: number } | null {
    const current = this.requests.get(identifier);
    if (!current || Date.now() > current.resetTime) {
      return null;
    }
    return current;
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clear all rate limits (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

/**
 * Middleware helper for Next.js API routes
 */
export function withRateLimit(
  limit: number = 60,
  windowMs: number = 60 * 1000,
  keyGenerator: (req: Request) => string = (req) => getClientIP(req)
) {
  return function rateLimit(req: Request): { isAllowed: boolean; headers: Record<string, string> } {
    const identifier = keyGenerator(req);
    const { isAllowed, remaining, resetTime } = rateLimiter.checkLimit(identifier, limit, windowMs);

    const headers = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    };

    return { isAllowed, headers };
  };
}

/**
 * Extract client IP from request
 */
function getClientIP(req: Request): string {
  // Check various headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback to connection IP (may not be available in all environments)
  return 'unknown';
}

/**
 * Rate limiting presets for different types of endpoints
 */
export const RateLimitPresets = {
  // Very strict for auth endpoints
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  
  // Moderate for API endpoints
  API: { limit: 60, windowMs: 60 * 1000 }, // 60 requests per minute
  
  // Lenient for general endpoints
  GENERAL: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  
  // Strict for expensive operations
  EXPENSIVE: { limit: 10, windowMs: 60 * 1000 }, // 10 requests per minute
} as const;