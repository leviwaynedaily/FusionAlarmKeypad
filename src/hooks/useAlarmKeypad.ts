import { useState, useEffect } from 'react';
import { useSSEContext } from '@/hooks/SSEContext';
import { updateAreaState, validatePin, getApiKeyDetails, Area, Device, Organization } from '@/lib/api';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance';
import { 
  optimizedGetLocations, 
  optimizedGetAreas, 
  optimizedGetDevices, 
  optimizedGetDashboardData,
  clearCache,
  SmartPoller 
} from '@/lib/api-optimized';

// API keys from environment variables
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
const DEFAULT_WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';

export interface AlarmZone {
  id: string;
  name: string;
  color: string;
  areas: string[]; // area IDs
}

export function useAlarmKeypad() {
  // Core state
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pressedButton, setPressedButton] = useState<string | null>(null);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showZonesPreview, setShowZonesPreview] = useState(true);
  const [showSeconds, setShowSeconds] = useState(true);
  const [highlightPinButtons, setHighlightPinButtons] = useState(true);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [showWarningDetails, setShowWarningDetails] = useState<string | null>(null);

  // Design state
  const useDesign2 = true; // Design 2.0 is now default
  const [useTestDesign, setUseTestDesign] = useState(false);
  const [useTestDesign2, setUseTestDesign2] = useState(false);

  // Device and area state
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceWarnings, setDeviceWarnings] = useState<string[]>([]);
  const [pendingAreaToggle, setPendingAreaToggle] = useState<{ area: Area, newState: Area['armedState'] } | null>(null);
  const [pendingToggleAll, setPendingToggleAll] = useState<Area['armedState'] | null>(null);
  const [areaWarnings, setAreaWarnings] = useState<Record<string, string[]>>({});

  // Alarm zones
  const [alarmZones, setAlarmZones] = useState<AlarmZone[]>([
    {
      id: 'critical',
      name: 'Critical Alarm Zone',
      color: '#ef4444', // red-500
      areas: []
    },
    {
      id: 'secondary',
      name: 'Secondary Zone',
      color: '#f59e0b', // amber-500
      areas: []
    },
    {
      id: 'perimeter',
      name: 'Perimeter Zone',
      color: '#3b82f6', // blue-500
      areas: []
    }
  ]);

  // Service Worker state
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string>('');

  // System health state
  const [systemStatus, setSystemStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [deviceConnectivity, setDeviceConnectivity] = useState<'all_online' | 'some_offline' | 'all_offline'>('all_online');
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [offlineDevices, setOfflineDevices] = useState<string[]>([]);

  // SSE context for real-time area updates
  const sseCtx = useSSEContext();

  // Load organization and locations
  const loadOrganizationAndLocations = async (savedLocation: string | null) => {
    console.log('🏢 Loading organization and locations...');
    try {
      const apiKeyDetails = await getApiKeyDetails();
      console.log('🏢 getApiKeyDetails RAW response:', apiKeyDetails);
      
      if (apiKeyDetails.error) {
        logger.error('Error fetching API key details:', apiKeyDetails.error);
        console.error('❌ API Key Details Error:', apiKeyDetails.error);
      } else if (apiKeyDetails.data) {
        if (apiKeyDetails.data.organizationInfo) {
          console.log('✅ Organization loaded:', apiKeyDetails.data.organizationInfo.id);
          setOrganization(apiKeyDetails.data.organizationInfo);
          localStorage.setItem('fusion_organization', JSON.stringify(apiKeyDetails.data.organizationInfo));
        } else {
          console.log('❌ No organization info in API key details');
        }
      } else {
        console.log('❌ No data in API key details response');
      }
    } catch (error) {
      logger.error('Exception in getApiKeyDetails:', error);
      console.error('💥 Exception in getApiKeyDetails:', error);
    }
    
    // Then load locations
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        console.log('🏠 Setting selected location:', location.name);
        setSelectedLocation(location);
        
        // Load areas first, then load events with area data
        console.log('🏠 Loading areas for location:', location.name);
        await loadAreas(location);
        
        // Load devices
        console.log('🏠 Loading devices...');
        await loadDevices();
        
        console.log('✅ Location setup complete');
      } catch (e) {
        logger.error('Error parsing saved location:', e);
        console.error('❌ Error parsing saved location:', e);
        setError('Failed to load saved location');
        await loadLocations();
      }
    } else {
      console.log('🏠 No saved location, loading locations list');
      await loadLocations();
    }
  };

  // Load locations
  const loadLocations = async () => {
    try {
      const response = await optimizedGetLocations();
      if (response.data) {
        setLocations(response.data);
        setShowLocationSelect(true);
      } else {
        setError('Failed to load locations');
      }
    } catch (error) {
      logger.error('Error loading locations:', error);
      setError('Failed to load locations');
    }
  };

  // Load areas
  const loadAreas = async (location: any) => {
    console.log('🏠 Loading areas for location:', location.name);
    try {
      const response = await optimizedGetAreas(location.id);
      console.log('🏠 Areas response:', response);
      
      if (response.data && response.data.length > 0) {
        console.log('✅ Found', response.data.length, 'areas');
        setAreas(response.data);
        setError(''); // Clear any previous errors
      } else if (response.data && response.data.length === 0) {
        console.log('⚠️ No areas found for location');
        setAreas([]);
        setError(''); // Clear any previous errors
      } else {
        console.error('❌ Failed to load areas:', response.error);
        setError('Failed to load areas');
      }
    } catch (error) {
      console.error('💥 Exception loading areas:', error);
      logger.error('Error loading areas:', error);
      setError('Failed to load areas');
    }
  };

  // Load devices
  const loadDevices = async () => {
    try {
      const response = await optimizedGetDevices();
      if (response.data) {
        setDevices(response.data);
      } else {
        setError('Failed to load devices');
      }
    } catch (error) {
      logger.error('Error loading devices:', error);
      setError('Failed to load devices');
    }
  };

  // Load settings from localStorage
  const loadSettings = () => {
    try {
      // Load show seconds setting
      const savedShowSeconds = localStorage.getItem('show_seconds');
      if (savedShowSeconds !== null) {
        setShowSeconds(savedShowSeconds === 'true');
      }

      // Load highlight pin buttons setting
      const savedHighlightPinButtons = localStorage.getItem('highlight_pin_buttons');
      if (savedHighlightPinButtons !== null) {
        setHighlightPinButtons(savedHighlightPinButtons === 'true');
      }

      // Load show zones preview setting
      const savedShowZones = localStorage.getItem('show_zones_preview');
      if (savedShowZones !== null) {
        setShowZonesPreview(savedShowZones === 'true');
      }

      // Load test design settings
      const savedUseTestDesign = localStorage.getItem('use_test_design');
      if (savedUseTestDesign !== null) {
        setUseTestDesign(savedUseTestDesign === 'true');
      }

      const savedUseTestDesign2 = localStorage.getItem('use_test_design_2');
      if (savedUseTestDesign2 !== null) {
        setUseTestDesign2(savedUseTestDesign2 === 'true');
      }

      // Load alarm zones
      const savedAlarmZones = localStorage.getItem('alarm_zones');
      if (savedAlarmZones) {
        try {
          setAlarmZones(JSON.parse(savedAlarmZones));
        } catch (e) {
          logger.error('Failed to parse saved alarm zones:', e);
        }
      }
    } catch (error) {
      logger.error('Error loading settings:', error);
    }
  };

  // Real-time Area updates via SSE
  useEffect(() => {
    const client = sseCtx?.sseClient;
    if (!client) return;

    const handleAreaUpdate = (evt: any) => {
      if (!evt?.areaId) return;
      const newArmedState: Area['armedState'] = evt.type === 'DISARMED' ? 'DISARMED' : 'ARMED_AWAY';

      setAreas(prev => {
        const idx = prev.findIndex(a => a.id === evt.areaId);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], armedState: newArmedState } as Area;
          return copy;
        }
        // If area not present yet, add minimal stub
        return [
          ...prev,
          {
            id: evt.areaId,
            name: evt.areaName ?? `Area ${evt.areaId}`,
            armedState: newArmedState,
            locationId: evt.locationId || '',
            locationName: evt.locationName || '',
            createdAt: '',
            updatedAt: ''
          } as Area
        ];
      });
    };

    client.on('area_state_change', handleAreaUpdate);
    return () => {
      client.off('area_state_change', handleAreaUpdate);
    };
  }, [sseCtx]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Handle location selection
  const handleLocationSelect = async (location: any) => {
    setSelectedLocation(location);
    setShowLocationSelect(false);
    localStorage.setItem('fusion_selected_location', JSON.stringify(location));
    
    // Load areas for the selected location
    await loadAreas(location);
    
    // Load devices
    await loadDevices();
  };

  // Handle PIN key press
  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 6 && !isProcessing) {
      setPin(prev => prev + digit);
    }
  };

  // Handle authentication
  const handleAuthenticate = async () => {
    if (pin.length !== 6 || isProcessing) return;

    setIsProcessing(true);
    setError('');
    
    const startTime = performance.now();
    
    try {
      const result = await validatePin(pin);
      const duration = performance.now() - startTime;
      
      if (!result.error && result.data?.valid) {
        setIsAuthenticated(true);
        setAuthenticatedUser(result.data?.userName || 'User');
        setPin('');
        
        // Track successful authentication
        analytics.track({
          action: 'pin_authentication_success',
          category: 'authentication',
          label: 'success',
          properties: {
            duration: Math.round(duration),
            location: selectedLocation?.name || 'unknown'
          }
        });
        
        performanceMonitor.trackMetric({
          name: 'pin_authentication_duration',
          value: duration,
          rating: duration > 3000 ? 'poor' : duration > 1000 ? 'needs-improvement' : 'good'
        });
      } else {
        setError('Invalid PIN');
        setPin('');
        
        // Track failed authentication
        analytics.track({
          action: 'pin_authentication_failed',
          category: 'authentication',
          label: 'failed',
          properties: {
            duration: Math.round(duration),
            location: selectedLocation?.name || 'unknown'
          }
        });
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Authentication error:', error);
      setError('Authentication failed');
      setPin('');
      
      analytics.track({
        action: 'pin_authentication_error',
        category: 'authentication',
        label: 'error',
        properties: {
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : 'Unknown error',
          location: selectedLocation?.name || 'unknown'
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthenticatedUser('');
    setPin('');
    setError('');
    
    analytics.track({
      action: 'user_logout',
      category: 'authentication',
      label: 'logout',
      properties: {
        location: selectedLocation?.name || 'unknown'
      }
    });
  };

  // Check device status
  const checkDeviceStatus = (areasToCheck: Area | Area[]) => {
    const areas = Array.isArray(areasToCheck) ? areasToCheck : [areasToCheck];
    const warnings: string[] = [];
    
    areas.forEach(area => {
      // Filter devices by area ID since Area interface doesn't have devices property
      const areaDevices = devices.filter(device => device.areaId === area.id);
      if (!areaDevices || areaDevices.length === 0) {
        warnings.push(`${area.name}: No devices found`);
        return;
      }
      
      areaDevices.forEach((device: Device) => {
        const type = device.type.toLowerCase();
        const deviceType = device.deviceTypeInfo?.type?.toLowerCase() || '';
        const status = device.status?.toLowerCase() || '';
        const displayState = device.displayState?.toLowerCase() || '';
        
        // Check for offline devices
        if (status === 'offline' || displayState === 'offline') {
          warnings.push(`${area.name} - ${device.name}: Device offline`);
        }
        
        // Check for low battery on keypads
        if ((type === 'keypad' || deviceType === 'keypad') && 
            displayState === 'low battery') {
          warnings.push(`${area.name} - ${device.name}: Low battery`);
        }
        
        // Check for tamper alerts
        if (displayState === 'tamper' || displayState === 'tampered') {
          warnings.push(`${area.name} - ${device.name}: Tamper detected`);
        }
      });
    });
    
    return warnings;
  };

  // Handle area toggle
  const handleAreaToggle = async (area: Area, skipConfirmation = false) => {
    if (isProcessing) return;
    
    const newState = area.armedState === 'DISARMED' ? 'ARMED_AWAY' : 'DISARMED';
    const warnings = checkDeviceStatus(area);
    
    if (warnings.length > 0 && !skipConfirmation) {
      setAreaWarnings(prev => ({ ...prev, [area.id]: warnings }));
      setPendingAreaToggle({ area, newState });
      setShowWarningConfirm(true);
      return;
    }
    
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      const result = await updateAreaState(area.id, newState);
      const duration = performance.now() - startTime;
      
      if (!result.error) {
        // Update local state
        setAreas(prev => prev.map(a => 
          a.id === area.id ? { ...a, armedState: newState } : a
        ));
        
        analytics.track({
          action: 'area_state_change',
          category: 'security',
          label: newState,
          properties: {
            area: area.name,
            newState,
            duration: Math.round(duration),
            location: selectedLocation?.name || 'unknown'
          }
        });
        
        performanceMonitor.trackMetric({
          name: 'area_toggle_duration',
          value: duration,
          rating: duration > 5000 ? 'poor' : duration > 2000 ? 'needs-improvement' : 'good'
        });
      } else {
        setError(`Failed to ${newState.toLowerCase()} ${area.name}`);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Area toggle error:', error);
      setError(`Failed to ${newState.toLowerCase()} ${area.name}`);
      
      analytics.track({
        action: 'area_state_change_error',
        category: 'security',
        label: 'error',
        properties: {
          area: area.name,
          newState,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : 'Unknown error',
          location: selectedLocation?.name || 'unknown'
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle toggle all areas
  const handleToggleAll = async (skipConfirmation = false) => {
    if (isProcessing || areas.length === 0) return;
    
    const armedAreas = areas.filter(a => a.armedState !== 'DISARMED');
    const newState = armedAreas.length > 0 ? 'DISARMED' : 'ARMED_AWAY';
    
    const allWarnings = areas.flatMap(area => checkDeviceStatus(area));
    
    if (allWarnings.length > 0 && !skipConfirmation) {
      setDeviceWarnings(allWarnings);
      setPendingToggleAll(newState);
      setShowWarningConfirm(true);
      return;
    }
    
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      const results = await Promise.allSettled(
        areas.map(area => updateAreaState(area.id, newState))
      );
      
      const duration = performance.now() - startTime;
      
      // Update local state for successful updates
      const successfulUpdates = results.filter(r => r.status === 'fulfilled' && !r.value.error);
      if (successfulUpdates.length > 0) {
        setAreas(prev => prev.map(area => ({ ...area, armedState: newState })));
      }
      
      analytics.track({
        action: 'toggle_all_areas',
        category: 'security',
        label: newState,
        properties: {
          newState,
          totalAreas: areas.length,
          successfulUpdates: successfulUpdates.length,
          duration: Math.round(duration),
          location: selectedLocation?.name || 'unknown'
        }
      });
      
      performanceMonitor.trackMetric({
        name: 'toggle_all_duration',
        value: duration,
        rating: duration > 10000 ? 'poor' : duration > 5000 ? 'needs-improvement' : 'good'
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Toggle all error:', error);
      setError(`Failed to ${newState.toLowerCase()} all areas`);
      
      analytics.track({
        action: 'toggle_all_areas_error',
        category: 'security',
        label: 'error',
        properties: {
          newState,
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : 'Unknown error',
          location: selectedLocation?.name || 'unknown'
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle API key update
  const handleApiKeyUpdate = async (newKey: string) => {
    try {
      const apiKeyDetails = await getApiKeyDetails();
      if (!apiKeyDetails.error && apiKeyDetails.data) {
        setApiKey(newKey);
        localStorage.setItem('fusion_api_key', newKey);
        setShowSettings(false);
        
        analytics.track({
          action: 'api_key_updated',
          category: 'settings',
          label: 'success',
          properties: {
            location: selectedLocation?.name || 'unknown'
          }
        });
      } else {
        setError('Invalid API key');
      }
    } catch (error) {
      logger.error('API key update error:', error);
      setError('Failed to update API key');
    }
  };

  // Handle check for updates
  const handleCheckForUpdates = async () => {
    setIsCheckingForUpdate(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        setLastUpdateCheck(new Date().toLocaleTimeString());
      }
    } catch (error) {
      logger.error('Update check error:', error);
    } finally {
      setIsCheckingForUpdate(false);
    }
  };

  // Format relative time
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Get zones with areas
  const getZonesWithAreas = () => {
    return alarmZones.map(zone => {
      const zoneAreas = areas.filter(area => {
        const areaName = area.name.toLowerCase();
        return zone.areas.some(zoneAreaId => {
          const zoneName = zoneAreaId.toLowerCase();
          return areaName.includes(zoneName) || zoneName.includes(areaName);
        });
      });
      
      return {
        ...zone,
        areas: zoneAreas,
        armedCount: zoneAreas.filter(a => a.armedState !== 'DISARMED').length,
        totalCount: zoneAreas.length
      };
    });
  };

  // Handle zone toggle
  const handleZoneToggle = async (zone: AlarmZone) => {
    const zonesWithAreas = getZonesWithAreas();
    const zoneData = zonesWithAreas.find(z => z.id === zone.id);
    
    if (!zoneData || zoneData.areas.length === 0) return;
    
    const newState = zoneData.armedCount > 0 ? 'DISARMED' : 'ARMED_AWAY';
    
    setIsProcessing(true);
    try {
      const results = await Promise.allSettled(
        zoneData.areas.map(area => updateAreaState(area.id, newState))
      );
      
      // Update local state for successful updates
      const successfulUpdates = results.filter(r => r.status === 'fulfilled' && !r.value.error);
      if (successfulUpdates.length > 0) {
        setAreas(prev => prev.map(area => {
          const isInZone = zoneData.areas.some(zoneArea => zoneArea.id === area.id);
          return isInZone ? { ...area, armedState: newState } : area;
        }));
      }
    } catch (error) {
      logger.error('Zone toggle error:', error);
      setError(`Failed to ${newState.toLowerCase()} ${zone.name}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // State
    apiKey,
    error,
    loading,
    organization,
    locations,
    selectedLocation,
    areas,
    pin,
    isAuthenticated,
    authenticatedUser,
    isProcessing,
    pressedButton,
    showSettings,
    showLocationSelect,
    showEvents,
    showAutomation,
    showZonesPreview,
    showSeconds,
    highlightPinButtons,
    showWarningConfirm,
    showWarningDetails,
    useDesign2,
    useTestDesign,
    useTestDesign2,
    devices,
    deviceWarnings,
    pendingAreaToggle,
    pendingToggleAll,
    areaWarnings,
    alarmZones,
    isCheckingForUpdate,
    lastUpdateCheck,
    systemStatus,
    deviceConnectivity,
    lastHeartbeat,
    offlineDevices,

    // Setters
    setApiKey,
    setError,
    setLoading,
    setPin,
    setPressedButton,
    setShowSettings,
    setShowLocationSelect,
    setShowEvents,
    setShowAutomation,
    setShowZonesPreview,
    setShowSeconds,
    setHighlightPinButtons,
    setShowWarningConfirm,
    setShowWarningDetails,
    setUseTestDesign,
    setUseTestDesign2,
    setDeviceWarnings,
    setPendingAreaToggle,
    setPendingToggleAll,
    setAreaWarnings,
    setAlarmZones,
    setIsCheckingForUpdate,
    setLastUpdateCheck,
    setSystemStatus,
    setDeviceConnectivity,
    setLastHeartbeat,
    setOfflineDevices,

    // Actions
    loadOrganizationAndLocations,
    loadLocations,
    loadAreas,
    loadDevices,
    loadSettings,
    handleLocationSelect,
    handlePinKeyPress,
    handleAuthenticate,
    handleLogout,
    checkDeviceStatus,
    handleAreaToggle,
    handleToggleAll,
    handleApiKeyUpdate,
    handleCheckForUpdates,
    formatRelativeTime,
    getZonesWithAreas,
    handleZoneToggle,
  };
} 