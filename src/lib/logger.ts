// Production-ready logging utility with Sentry integration - OPTIMIZED VERSION
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';
const isDev = !isProduction;

// Log levels for filtering
enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  LOG = 3,
  DEBUG = 4
}

// Current log level (can be adjusted)
const currentLogLevel = isDev ? LogLevel.WARN : LogLevel.ERROR;

export const logger = {
  log: (message: string, ...args: any[]) => {
    // Only log in development and if above threshold
    if (isDev && currentLogLevel >= LogLevel.LOG) {
      console.log(message, ...args);
    }
    // Don't send regular logs to Sentry to avoid noise
  },
  
  error: (message: string, error?: any, extra?: Record<string, any>) => {
    // Always log errors to console (critical)
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
    // Only log warnings in development if above threshold
    if (isDev && currentLogLevel >= LogLevel.WARN) {
      console.warn(message, ...args);
    }
    
    // Send warnings to Sentry in production only
    if (isProduction) {
      Sentry.captureMessage(message, 'warning');
    }
  },
  
  info: (message: string, ...args: any[]) => {
    // Only log info in development if above threshold
    if (isDev && currentLogLevel >= LogLevel.INFO) {
      console.info(message, ...args);
    }
    // Don't send info logs to Sentry to avoid noise
  },
  
  // Security-related events (always log)
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
  
  // Performance monitoring (reduced logging)
  performance: (operation: string, duration: number, extra?: Record<string, any>) => {
    // Only log slow operations in development
    if (isDev && duration > 1000) {
      console.log(`[PERF] ${operation}: ${duration}ms`, extra);
    }
    
    // Send performance data to Sentry only for slow operations
    if (duration > 3000) { // Only operations slower than 3 seconds
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${operation} took ${duration}ms`,
        level: 'warning',
        data: extra
      });
    }
  }
};

// Debug logging (heavily reduced)
export const debug = {
  log: (message: string, ...args: any[]) => {
    // Only log debug messages if explicitly enabled and at debug level
    if (isDev && currentLogLevel >= LogLevel.DEBUG && process.env.ENABLE_DEBUG_LOGS === 'true') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};

// Utility to change log level at runtime (for debugging)
export const setLogLevel = (level: 'error' | 'warn' | 'info' | 'log' | 'debug') => {
  if (isDev) {
    const levelMap = {
      error: LogLevel.ERROR,
      warn: LogLevel.WARN,
      info: LogLevel.INFO,
      log: LogLevel.LOG,
      debug: LogLevel.DEBUG
    };
    
    (window as any).__fusionLogLevel = levelMap[level];
    console.log(`Log level set to: ${level}`);
  }
};

// Batch logger for reducing console spam
class BatchLogger {
  private buffer: Array<{ level: string; message: string; args: any[]; timestamp: number }> = [];
  private flushInterval = 5000; // 5 seconds
  private maxBufferSize = 10;
  private lastFlush = Date.now();

  constructor() {
    if (isDev) {
      setInterval(() => this.flush(), this.flushInterval);
    }
  }

  batch(level: string, message: string, ...args: any[]) {
    if (!isDev) return;

    this.buffer.push({
      level,
      message,
      args,
      timestamp: Date.now()
    });

    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private flush() {
    if (this.buffer.length === 0) return;

    const grouped = this.buffer.reduce((acc, log) => {
      const key = `${log.level}:${log.message}`;
      if (!acc[key]) {
        acc[key] = { count: 0, first: log, last: log };
      }
      acc[key].count++;
      acc[key].last = log;
      return acc;
    }, {} as Record<string, { count: number; first: any; last: any }>);

    // Log grouped messages
    Object.values(grouped).forEach(({ count, first, last }) => {
      const consoleMethod = first.level === 'error' ? console.error :
                           first.level === 'warn' ? console.warn :
                           first.level === 'info' ? console.info :
                           console.log;
      
      if (count === 1) {
        consoleMethod(first.message, ...first.args);
      } else {
        consoleMethod(
          `${first.message} (${count} times, last: ${new Date(last.timestamp).toLocaleTimeString()})`,
          ...first.args
        );
      }
    });

    this.buffer = [];
    this.lastFlush = Date.now();
  }
}

export const batchLogger = new BatchLogger(); 