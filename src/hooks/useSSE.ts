"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { analytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { globalDebugLog } from '@/lib/utils';

// 🔥 FIX: Safe browser-compatible development check
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export interface SSEEventDisplay {
  id: string;
  type: string;
  deviceName?: string;
  category?: string;
  timestamp?: string;
  imageUrl?: string;
  displayState?: string;
  spaceName?: string;
  locationName?: string;
  eventType?: string;
  eventSubtype?: string;
  caption?: string;
  // 🔥 REMOVED: payload to prevent memory leaks
  [key: string]: any;
}

export function useSSE() {
  const [recentEvents, setRecentEvents] = useState<SSEEventDisplay[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true); // 🆕 Track initial status check
  const [backgroundServiceStatus, setBackgroundServiceStatus] = useState<any>(null);
  const loadingRef = useRef(false);
  const liveSSERef = useRef<EventSource | null>(null);

  // ✅ SIMPLIFIED: Only check background service status when needed (not continuously)
  const checkBackgroundService = useCallback(async () => {
    try {
      setStatusLoading(true); // Start loading
      globalDebugLog('🔍 SSE: Checking background service status (one-time)...');
      const response = await fetch('/api/background-sse');
      const data = await response.json();
      setBackgroundServiceStatus(data.status);
      setIsConnected(data.status?.isRunning || false);
      globalDebugLog('📊 SSE: Background service status:', data.status);
    } catch (error) {
      console.error('❌ Failed to check background service status:', error);
      globalDebugLog('❌ SSE: Failed to check background service status:', error);
      setIsConnected(false);
    } finally {
      setStatusLoading(false); // End loading
    }
  }, []);

  // ✅ NEW: Connect to live events stream for real-time updates
  const connectToLiveStream = useCallback(() => {
    if (typeof window === 'undefined') return; // Only in browser
    
    try {
      // Close existing connection
      if (liveSSERef.current) {
        liveSSERef.current.close();
      }
      
      globalDebugLog('📡 SSE: Connecting to live events stream...');
      const eventSource = new EventSource('/api/events/live');
      
      eventSource.onopen = () => {
        globalDebugLog('📡 SSE: Live events stream connected');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Don't auto-skip system events - let event timeline management handle filtering
          if (data.type === 'connected' || data.type === 'heartbeat') {
            globalDebugLog('📡 SSE: Received system event:', data.type);
            // Continue processing instead of returning early
          }
          
          // Add new event to the top of the list
          if ((data.deviceName && data.type !== 'unknown') || data.isDirectAlarmZoneEvent || data.isAlarmZoneEvent) {
            globalDebugLog('📡 SSE: Received live event:', data);
            
            // Check if this is an alarm zone event
            if (data.isAlarmZoneEvent || data.isDirectAlarmZoneEvent) {
              globalDebugLog('🔒 SSE: Alarm zone event detected:', {
                type: data.type,
                category: data.category,
                device: data.deviceName,
                space: data.spaceName,
                alarmZoneId: data.alarmZoneId,
                alarmZoneName: data.alarmZoneName,
                currentState: data.currentState,
                isDirectAlarmZoneEvent: data.isDirectAlarmZoneEvent
              });
              
              // Dispatch custom event for alarm zone updates
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('alarmZoneStateChange', {
                  detail: data // Pass the entire data object for both event types
                }));
              }
            }
            
            setRecentEvents(prev => {
              const newEvent = {
                id: data.id || `live-${Date.now()}`,
                type: data.type,
                deviceName: data.deviceName,
                timestamp: data.timestamp,
                imageUrl: data.imageUrl,
                displayState: data.displayState,
                spaceName: data.spaceName,
                category: data.category
              };
              
              // Prevent duplicates and keep only latest 50 events
              const filtered = prev.filter(e => e.id !== newEvent.id);
              return [newEvent, ...filtered].slice(0, 50);
            });
          }
        } catch (error) {
          console.error('❌ Failed to parse live event:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ Live events stream error:', error);
        globalDebugLog('❌ SSE: Live events stream error:', error);
        // Will automatically reconnect
      };
      
      liveSSERef.current = eventSource;
      
    } catch (error) {
      console.error('❌ Failed to connect to live events stream:', error);
      globalDebugLog('❌ SSE: Failed to connect to live events stream:', error);
    }
  }, []);

  // ✅ NEW: Disconnect from live events stream
  const disconnectFromLiveStream = useCallback(() => {
    if (liveSSERef.current) {
      liveSSERef.current.close();
      liveSSERef.current = null;
      globalDebugLog('📡 SSE: Disconnected from live events stream');
    }
  }, []);

  // ✅ REMOVED: Client-side SSE connection logic (now handled by background service)
  // The background service captures events 24/7 and saves to database
  
  const cleanupOldEvents = () => {
    setRecentEvents(prev => prev.slice(0, 10));
  };

  // ✅ UPDATED: Load events from database only (background service saves them)
  const loadRecentEventsFromDB = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setIsLoading(true);
      
      globalDebugLog('🔍 SSE: Loading recent events from database...');
      const organizationId = process.env.NEXT_PUBLIC_FUSION_ORGANIZATION_ID || 'GF1qXccUcdNJbIkUAbYR9SKAEwVonZZK';
      const response = await fetch(`/api/events?limit=50&sinceHours=24&organizationId=${organizationId}`);
       
       if (!response.ok) {
         throw new Error(`API error: ${response.status}`);
       }
       
       const events = await response.json();

      if (events && Array.isArray(events)) {
        globalDebugLog(`🔍 SSE: Database returned ${events.length} events`);
        globalDebugLog(`🔍 SSE: Raw database events structure:`, events.slice(0, 2)); // Show first 2 events for debugging
        
        // 🔥 CHANGED: Don't auto-filter any events - let event timeline management handle all filtering
        // Only filter out events that are genuinely malformed or corrupted
        const usefulEvents = events.filter(event => {
          // Only filter out events that are completely invalid
          if (!event.event_type) {
            globalDebugLog(`🔍 SSE: Filtering out event with no event_type:`, event);
            return false;
          }
          
          // Include ALL other events (heartbeats, polling, deviceless events, etc.)
          // The event timeline management will handle user preferences for showing/hiding
          return true;
        });
        
        globalDebugLog(`🔍 SSE: After filtering: ${usefulEvents.length} useful events out of ${events.length} total`);
        
        const formattedEvents: SSEEventDisplay[] = usefulEvents.map((event: any, index: number) => {
          // 🔍 DEBUG: Log each event's structure
          if (index < 2) {
            globalDebugLog(`🔍 SSE: Event ${index} raw:`, event);
            globalDebugLog(`🔍 SSE: Event ${index} device_name:`, { value: event.device_name, type: typeof event.device_name });
            globalDebugLog(`🔍 SSE: Event ${index} event_type:`, { value: event.event_type, type: typeof event.event_type });
          }
          
          const formatted = {
            // 🔥 FIX: Use database column names
            id: event.eventUuid || event.id || `db-event-${Date.now()}`,
            type: String(event.event_type || event.type || 'unknown').toLowerCase(), // Use event_type from DB
            deviceName: event.device_name || event.deviceName, // Use device_name from DB
            category: event.category,
            timestamp: event.event_timestamp || event.timestamp, // Use event_timestamp from DB
            imageUrl: event.thumbnailData?.data || event.thumbnail || event.imageUrl,
            displayState: event.display_state || event.displayState || '', // Use display_state from DB
            areaName: event.area_name || event.areaName, // Use area_name from DB
            locationName: event.locationName,
            eventType: event.eventType,
            eventSubtype: event.eventSubtype,
            // 🔥 ADD: Include caption for detection type display
            caption: event.caption
          };
          
          // 🔍 DEBUG: Log formatted result
          if (index < 2) {
            console.log(`🔍 Event ${index} formatted:`, formatted);
          }
          
          return formatted;
        });

        globalDebugLog(`🔍 SSE: Formatted events sample:`, formattedEvents.slice(0, 2));
        setRecentEvents(formattedEvents);
        globalDebugLog(`🔍 SSE: Set ${formattedEvents.length} recent events from database`);
      }
    } catch (error) {
      console.error('❌ Failed to load recent events from database:', error);
      globalDebugLog('❌ SSE: Failed to load recent events from database:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Initialize once on mount only
  useEffect(() => {
    checkBackgroundService(); // Check once on mount
    loadRecentEventsFromDB(); // Load events once
    connectToLiveStream(); // Connect to real-time stream
    
    // Cleanup on unmount
    return () => {
      disconnectFromLiveStream();
    };
  }, []); // Empty dependency array - run only once on mount

  // Connect to both background service and live stream
  const connectSSE = useCallback(async (organizationId: string, apiKey: string) => {
    console.log('ℹ️ SSE: Connecting to background service and live stream...');
    await checkBackgroundService();
    await loadRecentEventsFromDB();
    connectToLiveStream();
  }, [checkBackgroundService, loadRecentEventsFromDB, connectToLiveStream]);

  const disconnectSSE = () => {
    console.log('ℹ️ SSE: Disconnecting from live stream...');
    disconnectFromLiveStream();
  };

  const toggleSSE = (organizationId: string, apiKey: string) => {
    connectSSE(organizationId, apiKey);
  };

  const toggleLiveEvents = () => {
    console.log('ℹ️ Live events managed by background service');
  };

  // Manual refresh function
  const refreshEvents = useCallback(() => {
    loadRecentEventsFromDB();
  }, [loadRecentEventsFromDB]);

  // Control background service (check status only when starting)
  const startBackgroundService = useCallback(async () => {
    try {
      globalDebugLog('🚀 SSE: Starting background service...');
      const response = await fetch('/api/background-sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });
      const data = await response.json();
      globalDebugLog('🔄 SSE: Start service response:', data);
      if (data.success) {
        setIsConnected(true); // Trust that it started
        setBackgroundServiceStatus(data.status);
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to start background service:', error);
      globalDebugLog('❌ SSE: Failed to start background service:', error);
      throw error;
    }
  }, []);

  const stopBackgroundService = useCallback(async () => {
    try {
      const response = await fetch('/api/background-sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      });
      const data = await response.json();
      if (data.success) {
        setIsConnected(false); // Trust that it stopped
        setBackgroundServiceStatus(data.status);
      }
      return data;
    } catch (error) {
      console.error('❌ Failed to stop background service:', error);
      throw error;
    }
  }, []);

  return {
    recentEvents,
    isConnected,
    isLoading,
    statusLoading,
    backgroundServiceStatus,
    connectSSE,
    disconnectSSE,
    toggleSSE,
    toggleLiveEvents,
    cleanupOldEvents,
    refreshEvents,
    startBackgroundService,
    stopBackgroundService,
    checkBackgroundService,
    connectToLiveStream,
    disconnectFromLiveStream,
    
    // ✅ COMPATIBILITY: Legacy functions for backward compatibility (now no-ops)
    setSSEEnabled: () => console.log('ℹ️ setSSEEnabled is deprecated - background service handles SSE'),
    setShowLiveEvents: () => console.log('ℹ️ setShowLiveEvents is deprecated - background service manages events'),
    loadSettings: () => console.log('ℹ️ loadSettings is deprecated - no settings needed for background service'),
    setupSSEConnection: () => console.log('ℹ️ setupSSEConnection is deprecated - background service handles connections'),
    
    // ✅ COMPATIBILITY: Legacy state for components that expect them
    sseClient: null,
    sseConnected: isConnected,
    sseEnabled: isConnected,
    lastSSEEvent: 'Background service active',
    showLiveEvents: true,
    isClient: typeof window !== 'undefined'
  };
}