'use client';

import { useState, useEffect } from 'react';
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

export default function AlarmKeypad() {
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
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [currentTime, setCurrentTime] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showLocationSelect, setShowLocationSelect] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showZonesPreview, setShowZonesPreview] = useState(true);
  const [showSeconds, setShowSeconds] = useState(false);
  const [highlightPinButtons, setHighlightPinButtons] = useState(true);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [useDesign2, setUseDesign2] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceWarnings, setDeviceWarnings] = useState<string[]>([]);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);
  const [pendingAreaToggle, setPendingAreaToggle] = useState<{ area: Area, newState: Area['armedState'] } | null>(null);
  const [pendingToggleAll, setPendingToggleAll] = useState<Area['armedState'] | null>(null);
  const [areaWarnings, setAreaWarnings] = useState<Record<string, string[]>>({});
  const [showWarningDetails, setShowWarningDetails] = useState<string | null>(null);

  const [weather, setWeather] = useState<{ temp: number; condition: string; icon: string } | null>(null);
  const [weatherApiKey, setWeatherApiKey] = useState('');
  const [weatherApiKeyInput, setWeatherApiKeyInput] = useState('');
  const [weatherSaveStatus, setWeatherSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');



  const loadOrganizationAndLocations = async (savedLocation: string | null) => {
    try {
      // First, get API key details to get organization info
      const apiKeyDetails = await getApiKeyDetails();
      
      if (apiKeyDetails.error) {
        logger.error('Error fetching API key details:', apiKeyDetails.error);
        setError(`API Error: ${apiKeyDetails.error}`);
      } else if (apiKeyDetails.data) {
        if (apiKeyDetails.data.organizationInfo) {
          setOrganization(apiKeyDetails.data.organizationInfo);
          localStorage.setItem('fusion_organization', JSON.stringify(apiKeyDetails.data.organizationInfo));
        }
      }
    } catch (error) {
      logger.error('Exception in getApiKeyDetails:', error);
      setError(`Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Then load locations
    if (savedLocation) {
      try {
        const location = JSON.parse(savedLocation);
        setSelectedLocation(location);
        
        // Load areas first, then load events with area data
        await loadAreas(location);
        
        // Load devices
        await loadDevices();
        
        // Try to fetch weather if we have API key
        const weatherKey = localStorage.getItem('weather_api_key');
        if (location.addressPostalCode && weatherKey) {
          setWeatherApiKey(weatherKey);
          await fetchWeatherData(location.addressPostalCode);
        }
      } catch (e) {
        logger.error('Error parsing saved location:', e);
        setError('Failed to load saved location');
        loadLocations();
      }
    } else {
      loadLocations();
    }
  };

  // Initialize on mount
  useEffect(() => {
    // Track page view
    analytics.trackPageView('main-keypad');
    
    // Load existing API key or use default
    const existingApiKey = localStorage.getItem('fusion_api_key');
    if (existingApiKey) {
      setApiKey(existingApiKey);
    } else if (DEFAULT_API_KEY) {
      // Only set default if no existing key and we have a default
      localStorage.setItem('fusion_api_key', DEFAULT_API_KEY);
      setApiKey(DEFAULT_API_KEY);
    }
    
    const savedLocation = localStorage.getItem('selected_location');
    const savedTheme = localStorage.getItem('fusion_theme') as 'light' | 'dark' | 'system' | null;
    const savedShowZones = localStorage.getItem('show_zones_preview');

    const savedShowSeconds = localStorage.getItem('show_seconds');
    const savedHighlightPinButtons = localStorage.getItem('highlight_pin_buttons');
    const savedUseDesign2 = localStorage.getItem('use_design_2');
    const savedOrganization = localStorage.getItem('fusion_organization');
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
    
    // Load weather API key
    const savedWeatherKey = localStorage.getItem('weather_api_key') || DEFAULT_WEATHER_API_KEY;
    if (savedWeatherKey) {
      setWeatherApiKey(savedWeatherKey);
      setWeatherApiKeyInput(savedWeatherKey);
      // Save the default key if it wasn't already saved
      if (!localStorage.getItem('weather_api_key') && DEFAULT_WEATHER_API_KEY) {
        localStorage.setItem('weather_api_key', DEFAULT_WEATHER_API_KEY);
      }
    }
    
    if (savedShowZones !== null) {
      setShowZonesPreview(savedShowZones === 'true');
    }
    

    
    if (savedShowSeconds !== null) {
      setShowSeconds(savedShowSeconds === 'true');
    }
    
    if (savedHighlightPinButtons !== null) {
      setHighlightPinButtons(savedHighlightPinButtons === 'true');
    }
    
    if (savedUseDesign2 !== null) {
      setUseDesign2(savedUseDesign2 === 'true');
    }
    
    if (savedOrganization) {
      try {
        setOrganization(JSON.parse(savedOrganization));
      } catch (e) {
        logger.error('Failed to parse saved organization:', e);
      }
    }
    
    // Load organization info and locations
    loadOrganizationAndLocations(savedLocation);
  }, []);

  // Handle theme changes
  useEffect(() => {
    const updateEffectiveTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setEffectiveTheme(theme);
      }
    };

    updateEffectiveTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => updateEffectiveTheme();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [effectiveTheme]);

  // Detect mobile screen size
  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    return () => window.removeEventListener('resize', updateMobileState);
  }, []);

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: selectedLocation?.timeZone
      };
      if (showSeconds) {
        timeOptions.second = '2-digit';
      }
      const dateOptions: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: selectedLocation?.timeZone
      };
      setCurrentTime(now.toLocaleTimeString('en-US', timeOptions));
      setCurrentDate(now.toLocaleDateString('en-US', dateOptions));
    };
    
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [showSeconds, selectedLocation?.timeZone]);

  // Auto-refresh areas and devices with smart polling
  useEffect(() => {
    if (!showSettings && !showLocationSelect && selectedLocation) {
      // Initial load for PIN screen preview
      const initialLoad = async () => {
        // Only load if we have a valid location
        if (selectedLocation && selectedLocation.id) {
          await loadAreas(selectedLocation); // Load areas for zone status preview
          await loadDevices();
        }
      };
      
      initialLoad();
      
      // Set up smart polling with exponential backoff
      const poller = new SmartPoller(5000, 30000); // Start at 5s, max 30s
      
      poller.start(async () => {
        if (selectedLocation && selectedLocation.id) {
          // Use batch operation for efficiency
          const dashboardData = await optimizedGetDashboardData(selectedLocation.id);
          
          if (!dashboardData.areas.error) {
            setAreas(dashboardData.areas.data || []);
          }
          if (!dashboardData.devices.error) {
            setDevices(dashboardData.devices.data || []);
          }
          
          return dashboardData;
        }
      });
      
      return () => poller.stop();
    }
  }, [showSettings, showLocationSelect, selectedLocation, isAuthenticated]);

  // Check area warnings when devices or areas change
  useEffect(() => {
    if (isAuthenticated && areas.length > 0 && devices.length > 0) {
      const warningsByArea: Record<string, string[]> = {};
      
      // Check warnings for each area - both open doors and unlocked locks
      areas.forEach(area => {
        if (area.armedState !== 'DISARMED') {
          const areaDevices = devices.filter(device => device.areaId === area.id);
          const warnings: string[] = [];
          
          areaDevices.forEach(device => {
            const type = device.type.toLowerCase();
            const deviceType = device.deviceTypeInfo?.type?.toLowerCase() || '';
            const status = device.status?.toLowerCase() || '';
            const displayState = device.displayState?.toLowerCase() || '';
            
            const isLock = (
              type.includes('lock') || 
              deviceType === 'lock'
            );
            
            const isDoorSensor = (
              type.includes('door') ||
              type.includes('contact') ||
              type.includes('entry') ||
              deviceType === 'door' ||
              deviceType === 'contact' ||
              deviceType === 'entry'
            );
            
            // Check for unlocked doors
            if (isLock && (status === 'unlocked' || displayState === 'unlocked')) {
              warnings.push(`🔓 ${device.name} is UNLOCKED`);
            }
            
            // Check for open doors/contacts
            if (isDoorSensor && (status === 'open' || displayState === 'open' || displayState === 'opened')) {
              warnings.push(`🚪 ${device.name} is OPEN`);
            }
          });
          
          if (warnings.length > 0) {
            warningsByArea[area.id] = warnings;
          }
        }
      });
      
      setAreaWarnings(warningsByArea);
    }
  }, [areas, devices, isAuthenticated]);

  // Auto-authenticate when PIN is 6 digits
  useEffect(() => {
    if (pin.length === 6 && !isAuthenticated) {
      handleAuthenticate();
    }
  }, [pin]);



  // Keyboard support for PIN entry
  useEffect(() => {
    if (!isAuthenticated && !showSettings && !showLocationSelect && !showEvents && !showAutomation) {
      const handleKeyPress = (e: KeyboardEvent) => {
        // Prevent keyboard entry while processing
        if (isProcessing) return;
        
        // Handle number keys 0-9
        if (e.key >= '0' && e.key <= '9' && pin.length < 6) {
          handlePinKeyPress(e.key);
        }
        // Handle backspace
        else if (e.key === 'Backspace') {
          e.preventDefault();
          setPin(pin.slice(0, -1));
          
          // Show highlight if setting is enabled
          if (highlightPinButtons) {
            setPressedButton('backspace');
            setTimeout(() => setPressedButton(null), 150);
          }
        }
        // Handle escape or delete to clear
        else if (e.key === 'Escape' || e.key === 'Delete') {
          setPin('');
          
          // Show highlight if setting is enabled
          if (highlightPinButtons) {
            setPressedButton('clear');
            setTimeout(() => setPressedButton(null), 150);
          }
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isAuthenticated, showSettings, showLocationSelect, showEvents, showAutomation, pin, isProcessing]);

  // Clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Logout after 5 minutes of inactivity
  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        handleLogout();
      }, 5 * 60 * 1000); // 5 minutes
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, areas]); // Reset timer when areas change

  // Fetch weather when location or API key changes
  useEffect(() => {
    if (selectedLocation?.addressPostalCode && weatherApiKey) {
      fetchWeatherData(selectedLocation.addressPostalCode);
      
      // Refresh weather every 5 minutes
      const interval = setInterval(() => {
        if (selectedLocation.addressPostalCode) {
          fetchWeatherData(selectedLocation.addressPostalCode);
        }
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [selectedLocation, weatherApiKey]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await optimizedGetLocations();
      if (response.error) {
        setError('Failed to fetch locations.');
        return;
      }
      const locationData = response.data || [];
      setLocations(locationData);
      setShowLocationSelect(true);
    } catch (err) {
      setError('An error occurred while fetching locations.');
    } finally {
      setLoading(false);
    }
  };

  const loadAreas = async (location: any) => {
    // Only set loading if we don't have any areas yet
    if (areas.length === 0) {
      setLoading(true);
    }
    setError('');
    try {
      const response = await optimizedGetAreas(location.id);
      if (response.error) {
        setError('Failed to fetch areas.');
        return [];
      }
      const areasData = response.data || [];
      setAreas(areasData);
      return areasData;
    } catch (err) {
      setError('An error occurred while fetching areas.');
      return [];
    } finally {
      setLoading(false);
    }
  };



  const loadDevices = async () => {
    try {
      const response = await optimizedGetDevices();
      if (!response.error) {
        setDevices(response.data || []);
      }
    } catch (err) {
      logger.error('Failed to load devices:', err);
    }
  };

  const handleLocationSelect = async (location: any) => {
    // Store the full location object as-is
    const locationToStore = { ...location };
    
    setSelectedLocation(locationToStore);
    localStorage.setItem('selected_location', JSON.stringify(locationToStore));
    
    // Clear all caches when changing location
    clearCache();
    
    setShowLocationSelect(false);
    await loadAreas(locationToStore);
    await loadDevices();
    
    // Try to fetch weather if we have an API key
    if (locationToStore.addressPostalCode && weatherApiKey) {
      fetchWeatherData(locationToStore.addressPostalCode);
    }
  };

  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
      
      // Show highlight if setting is enabled
      if (highlightPinButtons) {
        setPressedButton(digit);
        // Clear highlight after brief moment to simulate button press
        setTimeout(() => setPressedButton(null), 150);
      }
    }
  };

  const handleAuthenticate = async () => {
    setIsProcessing(true);
    setError('');

    const startTime = performance.now();

    try {
      const response = await validatePin(pin);
      const duration = performance.now() - startTime;
      
      if (response.error || !response.data.valid) {
        analytics.trackAuthentication(false, 'pin');
        performanceMonitor.trackAPICall({
          endpoint: '/api/alarm/keypad/validate-pin',
          method: 'POST',
          duration,
          status: response.error ? 400 : 401,
          success: false,
        });
        
        logger.security('Failed PIN attempt', { pinLength: pin.length });
        setError('Invalid PIN');
        setPin('');
        setIsProcessing(false);
        return;
      }

      // Authentication successful
      analytics.trackAuthentication(true, 'pin');
      analytics.setUserProperties({
        userId: response.data.userId,
        organizationId: organization?.id,
        locationId: selectedLocation?.id,
      });
      
      performanceMonitor.trackAPICall({
        endpoint: '/api/alarm/keypad/validate-pin',
        method: 'POST',
        duration,
        status: 200,
        success: true,
      });

      setAuthenticatedUser(response.data.userName || 'User');
      setIsAuthenticated(true);
      setPin('');
      
      // Refresh areas to get latest status
      if (selectedLocation) {
        await loadAreas(selectedLocation);
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      analytics.trackError(err as Error, 'authentication');
      performanceMonitor.trackAPICall({
        endpoint: '/api/alarm/keypad/validate-pin',
        method: 'POST',
        duration,
        status: 500,
        success: false,
      });
      
      logger.error('Authentication error:', err);
      setError('Failed to authenticate');
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthenticatedUser('');
    setPin('');
    setDeviceWarnings([]);
    setAreaWarnings({});
    setShowWarningDetails(null);
    setWeather(null);
    // Don't clear events on logout - they're still visible on PIN screen
  };

  const checkDeviceStatus = (areasToCheck: Area | Area[]) => {
    const warnings: string[] = [];
    const areasArray = Array.isArray(areasToCheck) ? areasToCheck : [areasToCheck];
    const areaIds = areasArray.map(area => area.id);
    
    // Filter devices to only those in the areas being armed
    const relevantDevices = devices.filter(device => 
      device.areaId && areaIds.includes(device.areaId)
    );
    
    // Process each device - check for both open doors and unlocked locks
    relevantDevices.forEach(device => {
      const area = areasArray.find(a => a.id === device.areaId);
      const areaName = area?.name || 'Unknown Area';
      const type = device.type.toLowerCase();
      const deviceType = device.deviceTypeInfo?.type?.toLowerCase() || '';
      const status = device.status?.toLowerCase() || '';
      const displayState = device.displayState?.toLowerCase() || '';
      
      // Check if device is a lock
      const isLock = (
        type.includes('lock') || 
        deviceType === 'lock'
      );
      
      // Check if device is a door/contact sensor
      const isDoorSensor = (
        type.includes('door') ||
        type.includes('contact') ||
        type.includes('entry') ||
        deviceType === 'door' ||
        deviceType === 'contact' ||
        deviceType === 'entry'
      );
      
      // Check for unlocked doors
      if (isLock && (status === 'unlocked' || displayState === 'unlocked')) {
        warnings.push(`🔓 ${device.name} in ${areaName} is UNLOCKED`);
      }
      
      // Check for open doors/contacts
      if (isDoorSensor && (status === 'open' || displayState === 'open' || displayState === 'opened')) {
        warnings.push(`🚪 ${device.name} in ${areaName} is OPEN`);
      }
    });
    
    return warnings;
  };

  const handleAreaToggle = async (area: Area, skipConfirmation = false) => {
    const newState = area.armedState === 'DISARMED' ? 'ARMED_AWAY' : 'DISARMED';
    
    // Track area action
    analytics.trackAreaAction(newState === 'DISARMED' ? 'disarm' : 'arm', area.id, newState);
    
    // Check device status only when arming
    if (newState === 'ARMED_AWAY' && !skipConfirmation) {
      const warnings = checkDeviceStatus(area);
      if (warnings.length > 0) {
        setDeviceWarnings(warnings);
        setPendingAreaToggle({ area, newState });
        setShowWarningConfirm(true);
        return; // Stop here and wait for confirmation
      }
    }
    
    setIsProcessing(true);
    const startTime = performance.now();
    
    try {
      const response = await updateAreaState(area.id, newState);
      const duration = performance.now() - startTime;
      
      if (response.error) {
        performanceMonitor.trackAPICall({
          endpoint: `/api/areas/${area.id}`,
          method: 'PUT',
          duration,
          status: 400,
          success: false,
        });
        
        logger.error('API error:', response.error);
        setError(`Failed to update ${area.name}`);
        return;
      }
      
      performanceMonitor.trackAPICall({
        endpoint: `/api/areas/${area.id}`,
        method: 'PUT',
        duration,
        status: 200,
        success: true,
      });
      
      if (selectedLocation) {
        // Clear caches to force fresh data after state change
        clearCache(`areas-${selectedLocation.id}`);
        clearCache('devices');
        clearCache(`events-${selectedLocation.id}`);
        
        // Refresh both areas and devices to get latest status
        const [updatedAreas] = await Promise.all([
          loadAreas(selectedLocation),
          loadDevices()
        ]);
      }
    } catch (err) {
      const duration = performance.now() - startTime;
      performanceMonitor.trackAPICall({
        endpoint: `/api/areas/${area.id}`,
        method: 'PUT',
        duration,
        status: 500,
        success: false,
      });
      
      analytics.trackError(err as Error, 'area-toggle');
      logger.error('Exception in handleAreaToggle:', err);
      setError('Failed to update area');
    } finally {
      setIsProcessing(false);
      setShowWarningConfirm(false);
      setPendingAreaToggle(null);
    }
  };

  const handleToggleAll = async (skipConfirmation = false) => {
    if (areas.length === 0) return;
    
    // If any area is disarmed, arm all. Otherwise disarm all.
    const hasDisarmed = areas.some(area => area.armedState === 'DISARMED');
    const newState = hasDisarmed ? 'ARMED_AWAY' : 'DISARMED';
    
    // Check device status only when arming
    if (newState === 'ARMED_AWAY' && !skipConfirmation) {
      const warnings = checkDeviceStatus(areas);
      if (warnings.length > 0) {
        setDeviceWarnings(warnings);
        setPendingToggleAll(newState);
        setShowWarningConfirm(true);
        return; // Stop here and wait for confirmation
      }
    }
    
    setIsProcessing(true);
    try {
      for (const area of areas) {
        await updateAreaState(area.id, newState);
      }
      if (selectedLocation) {
        // Clear caches to force fresh data after state changes
        clearCache(`areas-${selectedLocation.id}`);
        clearCache('devices');
        clearCache(`events-${selectedLocation.id}`);
        
        // Refresh both areas and devices to get latest status
        const [updatedAreas] = await Promise.all([
          loadAreas(selectedLocation),
          loadDevices()
        ]);
      }
    } catch (err) {
      setError('Failed to update areas');
    } finally {
      setIsProcessing(false);
      setShowWarningConfirm(false);
      setPendingToggleAll(null);
    }
  };

  const handleApiKeyUpdate = async (newKey: string) => {
    localStorage.setItem('fusion_api_key', newKey);
    setApiKey(newKey);
    
    // Validate the new key and get organization info
    const apiKeyDetails = await getApiKeyDetails();
    if (!apiKeyDetails.error && apiKeyDetails.data) {
      if (apiKeyDetails.data.organizationInfo) {
        setOrganization(apiKeyDetails.data.organizationInfo);
        localStorage.setItem('fusion_organization', JSON.stringify(apiKeyDetails.data.organizationInfo));
      } else {
        // Clear organization if none found
        setOrganization(null);
        localStorage.removeItem('fusion_organization');
      }
    }
    
    // Reload to ensure everything is fresh
    window.location.reload();
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };



  const fetchWeatherData = async (postalCode: string) => {
    if (!weatherApiKey) {
      return;
    }
    
    const startTime = performance.now();
    
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?zip=${postalCode},US&appid=${weatherApiKey}&units=imperial`;
      
      const response = await fetch(url);
      const duration = performance.now() - startTime;
      
      if (!response.ok) {
        performanceMonitor.trackAPICall({
          endpoint: 'openweathermap-api',
          method: 'GET',
          duration,
          status: response.status,
          success: false,
        });
        
        analytics.trackWeatherUpdate(postalCode, false);
        logger.error('Weather API error:', `${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      
      performanceMonitor.trackAPICall({
        endpoint: 'openweathermap-api',
        method: 'GET',
        duration,
        status: 200,
        success: true,
      });
      
      analytics.trackWeatherUpdate(postalCode, true);
      
      setWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        icon: data.weather[0].icon
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.trackAPICall({
        endpoint: 'openweathermap-api',
        method: 'GET',
        duration,
        status: 0,
        success: false,
      });
      
      analytics.trackWeatherUpdate(postalCode, false);
      analytics.trackError(error as Error, 'weather-fetch');
      logger.error('Failed to fetch weather:', error);
    }
  };

  const allArmed = areas.length > 0 && areas.every(area => area.armedState !== 'DISARMED');
  const allDisarmed = areas.length > 0 && areas.every(area => area.armedState === 'DISARMED');
  const someArmed = areas.some(area => area.armedState !== 'DISARMED');

  // Location Selection Screen
  if (showLocationSelect) {
    return (
      <main className="min-h-screen bg-gray-100 dark:bg-[#0f0f0f] flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          <h2 className="text-4xl font-bold text-center text-gray-900 dark:text-white mb-8">Select Location</h2>
          
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500 rounded-lg text-rose-600 dark:text-rose-400 text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {locations.map((location) => {
              return (
                <button
                  key={location.id}
                  onClick={() => handleLocationSelect(location)}
                  className="w-full flex items-center justify-between p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700 text-gray-900 dark:text-gray-200 text-xl transition-all"
                >
                  <div className="text-left">
                    <span className="block">{location.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {location.addressPostalCode ? `Postal: ${location.addressPostalCode}` : 'No postal code'}
                    </span>
                  </div>
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // Settings Modal
  if (showSettings) {
    // Re-check location from localStorage in case state is stale
    const storedLocation = localStorage.getItem('selected_location');
    if (storedLocation && !selectedLocation?.addressPostalCode) {
      try {
        const parsedLocation = JSON.parse(storedLocation);
        if (parsedLocation.addressPostalCode && parsedLocation.id === selectedLocation?.id) {
          setSelectedLocation(parsedLocation);
        }
      } catch (e) {
        logger.error('Error parsing stored location:', e);
      }
    }
    
    return (
      <main className="fixed inset-0 bg-gray-100 dark:bg-[#0f0f0f] overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Fixed Header */}
          <div className="flex-shrink-0 bg-gray-100 dark:bg-[#0f0f0f] px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 bg-white dark:bg-[#1a1a1a] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* System API Settings - Grouped Together */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System API Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Fusion API Key */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Fusion API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-800 rounded-md text-gray-900 dark:text-white text-sm focus:border-gray-400 dark:focus:border-gray-700 focus:outline-none transition-all"
                      />
                      <button
                        onClick={() => handleApiKeyUpdate(apiKey)}
                        className="mt-2 px-4 py-2 bg-[#22c55f]/10 text-[#22c55f] border border-[#22c55f] rounded-md text-sm hover:bg-[#22c55f]/20 transition-all font-medium w-full"
                      >
                        Save
                      </button>
                    </div>
                    
                    {/* Weather API Key */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                        Weather API Key
                      </label>
                      <input
                        type="password"
                        value={weatherApiKeyInput}
                        onChange={(e) => {
                          setWeatherApiKeyInput(e.target.value);
                          // Reset save status when user types
                          if (weatherSaveStatus !== 'idle') {
                            setWeatherSaveStatus('idle');
                          }
                        }}
                        placeholder="Enter your OpenWeatherMap API key"
                        className="w-full px-3 py-2 bg-gray-100 dark:bg-[#0f0f0f] border border-gray-300 dark:border-gray-800 rounded-md text-gray-900 dark:text-white text-sm focus:border-gray-400 dark:focus:border-gray-700 focus:outline-none transition-all"
                      />
                      <button
                        onClick={async () => {
                          setWeatherSaveStatus('saving');
                          
                          // Save the key
                          localStorage.setItem('weather_api_key', weatherApiKeyInput);
                          setWeatherApiKey(weatherApiKeyInput);
                          
                          // Immediately fetch weather using the input value (not state which might not be updated yet)
                          if (selectedLocation?.addressPostalCode && weatherApiKeyInput) {
                            // Create a temporary fetch function that uses the input value directly
                            try {
                              const url = `https://api.openweathermap.org/data/2.5/weather?zip=${selectedLocation.addressPostalCode},US&appid=${weatherApiKeyInput}&units=imperial`;
                              
                              const response = await fetch(url);
                              
                              if (!response.ok) {
                                if (response.status === 401) {
                                  alert('Invalid API key. Please check your OpenWeatherMap API key.');
                                } else if (response.status === 404) {
                                  alert(`Could not find weather for postal code: ${selectedLocation.addressPostalCode}`);
                                }
                                logger.error('Weather API error:', `${response.status} ${response.statusText}`);
                                setWeatherSaveStatus('error');
                                setTimeout(() => setWeatherSaveStatus('idle'), 3000);
                                return;
                              }
                              
                              const data = await response.json();
                              setWeather({
                                temp: Math.round(data.main.temp),
                                condition: data.weather[0].main,
                                icon: data.weather[0].icon
                              });
                              setWeatherSaveStatus('success');
                              setTimeout(() => setWeatherSaveStatus('idle'), 3000);
                            } catch (error) {
                              logger.error('Failed to fetch weather:', error);
                              setWeatherSaveStatus('error');
                              setTimeout(() => setWeatherSaveStatus('idle'), 3000);
                              alert('Failed to fetch weather. Please check your API key and try again.');
                            }
                          } else {
                            if (!selectedLocation?.addressPostalCode) {
                              alert('No postal code available for the current location. Please select a location with a postal code.');
                              setWeatherSaveStatus('error');
                              setTimeout(() => setWeatherSaveStatus('idle'), 3000);
                            } else if (!weatherApiKeyInput) {
                              localStorage.removeItem('weather_api_key');
                              setWeatherApiKey('');
                              setWeather(null); // Clear weather if no API key
                              setWeatherSaveStatus('success');
                              setTimeout(() => setWeatherSaveStatus('idle'), 3000);
                            }
                          }
                        }}
                        className={`mt-2 px-4 py-2 border rounded-md text-sm transition-all font-medium w-full ${
                          weatherSaveStatus === 'saving' 
                            ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' 
                            : weatherSaveStatus === 'success'
                            ? 'bg-[#22c55f]/20 text-[#22c55f] border-[#22c55f]'
                            : weatherSaveStatus === 'error'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500'
                            : 'bg-[#22c55f]/10 text-[#22c55f] border-[#22c55f] hover:bg-[#22c55f]/20'
                        }`}
                        disabled={weatherSaveStatus === 'saving'}
                      >
                        {weatherSaveStatus === 'saving' ? 'Saving...' : 
                         weatherSaveStatus === 'success' ? 'Saved!' :
                         weatherSaveStatus === 'error' ? 'Error' : 'Save'}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Weather updates every 10 minutes • Uses location postal code
                      </p>
                      <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                        💡 Tip: Set NEXT_PUBLIC_WEATHER_API_KEY in environment for automatic persistence
                      </p>
                      {weather && (
                        <p className="text-xs text-[#22c55f] mt-1">
                          ✓ Weather connected: {weather.temp}°F {weather.condition}
                        </p>
                      )}
                      {weatherSaveStatus === 'error' && !weather && (
                        <p className="text-xs text-rose-500 mt-1">
                          ✗ Failed to connect - check API key
                        </p>
                      )}
                      {!selectedLocation?.addressPostalCode && weatherApiKeyInput && (
                        <p className="text-xs text-amber-500 mt-1">
                          ⚠ Location has no postal code
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Organization Section */}
                {organization && (
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Organization</h3>
                    <div className="space-y-1">
                      <p className="text-base text-gray-900 dark:text-white font-medium">{organization.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">ID: {organization.id}</p>
                      {organization.slug && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">Slug: {organization.slug}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Section */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Current Location</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedLocation?.name || 'No location selected'}</p>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-2 space-y-1">
                    {selectedLocation?.addressPostalCode && (
                      <p>Postal Code: {selectedLocation.addressPostalCode}</p>
                    )}
                    {weather && (
                      <p>Weather: {weather.temp}°F</p>
                    )}
                    <p>
                      Timezone: {selectedLocation?.timeZone ? (
                        <span className="text-[#22c55f]">{selectedLocation.timeZone}</span>
                      ) : (
                        <span className="text-amber-500">Not specified</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowLocationSelect(true);
                      loadLocations();
                    }}
                    className="px-4 py-2 bg-[#22c55f]/10 text-[#22c55f] border border-[#22c55f] rounded-md text-sm hover:bg-[#22c55f]/20 transition-all font-medium"
                  >
                    Change Location
                  </button>
                </div>

                {/* Display Options */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Display Options</h3>
                  <div className="space-y-3">
                    {/* Show Zone Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">Show Zone Status on PIN Screen</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Display current zone status while entering PIN</p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !showZonesPreview;
                          setShowZonesPreview(newValue);
                          localStorage.setItem('show_zones_preview', newValue.toString());
                        }}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                          showZonesPreview ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            showZonesPreview ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>



                    {/* Show Seconds */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">Show Seconds on Clock</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Display seconds in the time display</p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !showSeconds;
                          setShowSeconds(newValue);
                          localStorage.setItem('show_seconds', newValue.toString());
                        }}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                          showSeconds ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            showSeconds ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Highlight PIN Buttons */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">Highlight PIN Buttons on Press</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Show green highlight when pressing PIN buttons</p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !highlightPinButtons;
                          setHighlightPinButtons(newValue);
                          localStorage.setItem('highlight_pin_buttons', newValue.toString());
                        }}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                          highlightPinButtons ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            highlightPinButtons ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Design 2.0 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">Use Design 2.0</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Modern compact design with PIN circles and zone timestamps</p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !useDesign2;
                          setUseDesign2(newValue);
                          localStorage.setItem('use_design_2', newValue.toString());
                        }}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                          useDesign2 ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            useDesign2 ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                                 {/* Theme Section */}
                 <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Appearance</h3>
                   <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setTheme('light');
                        localStorage.setItem('fusion_theme', 'light');
                      }}
                      className={`p-3 rounded-md border transition-all ${
                        theme === 'light' 
                          ? 'bg-[#22c55f]/10 border-[#22c55f] text-[#22c55f]' 
                          : 'bg-gray-100 dark:bg-[#0f0f0f] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-xs">Light</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('dark');
                        localStorage.setItem('fusion_theme', 'dark');
                      }}
                      className={`p-3 rounded-md border transition-all ${
                        theme === 'dark' 
                          ? 'bg-[#22c55f]/10 border-[#22c55f] text-[#22c55f]' 
                          : 'bg-gray-100 dark:bg-[#0f0f0f] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <span className="text-xs">Dark</span>
                    </button>
                    <button
                      onClick={() => {
                        setTheme('system');
                        localStorage.setItem('fusion_theme', 'system');
                      }}
                      className={`p-3 rounded-md border transition-all ${
                        theme === 'system' 
                          ? 'bg-[#22c55f]/10 border-[#22c55f] text-[#22c55f]' 
                          : 'bg-gray-100 dark:bg-[#0f0f0f] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                      }`}
                    >
                      <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">System</span>
                    </button>
                  </div>
                                 </div>
               </div>
             </div>
           </div>
         </div>
       </main>
     );
   }

  // Events Screen  
  if (showEvents) {
    return (
      <main className="min-h-screen bg-gray-100 dark:bg-[#0f0f0f] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Event History - {selectedLocation?.name}</h2>
            <button
              onClick={() => setShowEvents(false)}
              className="p-3 bg-white dark:bg-[#1a1a1a] rounded-lg text-gray-600 dark:text-gray-400 text-xl hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Coming Soon Content */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <div className="mb-8">
              <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Event History Coming Soon</h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              View detailed logs of all system activity, including door access, motion detection, and security events.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Automation Screen
  if (showAutomation) {
    return (
      <main className="min-h-screen bg-gray-100 dark:bg-[#0f0f0f] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Automation - {selectedLocation?.name}</h2>
            <button
              onClick={() => setShowAutomation(false)}
              className="p-3 bg-white dark:bg-[#1a1a1a] rounded-lg text-gray-600 dark:text-gray-400 text-xl hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Coming Soon Content */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-12 text-center border border-gray-200 dark:border-gray-800">
            <div className="mb-8">
              <svg className="w-24 h-24 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Automation Coming Soon</h3>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Control your lights, thermostats, and other smart devices directly from your security panel.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Loading State - only show for location selection
  if (loading && !selectedLocation && locations.length === 0) {
    return (
      <main className="min-h-screen bg-gray-100 dark:bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#22c55f] mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300 text-xl">Loading...</p>
        </div>
      </main>
    );
  }

  // Main Alarm Panel
  return (
    <main className="min-h-screen bg-gray-100 dark:bg-[#0f0f0f] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-3 md:px-6 py-3 md:py-4 relative z-10">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <svg viewBox="0 0 375 375" xmlns="http://www.w3.org/2000/svg" className="h-6 md:h-8 w-6 md:w-8 text-[#22c55f]">
              <g fill="currentColor">
                <path d="M35.32 25.422h124.578c7.457 0 13.5 6.043 13.5 13.5v158.894c0 7.457-6.043 13.5-13.5 13.5H35.32c-7.457 0-13.5-6.043-13.5-13.5V38.922c0-7.457 6.043-13.5 13.5-13.5ZM35.32 242.773h124.578a13.503 13.503 0 0 1 13.5 13.5v82.387c0 7.453-6.043 13.5-13.5 13.5H35.32a13.503 13.503 0 0 1-13.5-13.5v-82.387c0-7.453 6.043-13.5 13.5-13.5ZM218.844 25.422h124.574a13.5 13.5 0 0 1 13.5 13.5v82.348c0 7.457-6.043 13.5-13.5 13.5H218.844a13.5 13.5 0 0 1-13.5-13.5V38.922c0-7.457 6.043-13.5 13.5-13.5ZM218.844 163.672h124.574a13.51 13.51 0 0 1 9.547 3.957 13.497 13.497 0 0 1 3.953 9.543v158.926c0 7.457-6.043 13.5-13.5 13.5H218.844a13.5 13.5 0 0 1-13.5-13.5V177.172c0-7.453 6.043-13.5 13.5-13.5Z" />
              </g>
            </svg>
            <div className="hidden md:block">
              <h1 className="text-xl text-gray-900 dark:text-white" style={{ fontFamily: 'CSG, sans-serif', letterSpacing: '0.05em' }}>FUSION</h1>
              {organization && (
                <p className="text-xs text-gray-600 dark:text-gray-400">{organization.name}</p>
              )}
            </div>
            {/* Mobile - Just show location name */}
            <div className="block md:hidden">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedLocation?.name || 'FUSION'}</p>
            </div>
          </div>
          
          {/* Location in center - Hidden on mobile */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 pointer-events-none z-0">
            <div className="flex items-center">
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{selectedLocation?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            {/* System Active Indicator - Simplified on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-[#22c55f] rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-2 h-2 bg-[#22c55f] rounded-full animate-ping"></div>
              </div>
              <span className="text-xs text-[#22c55f] font-medium">SYSTEM ACTIVE</span>
            </div>
            {/* Mobile - Just show indicator */}
            <div className="block md:hidden relative">
              <div className="w-2 h-2 bg-[#22c55f] rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-2 h-2 bg-[#22c55f] rounded-full animate-ping"></div>
            </div>
            
            {isAuthenticated && !isMobile && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">Welcome, {authenticatedUser}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
                >
                  Logout
                </button>
              </div>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 md:p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 md:w-6 h-5 md:h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-20">
        {/* Note: On iPhone (< 768px width), we'll need a completely different layout:
            - Stacked vertical design
            - PIN pad takes full width
            - Smaller elements overall
            - Hide or minimize zone/activity previews
            - Consider bottom navigation pattern
        */}
        {/* Global Error Display - Only show when authenticated */}
        {error && isAuthenticated && !showSettings && !showLocationSelect && !showEvents && !showAutomation && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4">
            <div className="p-4 bg-rose-500/90 rounded-lg text-white text-center backdrop-blur-sm shadow-lg">
              <p className="font-medium">Operation Failed</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}
        
        {!isAuthenticated ? (
          isMobile ? (
            // Mobile/iPhone Layout - Vertical stacked design
            <div className="w-full h-full flex flex-col">
              {/* Mobile Header with Time */}
              <div className="flex-shrink-0 px-4 pt-8 pb-4">
                <div className="text-center">
                  <div className="text-base text-gray-600 dark:text-gray-400">{currentDate}</div>
                  <div className="text-4xl font-light text-gray-900 dark:text-white">{currentTime}</div>
                  {selectedLocation && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {selectedLocation.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Zone Status Summary - Compact view */}
              {showZonesPreview && areas.length > 0 && (
                <div className="flex-shrink-0 px-4 mb-4">
                  <div className={`bg-gray-50 dark:bg-gray-900/50 ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} p-3`}>
                    <div className="flex items-center justify-between">
                      {useDesign2 && weather ? (
                        <div className="flex items-center gap-2">
                          <img 
                            src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
                            alt={weather.condition}
                            className="w-5 h-5"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{weather.temp}°F</span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{weather.condition}</span>
                        </div>
                      ) : !useDesign2 ? (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Zone Status
                        </span>
                      ) : null}
                      <div className="flex items-center gap-2">
                        {areas.filter(a => a.armedState !== 'DISARMED').length > 0 ? (
                          <>
                            <span className="text-xs text-rose-600 dark:text-rose-400">
                              {areas.filter(a => a.armedState !== 'DISARMED').length} Armed
                            </span>
                            <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-[#22c55f]">All Clear</span>
                            <div className="w-2 h-2 bg-[#22c55f] rounded-full"></div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PIN Entry Section - Takes remaining space */}
              <div className="flex-1 flex flex-col justify-center px-4 pb-8">
                <div className="max-w-xs w-full mx-auto">
                  {!useDesign2 && (
                    <h2 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-6">
                      Enter PIN to Access
                    </h2>
                  )}

                  {/* PIN Display - Design 2.0 uses circles, classic uses squares */}
                  <div className="mb-6">
                    {useDesign2 ? (
                      <div className="flex justify-center gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full border-2 transition-all ${
                              pin[i] 
                                ? 'bg-[#22c55f] border-[#22c55f]' 
                                : 'bg-transparent border-gray-400 dark:border-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-6 gap-2">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-10 rounded-lg flex items-center justify-center text-xl font-bold border-2 transition-all ${
                              pin[i] 
                                ? 'bg-[#22c55f] border-[#22c55f] text-white' 
                                : 'bg-gray-100 dark:bg-[#161c25] border-gray-300 dark:border-gray-800'
                            }`}
                          >
                            {pin[i] ? '•' : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-rose-500/90 rounded-lg text-white text-center backdrop-blur-sm shadow-lg">
                      <p className="font-medium text-sm">Authentication Failed</p>
                      <p className="text-xs opacity-90">Please try again</p>
                    </div>
                  )}

                  {/* PIN Pad - Larger buttons for mobile */}
                  <div className={`grid grid-cols-3 ${useDesign2 ? 'gap-1' : 'gap-2'}`}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <button
                        key={num}
                        onClick={() => handlePinKeyPress(num.toString())}
                        onTouchStart={() => highlightPinButtons && setPressedButton(num.toString())}
                        onTouchEnd={() => setPressedButton(null)}
                        disabled={isProcessing}
                        className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-xl'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          highlightPinButtons && pressedButton === num.toString()
                            ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                            : useDesign2 
                              ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                              : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      onClick={() => setPin('')}
                      onTouchStart={() => highlightPinButtons && setPressedButton('clear')}
                      onTouchEnd={() => setPressedButton(null)}
                      disabled={isProcessing}
                      className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-base' : 'text-sm'} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        highlightPinButtons && pressedButton === 'clear'
                          ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                          : useDesign2 
                            ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                            : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => handlePinKeyPress('0')}
                      onTouchStart={() => highlightPinButtons && setPressedButton('0')}
                      onTouchEnd={() => setPressedButton(null)}
                      disabled={isProcessing}
                      className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-xl'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        highlightPinButtons && pressedButton === '0'
                          ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                          : useDesign2 
                            ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                            : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      0
                    </button>
                    <button
                      onClick={() => setPin(pin.slice(0, -1))}
                      onTouchStart={() => highlightPinButtons && setPressedButton('backspace')}
                      onTouchEnd={() => setPressedButton(null)}
                      disabled={isProcessing}
                      className={`${useDesign2 ? 'h-16' : 'h-16'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-xl'} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        highlightPinButtons && pressedButton === 'backspace'
                          ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                          : useDesign2 
                            ? 'bg-[#0f0f0f] active:bg-gray-800 dark:bg-[#0f0f0f] dark:active:bg-gray-900 text-gray-400 dark:text-gray-500'
                            : 'bg-gray-100 active:bg-gray-200 dark:bg-[#161c25] dark:active:bg-[#1f2937] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      ←
                    </button>
                  </div>
                </div>
              </div>



              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Authenticating...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
          // PIN Entry Screen with dynamic scaling for tablets
          <div 
            className={`w-full max-w-7xl mx-auto grid grid-cols-2 ${useDesign2 ? 'gap-4' : 'gap-8'} px-4 items-center`}
            style={{ 
              transform: 'scale(min(1, max(0.75, (100vw - 64px) / 1536)))',
              transformOrigin: 'center center'
            }}
          >
                      {/* Left Side - Date/Time and Zone Status */}
            <div className="flex flex-col justify-between min-h-[500px]">
              {/* Top Content */}
              <div>
                {/* Date and Time Display */}
                <div className="text-center mb-6">
                  <div className="text-xl text-gray-600 dark:text-gray-400 mb-2">{currentDate}</div>
                  <div className="text-7xl font-light text-gray-900 dark:text-white">{currentTime}</div>
                </div>
                
                {/* Zone Status Preview */}
                {showZonesPreview && areas.length > 0 && (
                  <div className="w-full max-w-md mx-auto mb-6">
                    <div className="mb-3 text-center">
                      {useDesign2 && weather ? (
                        <div className="flex items-center justify-center gap-2">
                          <img 
                            src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
                            alt={weather.condition}
                            className="w-6 h-6"
                          />
                          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">{weather.temp}°F</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{weather.condition}</span>
                        </div>
                      ) : !useDesign2 ? (
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Zone Status</h3>
                      ) : null}
                    </div>
                    <div className="space-y-2" style={{ maxHeight: areas.length <= 3 ? 'auto' : '180px', overflowY: areas.length > 3 ? 'auto' : 'visible' }}>
                      {areas.map((area) => (
                        <div
                          key={area.id}
                          className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 ${useDesign2 ? 'rounded-xl' : 'rounded-lg'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`${area.armedState !== 'DISARMED' ? 'text-rose-500' : 'text-[#22c55f]'}`}>
                              {area.armedState !== 'DISARMED' ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                            <span className="text-sm text-gray-700 dark:text-gray-300">{area.name}</span>
                              {useDesign2 && (
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {area.armedState === 'DISARMED' ? 'Disarmed' : 'Armed'} • {formatRelativeTime(Date.now() - 5 * 60 * 1000)}
                                </p>
                              )}
                          </div>
                          </div>
                          {!useDesign2 && (
                          <span className={`text-xs font-medium ${
                            area.armedState !== 'DISARMED' ? 'text-rose-600 dark:text-rose-400' : 'text-[#22c55f]'
                          }`}>
                            {area.armedState === 'DISARMED' ? 'Disarmed' : 'Armed'}
                          </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>


            </div>

            {/* Right Side - PIN Entry */}
            <div className="flex items-center">
              <div className={`bg-white dark:bg-[#0f0f0f] rounded-xl ${useDesign2 ? 'pt-4 px-4 pb-0' : 'p-10'} ${useDesign2 ? 'border-transparent' : 'border border-gray-200 dark:border-gray-800'} relative w-full flex flex-col justify-center min-h-[500px]`}>
                {/* Authentication overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22c55f] mx-auto mb-4"></div>
                      <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Authenticating...</p>
                    </div>
                  </div>
                )}

                                <div>
                  {!useDesign2 && (
                    <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-10">
                      Enter PIN to Access
                    </h2>
                  )}
                
                  {/* PIN Display */}
                  {useDesign2 ? (
                    <div className="mb-8">
                      <div className="flex justify-center gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full border-2 transition-all ${
                              pin[i] 
                                ? 'bg-[#22c55f] border-[#22c55f]' 
                                : 'bg-transparent border-gray-400 dark:border-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-10">
                      <div className="grid grid-cols-6 gap-3">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-14 rounded-lg flex items-center justify-center text-2xl font-bold border-2 transition-all ${
                              pin[i] 
                                ? 'bg-[#22c55f] border-[#22c55f] text-white' 
                                : 'bg-gray-100 dark:bg-[#161c25] border-gray-300 dark:border-gray-700'
                            }`}
                          >
                            {pin[i] ? '•' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

                {/* Error Message - Centered on PIN pad */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="p-4 bg-rose-500/90 rounded-lg text-white text-center backdrop-blur-sm shadow-lg">
                      <p className="font-medium">Authentication Failed</p>
                      <p className="text-sm opacity-90">Please try again</p>
                    </div>
                  </div>
                )}

                {/* PIN Pad */}
                <div className={`grid grid-cols-3 ${useDesign2 ? 'gap-2 mt-2' : 'gap-3'}`}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => handlePinKeyPress(num.toString())}
                      onMouseDown={() => highlightPinButtons && setPressedButton(num.toString())}
                      onMouseUp={() => setPressedButton(null)}
                      onMouseLeave={() => setPressedButton(null)}
                      onTouchStart={() => highlightPinButtons && setPressedButton(num.toString())}
                      onTouchEnd={() => setPressedButton(null)}
                      disabled={isProcessing}
                      className={`${useDesign2 ? 'py-6 px-8' : 'py-6 px-8'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-2xl'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        highlightPinButtons && pressedButton === num.toString()
                          ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                          : useDesign2 
                            ? 'bg-[#0f0f0f] hover:bg-gray-800 dark:bg-[#0f0f0f] dark:hover:bg-gray-900 text-gray-400 dark:text-gray-500'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-[#161c25] dark:hover:bg-[#1f2937] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => setPin('')}
                    onMouseDown={() => highlightPinButtons && setPressedButton('clear')}
                    onMouseUp={() => setPressedButton(null)}
                    onMouseLeave={() => setPressedButton(null)}
                    onTouchStart={() => highlightPinButtons && setPressedButton('clear')}
                    onTouchEnd={() => setPressedButton(null)}
                    disabled={isProcessing}
                    className={`${useDesign2 ? 'py-6 px-8' : 'py-6 px-8'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-lg' : 'text-lg'} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      highlightPinButtons && pressedButton === 'clear'
                        ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                        : useDesign2 
                          ? 'bg-[#0f0f0f] hover:bg-gray-800 dark:bg-[#0f0f0f] dark:hover:bg-gray-900 text-gray-400 dark:text-gray-500'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-[#161c25] dark:hover:bg-[#1f2937] border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handlePinKeyPress('0')}
                    onMouseDown={() => highlightPinButtons && setPressedButton('0')}
                    onMouseUp={() => setPressedButton(null)}
                    onMouseLeave={() => setPressedButton(null)}
                    onTouchStart={() => highlightPinButtons && setPressedButton('0')}
                    onTouchEnd={() => setPressedButton(null)}
                    disabled={isProcessing}
                    className={`${useDesign2 ? 'py-6 px-8' : 'py-6 px-8'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-2xl'} font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      highlightPinButtons && pressedButton === '0'
                        ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                        : useDesign2 
                          ? 'bg-[#0f0f0f] hover:bg-gray-800 dark:bg-[#0f0f0f] dark:hover:bg-gray-900 text-gray-400 dark:text-gray-500'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-[#161c25] dark:hover:bg-[#1f2937] border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-200'
                    }`}
                  >
                    0
                  </button>
                  <button
                    onClick={() => setPin(pin.slice(0, -1))}
                    onMouseDown={() => highlightPinButtons && setPressedButton('backspace')}
                    onMouseUp={() => setPressedButton(null)}
                    onMouseLeave={() => setPressedButton(null)}
                    onTouchStart={() => highlightPinButtons && setPressedButton('backspace')}
                    onTouchEnd={() => setPressedButton(null)}
                    disabled={isProcessing}
                    className={`${useDesign2 ? 'py-6 px-8' : 'py-6 px-8'} ${useDesign2 ? 'border border-gray-600 dark:border-gray-700' : 'border'} ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} ${useDesign2 ? 'text-2xl' : 'text-2xl'} transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      highlightPinButtons && pressedButton === 'backspace'
                        ? 'bg-[#22c55f] text-white transform scale-95' + (useDesign2 ? ' border-[#22c55f]' : ' border-[#22c55f]')
                        : useDesign2 
                          ? 'bg-[#0f0f0f] hover:bg-gray-800 dark:bg-[#0f0f0f] dark:hover:bg-gray-900 text-gray-400 dark:text-gray-500'
                          : 'bg-gray-100 hover:bg-gray-200 dark:bg-[#161c25] dark:hover:bg-[#1f2937] border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    ←
                  </button>
                </div>
              </div>
            </div>
          </div>
          )
        ) : (
          // Authenticated Control Panel
          isMobile ? (
            // Mobile Authenticated View
            <div className="w-full h-full flex flex-col">
              {/* Mobile System Status */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {/* Status Header */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">System Status</h2>
                    <div className={`px-3 py-1 rounded-lg font-medium text-sm ${
                      allArmed ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      allDisarmed ? 'bg-[#22c55f]/10 text-[#22c55f]' :
                      'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {allArmed ? 'ALL ARMED' : allDisarmed ? 'ALL DISARMED' : 'PARTIAL'}
                    </div>
                  </div>

                  {/* Master Control - Compact */}
                  <div className={`flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} mb-3`}>
                    <div className="flex items-center gap-3">
                      <div className={`${someArmed ? 'text-rose-500' : 'text-[#22c55f]'}`}>
                        {someArmed ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Areas</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {allArmed ? 'Armed' : allDisarmed ? 'Disarmed' : `${areas.filter(a => a.armedState !== 'DISARMED').length} of ${areas.length} armed`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleAll()}
                      disabled={isProcessing}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        someArmed ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          someArmed ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Area Controls - Compact list */}
                  <div className="space-y-2">
                    {areas.map((area) => {
                      const hasWarnings = areaWarnings[area.id] && areaWarnings[area.id].length > 0;
                      
                      return (
                        <div
                          key={area.id}
                          className={`flex items-center justify-between p-3 ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} border border-gray-200 dark:border-gray-800`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`${area.armedState !== 'DISARMED' ? 'text-rose-500' : 'text-gray-400 dark:text-gray-600'}`}>
                              {area.armedState !== 'DISARMED' ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{area.name}</h4>
                              <p className={`text-xs ${
                                area.armedState !== 'DISARMED' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {area.armedState === 'DISARMED' ? 'Disarmed' : 'Armed'}
                                                              {useDesign2 && area.updatedAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                                  • {formatRelativeTime(new Date(area.updatedAt).getTime())}
                                </span>
                              )}
                              </p>
                            </div>
                            {hasWarnings && (
                              <button
                                onClick={() => setShowWarningDetails(area.id)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              >
                                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => handleAreaToggle(area)}
                            disabled={isProcessing}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                area.armedState !== 'DISARMED' ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Session Info */}
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Session expires after 5 minutes of inactivity
                </div>
              </div>

              {/* Mobile Bottom Navigation */}
              <div className="flex-shrink-0 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-3 h-16">
                  <button
                    onClick={() => setShowEvents(true)}
                    className="flex flex-col items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Events</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex flex-col items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Home</span>
                  </button>
                  
                  <button
                    onClick={() => setShowAutomation(true)}
                    className="flex flex-col items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Auto</span>
                  </button>
                </div>
              </div>

              {/* Warning Dialogs - Same as desktop but with mobile-optimized positioning */}
              {showWarningConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-4">
                      <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Security Check Failed</h3>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        The following issues were detected:
                      </p>
                      <ul className="space-y-1 text-sm">
                        {deviceWarnings.map((warning, idx) => (
                          <li key={idx} className="text-amber-600 dark:text-amber-400">
                            • {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                      For security, all doors should be closed and locked before arming. Do you want to proceed anyway?
                    </p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowWarningConfirm(false);
                          setDeviceWarnings([]);
                          setPendingAreaToggle(null);
                          setPendingToggleAll(null);
                        }}
                        className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (pendingAreaToggle) {
                            handleAreaToggle(pendingAreaToggle.area, true);
                          } else if (pendingToggleAll) {
                            handleToggleAll(true);
                          }
                        }}
                        className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                      >
                        Arm Anyway
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showWarningDetails && areaWarnings[showWarningDetails] && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
                  setShowWarningDetails(null);
                }}>
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">
                        {areas.find(a => a.id === showWarningDetails)?.name} - Security Issues
                      </h3>
                      <button
                        onClick={() => {
                          setShowWarningDetails(null);
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <ul className="space-y-2">
                      {areaWarnings[showWarningDetails].map((warning, idx) => {
                        return (
                          <li key={idx} className="flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <span className="text-sm text-amber-700 dark:text-amber-300">
                                {warning}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="max-w-3xl w-full">

            {/* Warning Confirmation Dialog */}
            {showWarningConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3 mb-4">
                    <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security Check Failed</h3>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      The following issues were detected:
                    </p>
                    <ul className="space-y-1 text-sm">
                      {deviceWarnings.map((warning, idx) => (
                        <li key={idx} className="text-amber-600 dark:text-amber-400">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
                    For security, all doors should be closed and locked before arming. Do you want to proceed anyway?
                  </p>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowWarningConfirm(false);
                        setDeviceWarnings([]);
                        setPendingAreaToggle(null);
                        setPendingToggleAll(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (pendingAreaToggle) {
                          handleAreaToggle(pendingAreaToggle.area, true);
                        } else if (pendingToggleAll) {
                          handleToggleAll(true);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                    >
                      Arm Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Warning Details Popup */}
            {showWarningDetails && areaWarnings[showWarningDetails] && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
                setShowWarningDetails(null);
              }}>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {areas.find(a => a.id === showWarningDetails)?.name} - Security Issues
                    </h3>
                    <button
                      onClick={() => {
                        setShowWarningDetails(null);
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <ul className="space-y-2">
                    {areaWarnings[showWarningDetails].map((warning, idx) => {
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-sm text-amber-700 dark:text-amber-300">
                              {warning}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

              </div>
            )}

            {/* System Status */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Status</h2>
                <div className={`px-4 py-2 rounded-lg font-medium ${
                  allArmed ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                  allDisarmed ? 'bg-[#22c55f]/10 text-[#22c55f]' :
                  'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {allArmed ? 'ALL ARMED' : allDisarmed ? 'ALL DISARMED' : 'PARTIAL'}
                </div>
              </div>

              {/* Master Control */}
              <div className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} mb-4`}>
                <div className="flex items-center gap-3">
                  <div className={`${someArmed ? 'text-rose-500' : 'text-[#22c55f]'}`}>
                    {someArmed ? (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                      </svg>
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Areas</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {allArmed ? 'Armed' : allDisarmed ? 'Disarmed' : `${areas.filter(a => a.armedState !== 'DISARMED').length} of ${areas.length} armed`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleAll()}
                  disabled={isProcessing}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    someArmed ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      someArmed ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Area Controls */}
              <div className="space-y-3">
                {areas.map((area) => {
                  const hasWarnings = areaWarnings[area.id] && areaWarnings[area.id].length > 0;
                  
                  return (
                    <div
                      key={area.id}
                      className={`flex items-center justify-between p-4 ${useDesign2 ? 'rounded-xl' : 'rounded-lg'} border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all`}
                    >
                                              <div className="flex items-center gap-3">
                          <div className={`${area.armedState !== 'DISARMED' ? 'text-rose-500' : 'text-gray-400 dark:text-gray-600'}`}>
                            {area.armedState !== 'DISARMED' ? (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">{area.name}</h4>
                            <p className={`text-sm ${
                              area.armedState !== 'DISARMED' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {area.armedState === 'DISARMED' ? 'Disarmed' : 'Armed'}
                              {useDesign2 && area.updatedAt && (
                                <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">
                                  • {formatRelativeTime(new Date(area.updatedAt).getTime())}
                                </span>
                              )}
                            </p>
                          </div>
                        {hasWarnings && (
                          <button
                            onClick={() => setShowWarningDetails(area.id)}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="View warnings"
                          >
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => handleAreaToggle(area)}
                        disabled={isProcessing}
                        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:scale-105 ${
                          area.armedState !== 'DISARMED' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            area.armedState !== 'DISARMED' ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => setShowEvents(true)}
                className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all"
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">View recent activity</p>
              </button>
              
              <button
                onClick={() => setShowAutomation(true)}
                className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-xl hover:border-gray-300 dark:hover:border-gray-700 transition-all"
              >
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Smart home controls</p>
              </button>
            </div>

            {/* Home Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Home
              </button>
            </div>
            
            {/* Session Info */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              Session will expire after 5 minutes of inactivity
            </div>
          </div>
          )
        )}
    </div>
    </main>
  );
}
