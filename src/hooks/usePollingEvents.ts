"use client";

import { useState, useEffect, useRef } from 'react';
import { getAreas, getDevices, getSpaces } from '@/lib/api';
import { Area, Device, Space } from '@/lib/api';
import { insertEvent } from '@/lib/db';
import { SSEEventDisplay } from './useSSE';

export interface PollingEvent extends SSEEventDisplay {
  change?: {
    from: any;
    to: any;
    field: string;
  };
}

export interface UsePollingEventsProps {
  organizationId?: string;
  locationId?: string;
  enabled?: boolean;
  interval?: number; // seconds
}

export function usePollingEvents({
  organizationId,
  locationId,
  enabled = true,
  interval = 30 // Poll every 30 seconds by default
}: UsePollingEventsProps = {}) {
  const [recentEvents, setRecentEvents] = useState<PollingEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPollTime, setLastPollTime] = useState<string>('');
  
  // Store previous states to detect changes
  const previousSpaces = useRef<Space[]>([]);
  const previousDevices = useRef<Device[]>([]);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Helper function to determine event type based on device and state
  const getDeviceEventType = (device: Device, state: string): string => {
    const deviceName = device.name.toLowerCase();
    const deviceType = device.type.toLowerCase();
    const stateValue = state.toLowerCase();

    // Door/Lock devices
    if (deviceName.includes('door') || deviceType.includes('door')) {
      if (stateValue.includes('open')) return 'door_opened';
      if (stateValue.includes('close') || stateValue.includes('closed')) return 'door_closed';
    }

    if (deviceName.includes('lock') || deviceType.includes('lock')) {
      if (stateValue.includes('lock') || stateValue.includes('secured')) return 'lock_locked';
      if (stateValue.includes('unlock') || stateValue.includes('unsecured')) return 'lock_unlocked';
    }

    // Light devices
    if (deviceName.includes('light') || deviceType.includes('light')) {
      if (stateValue.includes('on')) return 'light_on';
      if (stateValue.includes('off')) return 'light_off';
    }

    // Motion sensors
    if (deviceName.includes('motion') || deviceType.includes('motion')) {
      if (stateValue.includes('motion') || stateValue.includes('detect')) return 'motion_detected';
    }

    // Generic device state change
    return 'device_state_change';
  };

  // Add event to recent events list
  const addEvent = (event: Partial<PollingEvent> & { type: string }) => {
    const newEvent: PollingEvent = {
      id: `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      category: event.category || 'polling',
      deviceName: event.deviceName,
      displayState: event.displayState,
      change: event.change,
      ...event
    };

    console.log('📊 Polling Event:', newEvent);

    setRecentEvents(prev => {
      const updated = [newEvent, ...prev].slice(0, 5); // Keep only 5 events
      return updated;
    });

    // Store in Supabase if enabled and we have organization info
    if (organizationId && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      insertEvent({
        organizationId,
        locationId,
        type: event.type,
        category: 'polling',
        deviceName: event.deviceName,
        areaName: event.areaName,
        displayState: event.displayState,
        timestamp: newEvent.timestamp,
        payload: event.change
      }).catch(err => {
        console.error('Failed to store polling event:', err);
      });
    }

    // Update last poll time display
    setLastPollTime(new Date().toLocaleTimeString());
  };

  // Check for changes in spaces
  const checkSpaceChanges = (newSpaces: Space[], oldSpaces: Space[]) => {
    if (oldSpaces.length === 0) return; // Skip first load

    newSpaces.forEach(newSpace => {
      const oldSpace = oldSpaces.find(s => s.id === newSpace.id);
      
      if (!oldSpace) {
        // New space added
        addEvent({
          type: 'space_change',
          spaceName: newSpace.name,
          displayState: 'active',
          change: {
            from: null,
            to: 'active',
            field: 'added'
          }
        });
      } else if (oldSpace.name !== newSpace.name) {
        // Space name changed
        addEvent({
          type: 'space_change',
          category: 'space',
          spaceName: newSpace.name,
          displayState: 'renamed',
          change: {
            from: oldSpace.name,
            to: newSpace.name,
            field: 'name'
          }
        });
      }
    });
  };

  // Check for changes in devices
  const checkDeviceChanges = (newDevices: Device[], oldDevices: Device[]) => {
    if (oldDevices.length === 0) return; // Skip first load

    newDevices.forEach(newDevice => {
      const oldDevice = oldDevices.find(d => d.id === newDevice.id);
      
      if (!oldDevice) {
        // New device added
        addEvent({
          type: 'device_change',
          deviceName: newDevice.name,
          displayState: newDevice.displayState || newDevice.status || 'unknown',
          change: {
            from: null,
            to: newDevice.status,
            field: 'added'
          }
        });
      } else {
                 // Check for status changes
         if (oldDevice.status !== newDevice.status) {
           const eventType = getDeviceEventType(newDevice, newDevice.status || '');
           addEvent({
             type: eventType,
             category: 'device',
             deviceName: newDevice.name,
             displayState: newDevice.displayState || newDevice.status || 'unknown',
             change: {
               from: oldDevice.status,
               to: newDevice.status,
               field: 'status'
             }
           });
         }
         
         // Check for display state changes
         if (oldDevice.displayState !== newDevice.displayState) {
           const eventType = getDeviceEventType(newDevice, newDevice.displayState || '');
           addEvent({
             type: eventType,
             category: 'device',
             deviceName: newDevice.name,
             displayState: newDevice.displayState || 'unknown',
             change: {
               from: oldDevice.displayState,
               to: newDevice.displayState,
               field: 'displayState'
             }
           });
         }
      }
    });
  };

  // Poll for changes
  const pollForChanges = async () => {
    if (!locationId || !enabled) return;

    try {
      console.log('📊 Polling for changes...');
      
      // Fetch current data
      const [spacesResponse, devicesResponse] = await Promise.all([
        getSpaces(locationId),
        getDevices()
      ]);

      if (!spacesResponse.error && spacesResponse.data) {
        checkSpaceChanges(spacesResponse.data, previousSpaces.current);
        previousSpaces.current = spacesResponse.data;
      }

      if (!devicesResponse.error && devicesResponse.data) {
        checkDeviceChanges(devicesResponse.data, previousDevices.current);
        previousDevices.current = devicesResponse.data;
      }

    } catch (error) {
      console.error('📊 Polling error:', error);
    }
  };

  // Start polling
  const startPolling = () => {
    if (pollInterval.current || !enabled || !locationId) return;

    console.log(`📊 Starting polling every ${interval} seconds`);
    setIsPolling(true);
    
    addEvent({
      type: 'polling_started'
    });

    // Initial poll
    pollForChanges();

    // Set up interval
    pollInterval.current = setInterval(pollForChanges, interval * 1000);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    
    setIsPolling(false);
    console.log('📊 Polling stopped');
    
    addEvent({
      type: 'polling_stopped'
    });
  };

  // Start/stop polling based on props
  useEffect(() => {
    if (enabled && locationId && organizationId) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, locationId, organizationId, interval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    recentEvents,
    isPolling,
    lastPollTime,
    startPolling,
    stopPolling,
    // SSE-compatible interface for easy replacement
    showLiveEvents: enabled,
    setShowLiveEvents: () => {}, // No-op for compatibility
    lastSSEEvent: lastPollTime ? `Last poll: ${lastPollTime}` : 'Not started',
    sseConnected: isPolling,
    sseEnabled: enabled,
    setSSEEnabled: () => {}, // No-op for compatibility
  };
} 