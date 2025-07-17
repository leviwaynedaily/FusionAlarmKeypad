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

// 🔒 Alarm Zone Testing Utilities
export const testAlarmZoneEvent = (deviceName: string, eventType: 'armed' | 'disarmed' = 'armed') => {
  if (typeof window !== 'undefined') {
    const testEvent = {
      type: eventType,
      category: 'security',
      deviceName,
      spaceName: 'Test Space',
      displayState: eventType === 'armed' ? 'Armed Away' : 'Disarmed',
      timestamp: new Date().toISOString()
    };
    
    console.log('🔒 Test: Dispatching alarm zone event:', testEvent);
    
    window.dispatchEvent(new CustomEvent('alarmZoneStateChange', {
      detail: testEvent
    }));
  }
};

// Helper to add test functions to window for easy console access
export const addAlarmZoneTestFunctions = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    (window as any).testAlarmZoneArmed = (deviceName: string) => testAlarmZoneEvent(deviceName, 'armed');
    (window as any).testAlarmZoneDisarmed = (deviceName: string) => testAlarmZoneEvent(deviceName, 'disarmed');
    
    console.log('🔒 Test functions added to window:');
    console.log('• testAlarmZoneArmed("Device Name")');
    console.log('• testAlarmZoneDisarmed("Device Name")');
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
