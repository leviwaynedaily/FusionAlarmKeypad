import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Global debug logging utility
 * Checks localStorage for debug mode setting and provides consistent logging
 */
export const globalDebugLog = (message: string, data?: any) => {
  if (typeof window !== 'undefined') {
    const debugMode = localStorage.getItem('fusion_debug_mode') === 'true';
    if (debugMode) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
};

/**
 * Check if debug mode is currently enabled
 */
export const isDebugMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fusion_debug_mode') === 'true';
  }
  return false;
};

// 🔒 Test function to simulate alarm zone events for development
export const testAlarmZoneEvent = (deviceName: string, eventType: 'armed' | 'disarmed' | 'triggered' = 'armed', spaceName?: string) => {
  if (typeof window === 'undefined') return;
  
  const eventData = {
    type: eventType,
    category: 'security',
    deviceName: deviceName,
    spaceName: spaceName || `Space for ${deviceName}`,
    displayState: eventType === 'armed' ? 'Armed Away' : eventType === 'disarmed' ? 'Disarmed' : 'Triggered',
    timestamp: new Date().toISOString(),
    isAlarmZoneEvent: true
  };
  
  console.log('🧪 Testing alarm zone event:', eventData);
  
  // Dispatch the same event that SSE would dispatch
  window.dispatchEvent(new CustomEvent('alarmZoneStateChange', {
    detail: eventData
  }));
  
  return eventData;
};

// 🔒 Test function to simulate real Fusion alarm zone events
export const testDirectAlarmZoneEvent = (zoneName: string, newState: 'ARMED' | 'DISARMED' | 'TRIGGERED' = 'ARMED', zoneId?: string) => {
  if (typeof window === 'undefined') return;
  
  const previousState = newState === 'ARMED' ? 'DISARMED' : 'ARMED';
  
  const eventData = {
    type: 'arming',
    alarmZoneId: zoneId || `test-zone-${Date.now()}`,
    alarmZoneName: zoneName,
    currentState: newState,
    previousState: previousState,
    locationId: 'test-location',
    locationName: 'Test Location',
    timestamp: new Date().toISOString(),
    isDirectAlarmZoneEvent: true,
    isAlarmZoneEvent: true
  };
  
  console.log('🧪 Testing direct alarm zone event (Fusion format):', eventData);
  
  // Dispatch the same event that real Fusion SSE would dispatch
  window.dispatchEvent(new CustomEvent('alarmZoneStateChange', {
    detail: eventData
  }));
  
  return eventData;
};

// Add test functions to window for easy console access
export const addAlarmZoneTestFunctions = () => {
  if (typeof window !== 'undefined') {
    (window as any).testAlarmZoneArmed = (deviceName: string, spaceName?: string) => testAlarmZoneEvent(deviceName, 'armed', spaceName);
    (window as any).testAlarmZoneDisarmed = (deviceName: string, spaceName?: string) => testAlarmZoneEvent(deviceName, 'disarmed', spaceName);
    (window as any).testAlarmZoneTriggered = (deviceName: string, spaceName?: string) => testAlarmZoneEvent(deviceName, 'triggered', spaceName);
    
    // Real Fusion alarm zone event tests
    (window as any).testDirectAlarmZoneArmed = (zoneName: string, zoneId?: string) => testDirectAlarmZoneEvent(zoneName, 'ARMED', zoneId);
    (window as any).testDirectAlarmZoneDisarmed = (zoneName: string, zoneId?: string) => testDirectAlarmZoneEvent(zoneName, 'DISARMED', zoneId);
    (window as any).testDirectAlarmZoneTriggered = (zoneName: string, zoneId?: string) => testDirectAlarmZoneEvent(zoneName, 'TRIGGERED', zoneId);
    
    console.log('🧪 Alarm Zone Test Functions Available:');
    console.log('• Legacy device-based tests:');
    console.log('  - testAlarmZoneArmed("Device Name", "Space Name")');
    console.log('  - testAlarmZoneDisarmed("Device Name", "Space Name")');
    console.log('  - testAlarmZoneTriggered("Device Name", "Space Name")');
    console.log('• Real Fusion alarm zone tests:');
    console.log('  - testDirectAlarmZoneArmed("Garage", "zone-id")');
    console.log('  - testDirectAlarmZoneDisarmed("Perimeter", "zone-id")');
    console.log('  - testDirectAlarmZoneTriggered("Interior", "zone-id")');
    console.log('• Example: testDirectAlarmZoneArmed("Garage")');
  }
};

/**
 * Enhanced device type detection for consistent event formatting
 */
