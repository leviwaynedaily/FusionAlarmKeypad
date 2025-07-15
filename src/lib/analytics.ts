// Analytics tracking utility - OPTIMIZED VERSION
import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === 'production';

interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
}

interface UserProperties {
  userId?: string;
  organizationId?: string;
  locationId?: string;
  deviceType?: string;
  appVersion?: string;
}

class Analytics {
  private userProperties: UserProperties = {};
  private eventBuffer: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 30000; // 30 seconds
  private lastFlush = Date.now();

  constructor() {
    // Only enable batching in production
    if (isProduction) {
      setInterval(() => this.flushEvents(), this.flushInterval);
    }
  }

  setUserProperties(properties: UserProperties) {
    this.userProperties = { ...this.userProperties, ...properties };
    
    // Only send to Sentry in production
    if (isProduction) {
      Sentry.setUser({
        id: properties.userId,
        organizationId: properties.organizationId,
        locationId: properties.locationId,
      });
    }
  }

  // Optimized track method with reduced overhead
  track(event: AnalyticsEvent) {
    // Skip non-essential events in development
    if (!isProduction) {
      // Only log important events in development
      if (this.isImportantEvent(event)) {
        console.log('[ANALYTICS]', event.action, event.category);
      }
      return;
    }

    // In production, batch events for efficiency
    this.eventBuffer.push(event);
    
    if (this.eventBuffer.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  private isImportantEvent(event: AnalyticsEvent): boolean {
    const importantCategories = ['authentication', 'security', 'errors'];
    const importantActions = ['login_success', 'login_failure', 'error_occurred', 'sse_connected'];
    
    return importantCategories.includes(event.category) || 
           importantActions.includes(event.action);
  }

  private flushEvents() {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.lastFlush = Date.now();

    // Batch process events
    for (const event of events) {
      this.processEvent(event);
    }
  }

  private processEvent(event: AnalyticsEvent) {
    const eventData = {
      ...event,
      timestamp: new Date().toISOString(),
      userProperties: this.userProperties,
    };

    // Send to Sentry only for critical events
    if (this.isCriticalEvent(event)) {
      Sentry.addBreadcrumb({
        category: 'user-action',
        message: `${event.category}: ${event.action}`,
        level: event.category === 'errors' ? 'error' : 'info',
        data: {
          label: event.label,
          value: event.value,
        },
      });
    }

    // Google Analytics integration
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
      });
    }

    // Send to custom analytics endpoint (batched)
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      }).catch(() => {
        // Silent fail
      });
    }
  }

  private isCriticalEvent(event: AnalyticsEvent): boolean {
    return event.category === 'errors' || 
           event.category === 'security' || 
           event.action === 'sse_error' ||
           event.action === 'login_failure';
  }

  // Simplified tracking methods with reduced calls
  trackAuthentication(success: boolean, method: string = 'pin') {
    this.track({
      action: success ? 'login_success' : 'login_failure',
      category: 'authentication',
      label: method,
    });
  }

  trackSpaceAction(action: string, spaceId: string, armedState: string) {
    // Only track in production to reduce noise
    if (isProduction) {
      this.track({
        action: 'space_control',
        category: 'security',
        label: action,
      });
    }
  }

  // Legacy method for backwards compatibility during migration
  trackAreaAction(action: string, areaId: string, armedState: string) {
    this.trackSpaceAction(action, areaId, armedState);
  }

  trackDeviceInteraction(action: string, deviceId: string, deviceType: string) {
    // Only track in production
    if (isProduction) {
      this.track({
        action: 'device_interaction',
        category: 'devices',
        label: action,
      });
    }
  }

  trackError(error: Error, context?: string) {
    this.track({
      action: 'error_occurred',
      category: 'errors',
      label: context || 'unknown',
      properties: {
        error: error.message,
        context,
      },
    });
  }

  trackPerformance(metric: string, value: number, context?: string) {
    // Only track significant performance issues
    if (value > 5000) { // Only track slow operations (>5s)
      this.track({
        action: 'performance_issue',
        category: 'performance',
        label: metric,
        value,
      });
    }
  }

  trackWeatherUpdate(location: string, success: boolean) {
    // Reduce frequency - only track failures
    if (!success) {
      this.track({
        action: 'weather_update',
        category: 'integrations',
        label: 'failure',
      });
    }
  }

  trackAPICall(endpoint: string, method: string, success: boolean, duration: number) {
    // Only track failures or very slow calls
    if (!success || duration > 3000) {
      this.track({
        action: 'api_call',
        category: 'api',
        label: endpoint,
        value: duration,
        properties: {
          endpoint,
          method,
          success,
          duration,
        },
      });
    }
  }

  trackPageView(page: string) {
    // Reduce page view tracking frequency
    if (isProduction) {
      this.track({
        action: 'page_view',
        category: 'navigation',
        label: page,
      });

      // Google Analytics page view
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
          page_title: page,
          page_location: window.location.href,
        });
      }
    }
  }
}

// Global analytics instance
export const analytics = new Analytics();

// Type declarations for gtag
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
} 