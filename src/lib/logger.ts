// Production-ready logging utility with Sentry integration
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.log(message, ...args);
    }
    // Don't send regular logs to Sentry to avoid noise
  },
  
  error: (message: string, error?: any, extra?: Record<string, any>) => {
    // Always log errors to console
    console.error(message, error);
    
    // Send to Sentry in all environments for error tracking
    Sentry.captureException(error || new Error(message), {
      tags: {
        component: 'fusion-alarm',
        level: 'error'
      },
      extra: {
        message,
        ...extra
      }
    });
  },
  
  warn: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.warn(message, ...args);
    }
    
    // Send warnings to Sentry in production only
    if (isProduction) {
      Sentry.captureMessage(message, 'warning');
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.info(message, ...args);
    }
    // Don't send info logs to Sentry to avoid noise
  },
  
  // Security-related events
  security: (message: string, extra?: Record<string, any>) => {
    console.warn(`[SECURITY] ${message}`, extra);
    
    // Always send security events to Sentry
    Sentry.captureMessage(`Security Event: ${message}`, {
      level: 'warning',
      tags: {
        component: 'fusion-alarm',
        category: 'security'
      },
      extra
    });
  },
  
  // Performance monitoring
  performance: (operation: string, duration: number, extra?: Record<string, any>) => {
    if (!isProduction) {
      console.log(`[PERF] ${operation}: ${duration}ms`, extra);
    }
    
    // Send performance data to Sentry
    Sentry.addBreadcrumb({
      category: 'performance',
      message: `${operation} took ${duration}ms`,
      level: 'info',
      data: extra
    });
  }
};

// Only expose debug logging in development
export const debug = {
  log: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}; 