export function detectDeviceType(deviceName: string): string {
  const lowerName = deviceName.toLowerCase();
  
  // Light devices (most specific first)
  if (lowerName.includes('light') || lowerName.includes('bulb') || lowerName.includes('lamp')) {
    return 'light';
  }
  
  // Switch devices
  if (lowerName.includes('switch')) {
    return 'switch';
  }
  
  // Outlet/plug devices
  if (lowerName.includes('outlet') || lowerName.includes('plug') || lowerName.includes('socket')) {
    return 'outlet';
  }
  
  // Fan devices
  if (lowerName.includes('fan')) {
    return 'fan';
  }
  
  // Dimmer devices
  if (lowerName.includes('dimmer')) {
    return 'dimmer';
  }
  
  // Door devices
  if (lowerName.includes('door') || lowerName.includes('garage')) {
    return 'door';
  }
  
  // Lock devices
  if (lowerName.includes('lock')) {
    return 'lock';
  }
  
  // Camera devices
  if (lowerName.includes('camera') || lowerName.includes('cam')) {
    return 'camera';
  }
  
  // Motion sensors
  if (lowerName.includes('motion') || lowerName.includes('sensor')) {
    return 'sensor';
  }
  
  return 'unknown';
}

/**
 * Enhanced state detection and normalization for consistent formatting
 */
export function normalizeDeviceState(state: string): string {
  if (!state) return '';
  const lowerState = state.toLowerCase();
  
  // On states
  if (/^(on|open|opened|active|enabled|armed|true|1|yes|up|high)$/i.test(lowerState)) {
    return 'on';
  }
  
  // Off states  
  if (/^(off|closed|inactive|disabled|disarmed|false|0|no|down|low)$/i.test(lowerState)) {
    return 'off';
  }
  
  return lowerState;
}

/**
 * Generate user-friendly event descriptions based on device type and state
 */
export function generateEventDescription(deviceName: string, state: string, eventType?: string): { title: string; description: string } {
  const deviceType = detectDeviceType(deviceName);
  const normalizedState = normalizeDeviceState(state);
  
  // For controllable devices, use "Device Name turned On/Off" format
  if (['light', 'switch', 'outlet', 'fan'].includes(deviceType)) {
    if (normalizedState === 'on') {
      return {
        title: `${deviceName} turned On`,
        description: `${deviceName} turned on`
      };
    } else if (normalizedState === 'off') {
      return {
        title: `${deviceName} turned Off`,
        description: `${deviceName} turned off`
      };
    } else if (state) {
      return {
        title: `${deviceName} State Changed`,
        description: `${deviceName} changed to ${state.charAt(0).toUpperCase() + state.slice(1)}`
      };
    } else {
      return {
        title: `${deviceName} Updated`,
        description: `${deviceName} status update`
      };
    }
  }
  
  // For doors, use action-based descriptions
  if (deviceType === 'door') {
    if (normalizedState === 'on') {
      return {
        title: `${deviceName} Opened`,
        description: `${deviceName} was opened`
      };
    } else if (normalizedState === 'off') {
      return {
        title: `${deviceName} Closed`,
        description: `${deviceName} was closed`
      };
    } else {
      return {
        title: `${deviceName} State Changed`,
        description: `${deviceName} changed to ${state}`
      };
    }
  }
  
  // For locks, use action-based descriptions
  if (deviceType === 'lock') {
    if (state && /unlock/i.test(state)) {
      return {
        title: `${deviceName} Unlocked`,
        description: `${deviceName} was unlocked`
      };
    } else if (state && /lock/i.test(state)) {
      return {
        title: `${deviceName} Locked`,
        description: `${deviceName} was locked`
      };
    } else {
      return {
        title: `${deviceName} State Changed`,
        description: `${deviceName} changed to ${state}`
      };
    }
  }
  
  // For cameras and sensors
  if (deviceType === 'camera') {
    return {
      title: `${deviceName}`,
      description: 'activity detected'
    };
  }
  
  if (deviceType === 'sensor') {
    return {
      title: `${deviceName}`,
      description: 'sensor triggered'
    };
  }
  
  // For dimmers
  if (deviceType === 'dimmer') {
    return {
      title: `${deviceName} Adjusted`,
      description: `${deviceName} changed to ${state}`
    };
  }
  
  // Fallback - clean generic format
  if (state) {
    return {
      title: `${deviceName} Updated`,
      description: `${deviceName} changed to ${state.charAt(0).toUpperCase() + state.slice(1)}`
    };
  } else {
    return {
      title: `${deviceName} Updated`,
      description: `${deviceName} status update`
    };
  }
}
