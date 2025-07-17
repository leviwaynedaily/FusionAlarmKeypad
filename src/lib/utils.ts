import { clsx, type ClassValue } from "clsx"
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
