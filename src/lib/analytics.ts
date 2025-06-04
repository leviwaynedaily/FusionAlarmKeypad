// Analytics tracking utility
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

  // Set user properties for analytics context
  setUserProperties(properties: UserProperties) {
    this.userProperties = { ...this.userProperties, ...properties };
    
    // Send to Sentry for user context
    Sentry.setUser({
      id: properties.userId,
      organizationId: properties.organizationId,
      locationId: properties.locationId,
    });
  }

  // Track events with optional Google Analytics integration
  track(event: AnalyticsEvent) {
    const eventData = {
      ...event,
      timestamp: new Date().toISOString(),
      userProperties: this.userProperties,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };

    // Console log in development
    if (!isProduction) {
      console.log('[ANALYTICS]', eventData);
    }

    // Send to Sentry as breadcrumb for context
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: `${event.category}: ${event.action}`,
      level: 'info',
      data: {
        label: event.label,
        value: event.value,
        properties: event.properties,
      },
    });

    // Google Analytics 4 (gtag) integration
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        custom_properties: event.properties,
      });
    }

    // Send to custom analytics endpoint if configured
    if (isProduction && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }).catch(() => {
        // Silently fail analytics to not affect user experience
      });
    }
  }

  // Common event tracking methods
  trackAuthentication(success: boolean, method: string = 'pin') {
    this.track({
      action: success ? 'login_success' : 'login_failure',
      category: 'authentication',
      label: method,
      properties: {
        method,
        timestamp: new Date().toISOString(),
      },
    });
  }

  trackAreaAction(action: string, areaId: string, armedState: string) {
    this.track({
      action: 'area_control',
      category: 'security',
      label: action,
      properties: {
        areaId,
        armedState,
        action,
      },
    });
  }

  trackDeviceInteraction(action: string, deviceId: string, deviceType: string) {
    this.track({
      action: 'device_interaction',
      category: 'devices',
      label: action,
      properties: {
        deviceId,
        deviceType,
        action,
      },
    });
  }

  trackError(error: Error, context?: string) {
    this.track({
      action: 'error_occurred',
      category: 'errors',
      label: context || 'unknown',
      properties: {
        error: error.message,
        stack: error.stack,
        context,
      },
    });
  }

  trackPerformance(metric: string, value: number, context?: string) {
    this.track({
      action: 'performance_metric',
      category: 'performance',
      label: metric,
      value,
      properties: {
        metric,
        context,
      },
    });
  }

  trackWeatherUpdate(location: string, success: boolean) {
    this.track({
      action: 'weather_update',
      category: 'integrations',
      label: success ? 'success' : 'failure',
      properties: {
        location,
        success,
      },
    });
  }

  trackAPICall(endpoint: string, method: string, success: boolean, duration: number) {
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

  // Page view tracking
  trackPageView(page: string) {
    this.track({
      action: 'page_view',
      category: 'navigation',
      label: page,
      properties: {
        page,
        timestamp: new Date().toISOString(),
      },
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