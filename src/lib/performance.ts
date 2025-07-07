// Performance monitoring utility - OPTIMIZED VERSION
import { analytics } from './analytics';
import { logger } from './logger';

const isProduction = process.env.NODE_ENV === 'production';
const isDev = !isProduction;

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
}

interface APICallMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  success: boolean;
  timestamp: Date;
}

class PerformanceMonitor {
  private apiCallsBuffer: APICallMetric[] = [];
  private readonly maxBufferSize = 20; // Reduced from 100
  private criticalThreshold = 3000; // 3 seconds
  private isInitialized = false;

  constructor() {
    // Only initialize performance monitoring in production
    if (isProduction && typeof window !== 'undefined') {
      this.initializeWebVitals();
    }
  }

  private initializeWebVitals() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Use a lightweight approach to Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          this.handleNavigationTiming(entry as PerformanceNavigationTiming);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['navigation'] });
    } catch (e) {
      // Silent fallback for older browsers
    }
  }

  private handleNavigationTiming(entry: PerformanceNavigationTiming) {
    const pageLoadTime = entry.loadEventEnd - entry.loadEventStart;
    
    // Only track if page load is slow
    if (pageLoadTime > 3000) {
      analytics.trackPerformance('page_load_slow', pageLoadTime);
      
      if (isDev) {
        console.warn(`Slow page load detected: ${pageLoadTime}ms`);
      }
    }
  }

  // Simplified API call tracking - only track issues
  trackAPICall(metric: APICallMetric) {
    // Only track failed or slow API calls
    if (!metric.success || metric.duration > this.criticalThreshold) {
      this.apiCallsBuffer.push(metric);
      
      // Keep buffer size manageable
      if (this.apiCallsBuffer.length > this.maxBufferSize) {
        this.apiCallsBuffer.shift();
      }

      // Only log critical issues
      if (isDev) {
        console.warn(`API Issue: ${metric.endpoint} - ${metric.duration}ms - ${metric.success ? 'SLOW' : 'FAILED'}`);
      }

      analytics.trackAPICall(metric.endpoint, metric.method, metric.success, metric.duration);
    }
  }

  // Simplified metric tracking
  trackMetric(metric: PerformanceMetric) {
    // Only track poor performance
    if (metric.rating === 'poor') {
      analytics.trackPerformance(metric.name, metric.value, metric.rating);
      
      if (isDev) {
        console.warn(`Performance issue: ${metric.name} = ${metric.value}`);
      }
    }
  }

  // Simplified async function measurement
  async measureAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>,
    logThreshold = 2000 // Only log if over 2 seconds
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      // Only log slow operations
      if (duration > logThreshold) {
        if (isDev) {
          console.warn(`Slow operation: ${name} took ${duration.toFixed(0)}ms`);
        }
        analytics.trackPerformance(`function-${name}`, duration, 'execution');
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error(`Function failed: ${name}`, error as Error, {
        duration: duration.toFixed(0),
        functionName: name,
      });
      
      throw error;
    }
  }

  // Simplified synchronous function measurement  
  measureFunction<T>(
    name: string, 
    fn: () => T,
    logThreshold = 1000 // Only log if over 1 second
  ): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      // Only log slow operations
      if (duration > logThreshold) {
        if (isDev) {
          console.warn(`Slow sync operation: ${name} took ${duration.toFixed(0)}ms`);
        }
        analytics.trackPerformance(`function-${name}`, duration, 'execution');
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error(`Function failed: ${name}`, error as Error, {
        duration: duration.toFixed(0),
        functionName: name,
      });
      
      throw error;
    }
  }

  // Get performance summary (lightweight)
  getPerformanceSummary() {
    const failedCalls = this.apiCallsBuffer.filter(call => !call.success);
    const slowCalls = this.apiCallsBuffer.filter(call => call.success && call.duration > this.criticalThreshold);
    
    return {
      totalIssues: this.apiCallsBuffer.length,
      failedCalls: failedCalls.length,
      slowCalls: slowCalls.length,
      avgSlowCallDuration: slowCalls.length > 0 
        ? slowCalls.reduce((sum, call) => sum + call.duration, 0) / slowCalls.length 
        : 0
    };
  }

  // Clear performance data
  clearData() {
    this.apiCallsBuffer = [];
  }

  // Disable performance monitoring (for debugging)
  disable() {
    this.clearData();
    this.isInitialized = false;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function to track fetch operations
export const trackFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const startTime = performance.now();
  const endpoint = url.replace(/\?.*$/, ''); // Remove query params for cleaner logging
  
  try {
    const response = await fetch(url, options);
    const duration = performance.now() - startTime;
    
    performanceMonitor.trackAPICall({
      endpoint,
      method: options.method || 'GET',
      duration,
      status: response.status,
      success: response.ok,
      timestamp: new Date(),
    });
    
    return response;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    performanceMonitor.trackAPICall({
      endpoint,
      method: options.method || 'GET',
      duration,
      status: 0,
      success: false,
      timestamp: new Date(),
    });
    
    throw error;
  }
};

// Performance debugging utilities (dev only)
export const perfDebug = {
  getSummary: () => performanceMonitor.getPerformanceSummary(),
  clear: () => performanceMonitor.clearData(),
  disable: () => performanceMonitor.disable(),
  
  // Memory usage (if available)
  getMemoryUsage: () => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
      };
    }
    return null;
  }
}; 