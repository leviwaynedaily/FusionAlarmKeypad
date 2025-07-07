"use client";

import { useState, useEffect } from 'react';
import { createSSEClient, FusionSSEClient } from '@/lib/sse';
import { analytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';

const isDev = process.env.NODE_ENV === 'development';

export interface SSEEventDisplay {
  id: string;
  type: string;
  deviceName?: string;
  category?: string;
  timestamp?: string;
  imageUrl?: string;
  displayState?: string;
  payload?: any;
  [key: string]: any;
}

export function useSSE() {
  const [sseClient, setSSEClient] = useState<FusionSSEClient | null>(null);
  const [sseConnected, setSSEConnected] = useState(false);
  const [sseEnabled, setSSEEnabled] = useState(true);
  const [lastSSEEvent, setLastSSEEvent] = useState<string>('');
  const [recentEvents, setRecentEvents] = useState<SSEEventDisplay[]>([]);
  const [showLiveEvents, setShowLiveEvents] = useState(true);

  // Setup SSE connection with optimization
  const setupSSEConnection = async (organizationId: string, apiKey: string) => {
    if (!sseEnabled || !organizationId || !apiKey) return;

    try {
      // Prevent multiple connections by disconnecting existing first
      if (sseClient) {
        sseClient.disconnect();
        setSSEClient(null);
      }

      const client = createSSEClient(organizationId, apiKey);
      setSSEClient(client);

      // Optimized event handlers with reduced analytics overhead
      client.on('connected', () => {
        if (isDev) {
          console.log('🔗 SSE Connected');
        }
        setSSEConnected(true);
        setLastSSEEvent('Connected');
        analytics.trackAuthentication(true, 'sse');
      });

      client.on('disconnected', () => {
        if (isDev) {
          console.log('🔌 SSE Disconnected');
        }
        setSSEConnected(false);
        setLastSSEEvent('Disconnected');
      });

      client.on('error', (error: any) => {
        if (isDev) {
          console.error('❌ SSE Error:', error?.message || error);
        }
        setSSEConnected(false);
        setLastSSEEvent(`Error: ${error?.message || 'Unknown error'}`);
        analytics.trackError(error, 'sse_connection');
      });

      // Unified handler for incoming SSE payloads (optimized)
      const handleIncomingEvent = (event: any) => {
        // Reduce console logging
        if (isDev && event.type !== 'heartbeat') {
          console.log('📡 SSE Event:', event.type, event.deviceName || '');
        }
        
        const eventTime = new Date().toLocaleTimeString();
        const eventMessage = `${eventTime}: ${event.type} - ${event.deviceName || 'System'}`;
        setLastSSEEvent(eventMessage);

        // Optimized state handling
        const displayState = event.event?.displayState || 
                           event.event?.state || 
                           event.payload?.state || 
                           '';

        // Add to recent events with deduplication (reduced to 10 for better performance)
        setRecentEvents(prev => {
          if (prev.some(e => e.id === event.eventUuid || e.id === event.id)) {
            return prev;
          }

          const newEvent: SSEEventDisplay = {
            id: event.eventUuid || event.id || `event-${Date.now()}`,
            type: (event.type || '').toLowerCase(),
            deviceName: event.deviceName,
            category: event.category,
            timestamp: event.timestamp,
            imageUrl: event.imageUrl || event.thumbnail,
            displayState,
            payload: event.payload || {},
          };
          
          return [newEvent, ...prev].slice(0, 10); // Reduced from 20 to 10
        });

        // Reduce analytics tracking frequency
        if (event.type !== 'heartbeat' && event.type !== 'connection') {
          analytics.track({
            action: 'sse_event_received',
            category: 'events',
            label: event.type,
          });
        }
      };

      // Set up all event listeners to use the unified handler
      const eventTypes = [
        'security_event',
        'device_state_change',
        'area_state_change',
        'alarm_event',
        'unknown_event'
      ];
      
      eventTypes.forEach(evtName => client.on(evtName, handleIncomingEvent));

      // Connect to SSE
      await client.connect();
    } catch (error) {
      logger.error('Failed to setup SSE connection:', error);
      setSSEConnected(false);
      analytics.trackError(error instanceof Error ? error : new Error('SSE setup failed'), 'sse_setup');
    }
  };

  // Disconnect SSE
  const disconnectSSE = () => {
    if (sseClient) {
      sseClient.disconnect();
      setSSEClient(null);
      setSSEConnected(false);
      setLastSSEEvent('Manually disconnected');
    }
  };

  // Toggle SSE
  const toggleSSE = (organizationId: string, apiKey: string) => {
    const newState = !sseEnabled;
    setSSEEnabled(newState);
    
    if (newState) {
      setupSSEConnection(organizationId, apiKey);
    } else {
      disconnectSSE();
    }
  };

  // Toggle live events display
  const toggleLiveEvents = () => {
    const newState = !showLiveEvents;
    setShowLiveEvents(newState);
    localStorage.setItem('show_live_events', newState.toString());
  };

  // Load settings from localStorage (optimized)
  const loadSettings = () => {
    try {
      const savedShowLiveEvents = localStorage.getItem('show_live_events');
      if (savedShowLiveEvents !== null) {
        setShowLiveEvents(savedShowLiveEvents === 'true');
      }

      const savedSSEEnabled = localStorage.getItem('sse_enabled');
      if (savedSSEEnabled !== null) {
        setSSEEnabled(savedSSEEnabled === 'true');
      }
    } catch (error) {
      if (isDev) {
        console.error('Error loading SSE settings:', error);
      }
    }
  };

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Remove the verbose recentEvents logging to reduce console spam
  // useEffect(() => {
  //   if (isDev) console.log('[useSSE] recentEvents updated:', recentEvents);
  // }, [recentEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSSE();
    };
  }, []);

  return {
    // State
    sseClient,
    sseConnected,
    sseEnabled,
    lastSSEEvent,
    recentEvents,
    showLiveEvents,

    // Actions
    setupSSEConnection,
    disconnectSSE,
    toggleSSE,
    toggleLiveEvents,
    setSSEEnabled,
    setShowLiveEvents,
    loadSettings,
  };
} 