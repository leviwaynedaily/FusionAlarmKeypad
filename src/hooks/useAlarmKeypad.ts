import { useState, useEffect } from 'react';
import { useSSEContext } from '@/hooks/SSEContext';
import { 
  validatePin, 
  getApiKeyDetails, 
  Space, 
  Device, 
  Organization, 
  Camera, 
  AlarmZone, 
  ZoneWithDevices, 
  EventFilterSettings,
  updateDeviceState as apiUpdateDeviceState,
  armDevices,
  disarmDevices,
  getAlarmZones,
  getAlarmZoneDevices,
  setAlarmZoneArmedState,
  getCameras,
  saveUserPreferences,
  loadUserPreferences
} from '@/lib/api';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance';
import { 
  optimizedGetLocations, 
  optimizedGetSpaces, 
  optimizedGetDevices, 
  optimizedGetDashboardData,
  optimizedGetAlarmZones,
  optimizedGetCameras,
  optimizedUpdateDeviceState,
  clearCache,
  SmartPoller 
} from '@/lib/api-optimized';

// API keys from environment variables
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
const DEFAULT_WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';

export function useAlarmKeypad() {
  // Core state
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pressedButton, setPressedButton] = useState<string | null>(null);

  // Legacy state for backwards compatibility during migration
  const [areas, setAreas] = useState<any[]>([]);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [showZonesPreview, setShowZonesPreview] = useState(true);
  const [showSeconds, setShowSeconds] = useState(true);
  const [highlightPinButtons, setHighlightPinButtons] = useState(true);
  const [showLiveEvents, setShowLiveEvents] = useState(true); // Default to true
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [showWarningDetails, setShowWarningDetails] = useState<string | null>(null);
  const [useDesign2, setUseDesign2] = useState(false);
  const [useTestDesign, setUseTestDesign] = useState(false);
  const [useTestDesign2, setUseTestDesign2] = useState(false);

  // Event filtering settings
  const [eventFilterSettings, setEventFilterSettings] = useState<EventFilterSettings>({
    showSpaceEvents: true,
    showAlarmZoneEvents: true,
    showAllEvents: true,
    showOnlyAlarmZoneEvents: false,
    selectedAlarmZones: [], // Empty = show all alarm zones
    eventTypes: {},
    categories: {},
    eventTypeSettings: {}
  });

  // Save showLiveEvents setting to localStorage
  useEffect(() => {
    localStorage.setItem('show_timeline', showLiveEvents.toString());
  }, [showLiveEvents]);

  // Device and space state
  const [deviceWarnings, setDeviceWarnings] = useState<string[]>([]);
  const [pendingSpaceToggle, setPendingSpaceToggle] = useState<{ space: Space, newState: string } | null>(null);
  const [pendingToggleAll, setPendingToggleAll] = useState<string | null>(null);
  const [spaceWarnings, setSpaceWarnings] = useState<Record<string, string[]>>({});

  // Alarm zones (now fetched from Fusion API)
  const [alarmZones, setAlarmZones] = useState<AlarmZone[]>([]);

  // Service Worker state
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string>('');

  // System health state
  const [systemStatus, setSystemStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [deviceConnectivity, setDeviceConnectivity] = useState<'all_online' | 'some_offline' | 'all_offline'>('all_online');
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [offlineDevices, setOfflineDevices] = useState<string[]>([]);

  // Listen for alarm zone state changes from SSE
  useEffect(() => {
    const handleAlarmZoneStateChange = (event: any) => {
      const eventDetail = event.detail;
      
      console.log('🔒 Alarm Zone State Change Handler:', eventDetail);
      
      // Handle direct alarm zone events (real Fusion events)
      if (eventDetail.isDirectAlarmZoneEvent && eventDetail.alarmZoneId) {
        const { alarmZoneId, alarmZoneName, currentState, previousState, timestamp } = eventDetail;
        
        console.log('🔒 Processing direct alarm zone event:', {
          zoneId: alarmZoneId,
          zoneName: alarmZoneName,
          currentState,
          previousState,
          timestamp
        });
        
        // Update the specific alarm zone directly by ID
        setAlarmZones(prev => {
          return prev.map(zone => {
            if (zone.id === alarmZoneId) {
              console.log(`🔒 Updating zone "${zone.name}" (${zone.id}) to state: ${currentState}`);
              return {
                ...zone,
                armedState: currentState as 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED',
                lastArmedStateChangeReason: `Real-time update: ${previousState} → ${currentState}`
              };
            }
            return zone;
          });
        });
        
        console.log(`🔒 Successfully updated alarm zone "${alarmZoneName}" to ${currentState}`);
        return; // Exit early for direct alarm zone events
      }
      
      // Legacy handler for device-based events (keeping for backward compatibility)
      const { type, category, deviceName, spaceName, displayState, timestamp } = eventDetail;
      
      console.log('🔒 Processing device-based alarm zone event:', {
        type,
        category,
        deviceName,
        spaceName,
        displayState,
        timestamp
      });
      
      // Determine the new armed state from the event type
      const eventTypeLower = type?.toLowerCase() || '';
      let newArmedState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED' | null = null;
      
      if (eventTypeLower.includes('disarm')) {
        newArmedState = 'DISARMED';
      } else if (eventTypeLower.includes('arm')) {
        // Default to ARMED_AWAY, could be enhanced to detect ARMED_STAY
        newArmedState = 'ARMED_AWAY';
      } else if (eventTypeLower.includes('trigger')) {
        newArmedState = 'TRIGGERED';
      }
      
      if (!newArmedState) {
        console.log('🔒 Could not determine armed state from event type:', type);
        return;
      }
      
      console.log('🔒 Determined new armed state:', newArmedState);
      
      // Update alarm zones that contain the affected device
      const zonesUpdated = new Set<string>();
      
      setAlarmZones(prev => {
        return prev.map(zone => {
          // Check if this zone contains the device by name or space
          const zoneDevices = devices.filter(device => 
            zone.deviceIds?.includes(device.id)
          );
          
          const affectedByDevice = zoneDevices.some(device => 
            device.name === deviceName
          );
          
          const affectedBySpace = spaceName && zoneDevices.some(device => 
            device.spaceName === spaceName
          );
          
          if (affectedByDevice || affectedBySpace) {
            console.log(`🔒 Updating zone "${zone.name}" to state: ${newArmedState}`);
            zonesUpdated.add(zone.id);
            
            // Update the zone's armed state
            return { 
              ...zone, 
              armedState: newArmedState,
              lastArmedStateChangeReason: `Real-time update from ${deviceName || spaceName}` 
            };
          }
          
          return zone;
        });
      });
      
      // Also update device states for consistency
      if (deviceName) {
        setDevices(prev => prev.map(device => {
          if (device.name === deviceName) {
            console.log(`🔒 Updating device "${deviceName}" to state: ${newArmedState}`);
            return { ...device, armedState: newArmedState };
          }
          return device;
        }));
      }
      
      // If no zones were updated and we have a valid location, do a targeted refresh
      if (zonesUpdated.size === 0 && selectedLocation && (deviceName || spaceName)) {
        console.log('🔒 No zones updated locally, refreshing alarm zones from API');
        loadAlarmZones(selectedLocation);
      } else if (zonesUpdated.size > 0) {
        console.log(`🔒 Successfully updated ${zonesUpdated.size} alarm zone(s) in real-time`);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('alarmZoneStateChange', handleAlarmZoneStateChange);
      
      return () => {
        window.removeEventListener('alarmZoneStateChange', handleAlarmZoneStateChange);
      };
    }
  }, [selectedLocation, devices]); // Removed alarmZones from deps to prevent infinite loops

  // SSE context for real-time space and device updates
  const sseCtx = useSSEContext();

  // Load organization and locations
  const loadOrganizationAndLocations = async (savedLocation: string | null) => {
    console.log('🏢 Loading organization and locations...');
    try {
      const apiKeyDetails = await getApiKeyDetails();
      // 🔒 SECURITY: Only log safe parts of API response to prevent exposure of sensitive data
      console.log('🏢 getApiKeyDetails response status:', {
        hasData: !!apiKeyDetails.data,
        hasError: !!apiKeyDetails.error,
        organizationId: apiKeyDetails.data?.organizationInfo?.id || 'none'
      });
      
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
        
        // Load spaces first, then load events with space data
        console.log('🏠 Loading spaces for location:', location.name);
        await loadSpaces(location);
        
        // Devices are loaded as part of loadSpaces
        console.log('✅ Devices loaded with spaces');
        
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

  // Legacy function - replaced by loadSpaces

  // Load devices
  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await optimizedGetDevices();
      if (response.error) {
        setError(response.error);
        return;
      }
      
      setDevices(response.data);
      console.log('📱 Loaded', response.data.length, 'devices');

      // Load alarm zones after devices are loaded
      if (selectedLocation) {
        await loadAlarmZones(selectedLocation);
      }
      
    } catch (error) {
      logger.error('Error loading devices:', error);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
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

      // Load show live events setting (renamed from show_live_events to show_timeline)
      const savedShowTimeline = localStorage.getItem('show_timeline');
      if (savedShowTimeline !== null) {
        setShowLiveEvents(savedShowTimeline === 'true');
      } else {
        // Migration: check old key and migrate
        const oldSavedShowLiveEvents = localStorage.getItem('show_live_events');
        if (oldSavedShowLiveEvents !== null) {
          const value = oldSavedShowLiveEvents === 'true';
          setShowLiveEvents(value);
          localStorage.setItem('show_timeline', value.toString());
          localStorage.removeItem('show_live_events'); // Clean up old key
        }
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

  // Update device state using the real API
  const updateDeviceState = async (deviceId: string, newState: string) => {
    try {
      const response = await optimizedUpdateDeviceState(deviceId, newState);
      if (response.error) {
        throw new Error(response.error);
      }
      return response.data;
    } catch (error) {
      logger.error('Error updating device state:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Load alarm zones for a location (local zones, no API call needed)
  const loadAlarmZones = async (location: any) => {
    try {
      console.log('🔒 Loading alarm zones from Fusion API for location:', location.id);
      console.log('🔒 Location object:', location);
      
      const response = await optimizedGetAlarmZones(location.id);
      console.log('🔒 Alarm zones API response:', response);
      
      if (response.error) {
        logger.error('Error loading alarm zones:', response.error);
        console.error('❌ Alarm zones error:', response.error);
        setError(`Failed to load alarm zones: ${response.error}`);
        return;
      }

      // Transform API response to include legacy fields for backwards compatibility
      const transformedZones: AlarmZone[] = response.data.map(zone => ({
        ...zone,
        devices: [], // Will be populated when devices are loaded
        color: getZoneColor(zone.name), // Assign colors based on zone name
        isActive: true
      }));

      setAlarmZones(transformedZones);
      console.log('🔒 Successfully loaded', transformedZones.length, 'alarm zones:');
      console.log('🔒 Zones:', transformedZones.map(z => ({ id: z.id, name: z.name, armedState: z.armedState, deviceCount: z.deviceIds?.length || 0 })));
      
      // After loading zones, load device counts for each zone
      // Note: We'll use setTimeout to allow state to update first
      setTimeout(() => {
        if (transformedZones.length > 0) {
          console.log('🔒 Loading device counts for zones...');
          // Load device counts asynchronously after zones are set
          Promise.all(
            transformedZones.map(async (zone) => {
              try {
                const response = await getAlarmZoneDevices(zone.id);
                if (!response.error) {
                  console.log(`🔒 Zone "${zone.name}" has ${response.data.length} devices`);
                  return {
                    ...zone,
                    deviceIds: response.data.map(device => device.id),
                    devices: response.data
                  };
                } else {
                  console.error(`❌ Failed to load devices for zone "${zone.name}":`, response.error);
                  return zone;
                }
              } catch (error) {
                console.error(`💥 Exception loading devices for zone "${zone.name}":`, error);
                return zone;
              }
            })
          ).then(zoneUpdates => {
            setAlarmZones(zoneUpdates);
            console.log('🔒 Finished loading device counts for all zones');
          });
        }
      }, 100);
      
    } catch (error) {
      logger.error('Error loading alarm zones:', error);
      console.error('💥 Exception loading alarm zones:', error);
      setError('Failed to load alarm zones');
      // Don't set empty zones on error - keep whatever was loaded before
    }
  };

  // Helper function to assign colors to zones based on their name
  const getZoneColor = (zoneName: string): string => {
    const name = zoneName.toLowerCase();
    if (name.includes('perimeter') || name.includes('exterior') || name.includes('outside')) {
      return '#ef4444'; // red-500
    } else if (name.includes('interior') || name.includes('inside') || name.includes('motion')) {
      return '#f59e0b'; // amber-500  
    } else if (name.includes('critical') || name.includes('security') || name.includes('safe')) {
      return '#dc2626'; // red-600
    } else if (name.includes('garage') || name.includes('storage')) {
      return '#3b82f6'; // blue-500
    } else {
      return '#6b7280'; // gray-500 (default)
    }
  };

  // Load spaces with automatic zone assignment
  const loadSpaces = async (location: any) => {
    if (!location?.id) {
      console.error('❌ No location provided to loadSpaces');
      return;
    }
    
    try {
      setLoading(true);
      const response = await optimizedGetSpaces(location.id);
      const spacesData = response.data || [];
      setSpaces(spacesData);
      
      console.log('🏠 Loaded', response.data.length, 'spaces with device info');
      
      // Load alarm zones after spaces are loaded
      await loadAlarmZones(location);
      console.log('🔒 Alarm zones loaded after spaces');
      
    } catch (error) {
      logger.error('Error loading spaces:', error);
      setError('Failed to load spaces');
    } finally {
      setLoading(false);
    }
  };

  // Event filter settings management
  const updateEventFilterSettings = async (newSettings: Partial<EventFilterSettings>) => {
    const updated = { ...eventFilterSettings, ...newSettings };
    setEventFilterSettings(updated);
    
    // Save to localStorage as backup
    localStorage.setItem('event_filter_settings', JSON.stringify(updated));
    
    // Save to database if we have organization context
    if (organization?.id) {
      try {
        await saveUserPreferences(
          organization.id,
          selectedLocation?.id || null,
          {
            eventFilterSettings: updated,
            customEventNames: {}
          },
          'default' // userId - using default for now
        );
        logger.info('Event filter settings saved to database');
      } catch (error) {
        logger.error('Failed to save event filter settings to database:', error);
        // Settings are still saved to localStorage as fallback
      }
    }
  };

  // Load event filter settings from database (with localStorage fallback)
  useEffect(() => {
    const loadEventFilterSettings = async () => {
      let loadedSettings = null;
      
      // First try to load from database if we have organization context
      if (organization?.id) {
        try {
          const response = await loadUserPreferences(
            organization.id,
            selectedLocation?.id || null,
            'default' // userId - using default for now
          );
          
          if (response.data?.eventFilterSettings) {
            loadedSettings = response.data.eventFilterSettings;
            logger.info('Event filter settings loaded from database');
          }
        } catch (error) {
          logger.error('Failed to load event filter settings from database:', error);
        }
      }
      
      // Fallback to localStorage if database load failed
      if (!loadedSettings) {
        const savedSettings = localStorage.getItem('event_filter_settings');
        if (savedSettings) {
          try {
            loadedSettings = JSON.parse(savedSettings);
            logger.info('Event filter settings loaded from localStorage');
          } catch (error) {
            logger.error('Error parsing event filter settings from localStorage:', error);
          }
        }
      }
      
      // Apply loaded settings with defaults
      if (loadedSettings) {
        const settingsWithDefaults = {
          showSpaceEvents: true,
          showAlarmZoneEvents: true,
          showAllEvents: true,
          showOnlyAlarmZoneEvents: false,
          selectedAlarmZones: [],
          eventTypes: {},
          categories: {},
          eventTypeSettings: {},
          ...loadedSettings
        };
        setEventFilterSettings(settingsWithDefaults);
      }
    };

    loadEventFilterSettings();
  }, [organization?.id, selectedLocation?.id]);

  // SSE event handlers for real-time updates
  useEffect(() => {
    if (!sseCtx) return;

    const handleSpaceStateChange = (data: any) => {
      // Update device state when space state changes
      if (data.spaceId) {
        setDevices(prev => prev.map(device => 
          device.spaceId === data.spaceId 
            ? { ...device, armedState: data.armedState }
            : device
        ));
      }
    };

    const handleDeviceStateChange = (data: any) => {
      // Update specific device state
      if (data.deviceId) {
        setDevices(prev => prev.map(device => 
          device.id === data.deviceId 
            ? { ...device, armedState: data.armedState, status: data.status }
            : device
        ));
      }
    };

    // TODO: Set up SSE listeners when SSE context is properly implemented
    // This will be updated when we implement the SSE integration
    
  }, [sseCtx]);

  // Handle location selection
  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
    setShowLocationSelect(false);
    localStorage.setItem('fusion_selected_location', JSON.stringify(location));
    loadSpaces(location);
    // Also load alarm zones when location is selected
    loadAlarmZones(location);
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
  const checkDeviceStatus = (spacesToCheck: Space | Space[]) => {
    const spacesArray = Array.isArray(spacesToCheck) ? spacesToCheck : [spacesToCheck];
    const warnings: string[] = [];
    
    spacesArray.forEach(space => {
      // Filter devices by space ID
      const spaceDevices = devices.filter(device => device.spaceId === space.id);
      if (!spaceDevices || spaceDevices.length === 0) {
        warnings.push(`${space.name}: No devices found`);
        return;
      }
      
      spaceDevices.forEach((device: Device) => {
        const type = device.type.toLowerCase();
        const deviceType = device.deviceTypeInfo?.type?.toLowerCase() || '';
        const status = device.status?.toLowerCase() || '';
        const displayState = device.displayState?.toLowerCase() || '';
        
        // Check for offline devices
        if (status === 'offline' || displayState === 'offline') {
          warnings.push(`${space.name} - ${device.name}: Device offline`);
        }
        
        // Check for low battery on keypads
        if ((type === 'keypad' || deviceType === 'keypad') && 
            displayState === 'low battery') {
          warnings.push(`${space.name} - ${device.name}: Low battery`);
        }
        
        // Check for tamper alerts
        if (displayState === 'tamper' || displayState === 'tampered') {
          warnings.push(`${space.name} - ${device.name}: Tamper detected`);
        }
      });
    });
    
    return warnings;
  };

  // Handle space toggle
  const handleSpaceToggle = async (space: Space, skipConfirmation = false) => {
    if (isProcessing) return;
    
    // Check if space has devices that can be armed/disarmed
    const spaceDevices = devices.filter(device => device.spaceId === space.id);
    if (spaceDevices.length === 0) {
      setError(`No devices found in ${space.name}`);
      return;
    }
    
    // Determine new state based on current device states
    const armedDevices = spaceDevices.filter(device => device.armedState && device.armedState !== 'DISARMED');
    const newState = armedDevices.length > 0 ? 'DISARMED' : 'ARMED_AWAY';
    const warnings = checkDeviceStatus(space);
    
    if (warnings.length > 0 && !skipConfirmation) {
      setSpaceWarnings(prev => ({ ...prev, [space.id]: warnings }));
      setPendingSpaceToggle({ space, newState });
      setShowWarningConfirm(true);
      return;
    }
    
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      // Update all devices in the space
      const deviceIds = spaceDevices.map(device => device.id);
      let result;
      
      if (newState === 'DISARMED') {
        result = await disarmDevices(deviceIds);
      } else {
        result = await armDevices(deviceIds, 'ARMED_AWAY');
      }
      
      const duration = performance.now() - startTime;
      
      if (result.data.success) {
        // Update local device states
        setDevices(prev => prev.map(device => {
          const isInSpace = deviceIds.includes(device.id);
          return isInSpace ? { ...device, armedState: newState } : device;
        }));
        
        analytics.track({
          action: 'space_state_change',
          category: 'security',
          label: newState,
          properties: {
            space: space.name,
            newState,
            duration: Math.round(duration),
            location: selectedLocation?.name || 'unknown'
          }
        });
        
        performanceMonitor.trackMetric({
          name: 'space_toggle_duration',
          value: duration,
          rating: duration > 5000 ? 'poor' : duration > 2000 ? 'needs-improvement' : 'good'
        });
      } else {
        setError(`Failed to ${newState.toLowerCase()} ${space.name}`);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Space toggle error:', error);
      setError(`Failed to ${newState.toLowerCase()} ${space.name}`);
      
      analytics.track({
        action: 'space_state_change_error',
        category: 'security',
        label: 'error',
        properties: {
          space: space.name,
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

  // Handle toggle all spaces
  const handleToggleAll = async (skipConfirmation = false) => {
    if (isProcessing || spaces.length === 0) return;
    
    // Check if any devices in any space are armed
    const allDevices = devices;
    const armedDevices = allDevices.filter(d => d.armedState !== 'DISARMED');
    const newState = armedDevices.length > 0 ? 'DISARMED' : 'ARMED_AWAY';
    
    const allWarnings = spaces.flatMap(space => checkDeviceStatus(space));
    
    if (allWarnings.length > 0 && !skipConfirmation) {
      setDeviceWarnings(allWarnings);
      setPendingToggleAll(newState);
      setShowWarningConfirm(true);
      return;
    }
    
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      // Update all devices instead of areas
      const deviceIds = allDevices.map(device => device.id);
      let result;
      
      if (newState === 'DISARMED') {
        result = await disarmDevices(deviceIds);
      } else {
        result = await armDevices(deviceIds, 'ARMED_AWAY');
      }
      
      const duration = performance.now() - startTime;
      
      if (result.data.success) {
        // Update local device states
        setDevices(prev => prev.map(device => ({ ...device, armedState: newState })));
        
        // Update alarm zones
        setAlarmZones(prev => prev.map(zone => ({ ...zone, armedState: newState })));
      }
      
      analytics.track({
        action: 'toggle_all_spaces',
        category: 'security',
        label: newState,
        properties: {
          newState,
          totalSpaces: spaces.length,
          totalDevices: deviceIds.length,
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
      setError(`Failed to ${newState.toLowerCase()} all devices`);
      
      analytics.track({
        action: 'toggle_all_spaces_error',
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

  // Get zones with devices (using cached device data)
  const getZonesWithDevices = (): ZoneWithDevices[] => {
    return alarmZones.map(zone => {
      // Find devices that belong to this zone using deviceIds from the API
      const zoneDevices = devices.filter(device => 
        zone.deviceIds?.includes(device.id) || false
      );
      
      return {
        ...zone,
        devices: zoneDevices,
        armedCount: zoneDevices.filter(d => d.armedState !== 'DISARMED').length,
        totalCount: zoneDevices.length
      };
    });
  };

  // Load device counts for each alarm zone
  const loadZoneDeviceCounts = async () => {
    console.log('🔒 Loading device counts for alarm zones...');
    
    const zoneUpdates = await Promise.all(
      alarmZones.map(async (zone) => {
        try {
          const response = await getAlarmZoneDevices(zone.id);
          if (!response.error) {
            console.log(`🔒 Zone "${zone.name}" has ${response.data.length} devices`);
            return {
              ...zone,
              deviceIds: response.data.map(device => device.id),
              devices: response.data
            };
          } else {
            console.error(`❌ Failed to load devices for zone "${zone.name}":`, response.error);
            return zone;
          }
        } catch (error) {
          console.error(`💥 Exception loading devices for zone "${zone.name}":`, error);
          return zone;
        }
      })
    );

    setAlarmZones(zoneUpdates);
    console.log('🔒 Finished loading device counts for all zones');
  };

  // Handle zone toggle using proper alarm zone API
  const handleZoneToggle = async (zone: AlarmZone) => {
    const newState = zone.armedState === 'DISARMED' ? 'ARMED_AWAY' : 'DISARMED';
    
    setIsProcessing(true);
    try {
      console.log(`🔒 Toggling zone "${zone.name}" from ${zone.armedState} to ${newState}`);
      
      const result = await setAlarmZoneArmedState(zone.id, newState);
      
      if (result.data.success) {
        // Update local alarm zone state
        setAlarmZones(prev => prev.map(z => 
          z.id === zone.id ? { ...z, armedState: newState } : z
        ));
        
        console.log(`🔒 Successfully toggled zone "${zone.name}" to ${newState}`);
        
        analytics.track({
          action: 'zone_toggle',
          category: 'security',
          properties: {
            zoneId: zone.id,
            zoneName: zone.name,
            previousState: zone.armedState,
            newState: newState
          }
        });
      } else {
        setError(`Failed to ${newState.toLowerCase()} ${zone.name}`);
      }
    } catch (error) {
      logger.error('Zone toggle error:', error);
      setError(`Failed to ${newState.toLowerCase()} ${zone.name}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // Core state
    apiKey,
    setApiKey,
    error,
    setError,
    loading,
    organization,
    locations,
    selectedLocation,
    setSelectedLocation,
    spaces,
    devices,
    cameras,
    pin,
    setPin,
    isAuthenticated,
    authenticatedUser,
    isProcessing,
    pressedButton,
    setPressedButton,
    
    // Legacy state (will be removed after migration)
    areas,
    
    // UI state
    showSettings,
    setShowSettings,
    showLocationSelect,
    setShowLocationSelect,
    showEvents,
    setShowEvents,
    showAutomation,
    setShowAutomation,
    showZonesPreview,
    setShowZonesPreview,
    showSeconds,
    setShowSeconds,
    highlightPinButtons,
    setHighlightPinButtons,
    showLiveEvents,
    setShowLiveEvents,
    showWarningConfirm,
    setShowWarningConfirm,
    showWarningDetails,
    setShowWarningDetails,
    useDesign2,
    setUseDesign2,
    useTestDesign,
    setUseTestDesign,
    useTestDesign2,
    setUseTestDesign2,
    
    // Event filtering
    eventFilterSettings,
    updateEventFilterSettings,
    
    // Alarm zones
    alarmZones,
    setAlarmZones,
    getZonesWithDevices,
    loadZoneDeviceCounts,
    handleZoneToggle,
    
    // System health
    systemStatus,
    deviceConnectivity,
    lastHeartbeat,
    offlineDevices,
    
    // Service Worker
    isCheckingForUpdate,
    lastUpdateCheck,
    
    // Functions
    setLoading,
    loadOrganizationAndLocations,
    loadLocations,
    loadSpaces,
    updateDeviceState,
    handleLocationSelect,
    handleSpaceToggle,
    handleToggleAll,
    getZonesWithAreas: getZonesWithDevices, // Legacy alias
    
    // SSE
    sseCtx
  };
} 