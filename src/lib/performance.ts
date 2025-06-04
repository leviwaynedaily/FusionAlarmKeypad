// Performance monitoring utility
import { analytics } from './analytics';
import { logger } from './logger';

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
}

class PerformanceMonitor {
  private apiCallsBuffer: APICallMetric[] = [];
  private readonly maxBufferSize = 100;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals();
      this.setupPerformanceObserver();
    }
  }

  // Initialize Core Web Vitals tracking
  private async initializeWebVitals() {
    try {
      const { onCLS, onINP, onFCP, onLCP, onTTFB } = await import('web-vitals');

      // Largest Contentful Paint
      onLCP((metric: { value: number; id?: string; delta?: number }) => {
        this.reportWebVital('LCP', metric);
      });

      // Interaction to Next Paint (replaces FID)
      onINP((metric: { value: number; id?: string; delta?: number }) => {
        this.reportWebVital('INP', metric);
      });

      // Cumulative Layout Shift
      onCLS((metric: { value: number; id?: string; delta?: number }) => {
        this.reportWebVital('CLS', metric);
      });

      // First Contentful Paint
      onFCP((metric: { value: number; id?: string; delta?: number }) => {
        this.reportWebVital('FCP', metric);
      });

      // Time to First Byte
      onTTFB((metric: { value: number; id?: string; delta?: number }) => {
        this.reportWebVital('TTFB', metric);
      });
    } catch (error) {
      // Web vitals library not available, skip
      console.warn('Web Vitals library not available');
    }
  }

  // Setup Performance Observer for additional metrics
  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        // Navigation timing
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.reportNavigationTiming(navEntry);
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });

        // Resource timing for critical resources
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.reportResourceTiming(resourceEntry);
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

      } catch (error) {
        console.warn('PerformanceObserver not supported');
      }
    }
  }

  // Report Core Web Vitals
  private reportWebVital(name: string, metric: { value: number; id?: string; delta?: number }) {
    const rating = this.getWebVitalRating(name, metric.value);
    
    logger.performance(`Core Web Vital: ${name}`, metric.value, {
      rating,
      id: metric.id,
      delta: metric.delta,
    });

    analytics.trackPerformance(name, metric.value, `web-vital-${rating}`);

    // Send to analytics
    this.trackMetric({
      name: `core-web-vital-${name.toLowerCase()}`,
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
    });
  }

  // Get rating for web vitals based on thresholds
  private getWebVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      LCP: [2500, 4000],  // ms
      FID: [100, 300],    // ms
      CLS: [0.1, 0.25],   // ratio
      FCP: [1800, 3000],  // ms
      TTFB: [800, 1800],  // ms
    };

    const [good, poor] = thresholds[name as keyof typeof thresholds] || [0, 0];
    
    if (value <= good) return 'good';
    if (value <= poor) return 'needs-improvement';
    return 'poor';
  }

  // Report navigation timing
  private reportNavigationTiming(entry: PerformanceNavigationTiming) {
    const metrics = {
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      domComplete: entry.domComplete - entry.fetchStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      firstByte: entry.responseStart - entry.requestStart,
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
    };

    Object.entries(metrics).forEach(([name, value]) => {
      if (value > 0) {
        logger.performance(`Navigation: ${name}`, value);
        analytics.trackPerformance(`navigation-${name}`, value, 'timing');
      }
    });
  }

  // Report resource timing for critical resources
  private reportResourceTiming(entry: PerformanceResourceTiming) {
    // Only track critical resources to avoid noise
    const criticalResources = ['.js', '.css', '.woff', '.woff2'];
    const isCritical = criticalResources.some(ext => entry.name.includes(ext));
    
    if (isCritical && entry.duration > 100) { // Only slow resources
      logger.performance(`Resource load: ${entry.name}`, entry.duration, {
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
      });

      analytics.trackPerformance('resource-load', entry.duration, 'critical-resource');
    }
  }

  // Track API call performance
  trackAPICall(metric: APICallMetric) {
    this.apiCallsBuffer.push(metric);
    
    // Keep buffer size manageable
    if (this.apiCallsBuffer.length > this.maxBufferSize) {
      this.apiCallsBuffer.shift();
    }

    logger.performance(`API Call: ${metric.endpoint}`, metric.duration, {
      method: metric.method,
      status: metric.status,
      success: metric.success,
    });

    analytics.trackAPICall(metric.endpoint, metric.method, metric.success, metric.duration);

    // Alert on slow API calls
    if (metric.duration > 5000) { // 5 seconds
      logger.warn(`Slow API call detected: ${metric.endpoint} took ${metric.duration}ms`);
    }

    // Alert on API failures
    if (!metric.success) {
      logger.error(`API call failed: ${metric.endpoint}`, new Error(`Status: ${metric.status}`), {
        endpoint: metric.endpoint,
        method: metric.method,
        status: metric.status,
        duration: metric.duration,
      });
    }
  }

  // Track custom performance metrics
  trackMetric(metric: PerformanceMetric) {
    analytics.trackPerformance(metric.name, metric.value, metric.rating);

    // Log performance issues
    if (metric.rating === 'poor') {
      logger.warn(`Poor performance detected: ${metric.name} = ${metric.value}`, {
        metric: metric.name,
        value: metric.value,
        rating: metric.rating,
      });
    }
  }

  // Measure function execution time
  async measureAsyncFunction<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      logger.performance(`Function: ${name}`, duration);
      analytics.trackPerformance(`function-${name}`, duration, 'execution');
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error(`Function failed: ${name}`, error as Error, {
        duration,
        functionName: name,
      });
      
      throw error;
    }
  }

  // Measure synchronous function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      logger.performance(`Function: ${name}`, duration);
      analytics.trackPerformance(`function-${name}`, duration, 'execution');
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      logger.error(`Function failed: ${name}`, error as Error, {
        duration,
        functionName: name,
      });
      
      throw error;
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const recentAPICalls = this.apiCallsBuffer.slice(-10);
    const avgAPITime = recentAPICalls.length > 0 
      ? recentAPICalls.reduce((sum, call) => sum + call.duration, 0) / recentAPICalls.length
      : 0;

    return {
      averageAPICallTime: Math.round(avgAPITime),
      totalAPICalls: this.apiCallsBuffer.length,
      failedAPICalls: this.apiCallsBuffer.filter(call => !call.success).length,
      recentAPICalls,
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Decorator for measuring function performance
export function measurePerformance(name?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureFunction(metricName, () => method.apply(this, args));
    };
  };
} 