import { useState, useEffect } from 'react';
import { Device } from '@/lib/api';
import { analytics } from '@/lib/analytics';

export function useSystemHealth() {
  const [systemStatus, setSystemStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [deviceConnectivity, setDeviceConnectivity] = useState<'all_online' | 'some_offline' | 'all_offline'>('all_online');
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [offlineDevices, setOfflineDevices] = useState<string[]>([]);

  // Check device status
  const checkDeviceStatus = (devices: Device[]) => {
    if (!devices || devices.length === 0) {
      setDeviceConnectivity('all_offline');
      setOfflineDevices([]);
      return;
    }

    const offlineDeviceNames: string[] = [];
    
    devices.forEach(device => {
      const type = device.type.toLowerCase();
      const deviceType = device.deviceTypeInfo?.type?.toLowerCase() || '';
      const status = device.status?.toLowerCase() || '';
      const displayState = device.displayState?.toLowerCase() || '';
      
      // Check for offline devices
      if (status === 'offline' || displayState === 'offline') {
        offlineDeviceNames.push(device.name);
      }
    });

    setOfflineDevices(offlineDeviceNames);

    // Determine connectivity status
    if (offlineDeviceNames.length === 0) {
      setDeviceConnectivity('all_online');
    } else if (offlineDeviceNames.length === devices.length) {
      setDeviceConnectivity('all_offline');
    } else {
      setDeviceConnectivity('some_offline');
    }

    // Update system status based on connectivity
    if (offlineDeviceNames.length === 0) {
      setSystemStatus('online');
    } else if (offlineDeviceNames.length < devices.length) {
      setSystemStatus('degraded');
    } else {
      setSystemStatus('offline');
    }
  };

  // Update heartbeat
  const updateHeartbeat = () => {
    setLastHeartbeat(Date.now());
  };

  // Get system status color
  const getSystemStatusColor = () => {
    switch (systemStatus) {
      case 'online':
        return '#22c55e'; // green-500
      case 'degraded':
        return '#f59e0b'; // amber-500
      case 'offline':
        return '#ef4444'; // red-500
      default:
        return '#6b7280'; // gray-500
    }
  };

  // Get connectivity status text
  const getConnectivityStatusText = () => {
    switch (deviceConnectivity) {
      case 'all_online':
        return 'All Devices Online';
      case 'some_offline':
        return `${offlineDevices.length} Device${offlineDevices.length > 1 ? 's' : ''} Offline`;
      case 'all_offline':
        return 'All Devices Offline';
      default:
        return 'Unknown Status';
    }
  };

  // Track system health metrics
  const trackSystemHealth = () => {
    analytics.track({
      action: 'system_health_check',
      category: 'system',
      label: systemStatus,
      properties: {
        systemStatus,
        deviceConnectivity,
        offlineDeviceCount: offlineDevices.length,
        lastHeartbeat: new Date(lastHeartbeat).toISOString()
      }
    });
  };

  return {
    // State
    systemStatus,
    deviceConnectivity,
    lastHeartbeat,
    offlineDevices,

    // Actions
    checkDeviceStatus,
    updateHeartbeat,
    getSystemStatusColor,
    getConnectivityStatusText,
    trackSystemHealth,

    // Setters
    setSystemStatus,
    setDeviceConnectivity,
    setLastHeartbeat,
    setOfflineDevices,
  };
} 