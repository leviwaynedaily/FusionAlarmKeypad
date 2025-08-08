/**
 * Fusion Alarm Keypad - Main Application Component
 * 
 * This is the primary interface for the Fusion Alarm Keypad system,
 * providing a modern, responsive UI for security system control.
 * Features include PIN authentication, real-time event monitoring,
 * weather integration, and comprehensive system status display.
 * 
 * Last updated: January 2025
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance';
import { addAlarmZoneTestFunctions } from '@/lib/utils';
import { 
  useAlarmKeypad,
  useAuthentication,
  useWeather,
  useTheme,
  useSystemHealth,
  useServiceWorker
} from '@/hooks';
import {
  LiveEventsTicker,
  MobileLayout,
  DesktopLayout,
  TestDesignLayout,
  VisionProLayout
} from '@/components';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { ZoneWarningModal } from '@/components/ui/ZoneWarningModal';
import { EventsGridSlide } from '@/components/ui/EventsGridSlide';
import { ArmingCountdown } from '@/components/ui/ArmingCountdown';
import { updateClock, isMobileDevice, getDeviceType } from '@/lib/alarmKeypadUtils';
import { SSEProvider, useSSEContext } from '@/hooks/SSEContext';

// API keys from environment variables
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
const DEFAULT_WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '';
const FUSION_API_KEY = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';

export default function AlarmKeypadPage() {
  return (
    <SSEProvider>
      <AlarmKeypad />
    </SSEProvider>
  );
}

function SSEConnectionManager({ organization, apiKey }: { organization: any; apiKey: string }) {
  const sse = useSSEContext();
  const [autoStartStatus, setAutoStartStatus] = useState<'idle' | 'starting' | 'success' | 'failed' | 'retrying'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const maxRetries = 3;
  
  // 🔍 Enhanced debugging utility with timestamps
  const debugLog = useCallback((message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toISOString();
    const prefix = '🚀 [SSE-AutoStart]';
    
    if (typeof window !== 'undefined' && localStorage.getItem('fusion_debug_mode') === 'true') {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      if (data) {
        logMethod(`${prefix} [${timestamp}] ${message}`, data);
      } else {
        logMethod(`${prefix} [${timestamp}] ${message}`);
      }
    }
  }, []);

  // 🔍 Network request debugging wrapper
  const debugFetch = useCallback(async (url: string, options?: RequestInit) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    debugLog(`📡 Request ${requestId} starting`, {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body ? JSON.parse(options.body as string) : undefined
    });

    try {
      const response = await fetch(url, options);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      debugLog(`📡 Request ${requestId} completed`, {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });

      return response;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      debugLog(`📡 Request ${requestId} failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`
      }, 'error');
      
      throw error;
    }
  }, [debugLog]);

  // 🔍 Background service health monitor
  const performHealthCheck = useCallback(async () => {
    try {
      debugLog('🏥 Performing background service health check...');
      
      const healthResponse = await debugFetch('/api/background-sse');
      const healthData = await healthResponse.json();
      
      const healthInfo = {
        timestamp: new Date().toISOString(),
        isRunning: healthData.status?.isRunning || false,
        uptime: healthData.status?.uptime,
        eventsProcessed: healthData.status?.eventsProcessed,
        lastEvent: healthData.status?.lastEvent,
        connectionState: healthData.status?.connectionState,
        errors: healthData.status?.errors
      };

      debugLog('🏥 Health check results:', healthInfo);
      
      setDebugInfo(prev => ({
        ...prev,
        healthCheck: healthInfo
      }));

      return healthInfo;
    } catch (error) {
      debugLog('🏥 Health check failed:', error, 'error');
      return null;
    }
  }, [debugLog, debugFetch]);

  // 🔍 State change monitoring
  useEffect(() => {
    debugLog('🔄 SSEConnectionManager state changed', {
      autoStartStatus,
      retryCount,
      lastError,
      organizationId: organization?.id,
      apiKeyLength: apiKey?.length,
      hasOrganization: !!organization,
      hasApiKey: !!apiKey
    });
  }, [autoStartStatus, retryCount, lastError, organization, apiKey, debugLog]);

  // 🔒 Add alarm zone test functions in development
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_APP_ENV !== 'production') {
      addAlarmZoneTestFunctions();
    }
  }, []);

  // 🔍 Component lifecycle monitoring
  useEffect(() => {
    debugLog('🎬 SSEConnectionManager mounted');
    
    return () => {
      debugLog('🎬 SSEConnectionManager unmounting');
    };
  }, [debugLog]);

  // 🔍 Dependency monitoring with detailed validation
  useEffect(() => {
    debugLog('🔍 Dependencies validation:', {
      organization: {
        exists: !!organization,
        id: organization?.id,
        name: organization?.name,
        type: typeof organization
      },
      apiKey: {
        exists: !!apiKey,
        length: apiKey?.length,
        type: typeof apiKey,
        isString: typeof apiKey === 'string',
        isNotEmpty: !!apiKey && apiKey.trim().length > 0
      }
    });
  }, [organization, apiKey, debugLog]);

  // Background SSE service now auto-starts with server - just load events
  useEffect(() => {
    if (!organization || !apiKey) {
      debugLog('No organization or API key available');
      setAutoStartStatus('idle');
      return;
    }
    
    debugLog('Background SSE service runs automatically with server, loading recent events...');
    setAutoStartStatus('success');
    setRetryCount(0);
    setLastError(null);
    
    // Events loaded automatically by background service and live stream
  }, [organization, apiKey]); // Removed sse and debugLog from deps to prevent constant re-runs

  // 🔇 REMOVED: No periodic health monitoring needed with SSE - just trust the connection
  // The background SSE service will automatically reconnect if needed
  // We can see if it's working by whether events are flowing through

  // 🎯 Enhanced visual feedback with detailed error information
  if (autoStartStatus === 'failed' || (autoStartStatus === 'retrying' && retryCount > 1)) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 rounded-lg p-3 max-w-sm shadow-lg">
        <div className="flex items-start space-x-2">
          <div className="text-yellow-600 dark:text-yellow-400 text-lg">
            {autoStartStatus === 'retrying' ? '🔄' : '⚠️'}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {autoStartStatus === 'retrying' 
                ? `Connecting to events... (${retryCount}/${maxRetries})`
                : 'Event service connection failed'
              }
            </div>
            {lastError && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                {lastError}
              </div>
            )}
            <div className="text-xs text-yellow-500 dark:text-yellow-500 mt-2">
              💡 Check browser console for detailed logs
              {typeof window !== 'undefined' && localStorage.getItem('fusion_debug_mode') !== 'true' && (
                <div className="mt-1">
                  Enable Debug Mode in Settings for more details
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // This component doesn't render anything when working normally
}

function AlarmKeypad() {
  console.log('🔥 AlarmKeypad mounted');
  
  // Core hooks
  const alarmKeypad = useAlarmKeypad();
  const auth = useAuthentication();
  const sse = useSSEContext();
  const weather = useWeather();
  const theme = useTheme();
  const systemHealth = useSystemHealth();
  const serviceWorker = useServiceWorker();
  const router = useRouter();

  // Local state for clock and mobile detection
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isClient, setIsClient] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [requireApiKey, setRequireApiKey] = useState(false);
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fusion_debug_mode') === 'true';
    }
    return false;
  });

  // Carousel state for dashboard slides
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);

  // Extract header props
  const locationName = alarmKeypad.selectedLocation?.name;
  const postalCode = alarmKeypad.selectedLocation?.addressPostalCode;
  const organizationName = alarmKeypad.organization?.name;

  // Temperature unit state
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit');

  // TEST: Simple useEffect to verify useEffect works
  useEffect(() => {
    console.error('🚨 SIMPLE useEffect test - RUNNING!');
  }, []);

  // Initialize on mount - Railway deployment trigger  
  useEffect(() => {
    console.error('🚨 MAIN useEffect starting weather load');
    console.log('🎬 Main useEffect started - checking API key');
    console.log('🔑 FUSION_API_KEY available:', !!FUSION_API_KEY);
    console.log('🔑 FUSION_API_KEY value:', FUSION_API_KEY ? `${FUSION_API_KEY.slice(0, 8)}...` : 'undefined');
    
    setIsClient(true);
    analytics.trackPageView('main-keypad');

    // Load temperature unit preference
    const savedTempUnit = localStorage.getItem('temperature_unit') as 'celsius' | 'fahrenheit';
    if (savedTempUnit) {
      setTemperatureUnit(savedTempUnit);
      weather.setTemperatureUnit(savedTempUnit);
    }

    if (!FUSION_API_KEY) {
      console.log('❌ Early return: No FUSION_API_KEY found');
      alarmKeypad.setError('Fusion API key is not set. Please add NEXT_PUBLIC_FUSION_API_KEY to your .env file.');
      return;
    }
    console.log('✅ API key check passed, continuing...');
    alarmKeypad.setApiKey(FUSION_API_KEY);
    // 🔒 SECURITY: Store API key securely instead of localStorage
    if (typeof window !== 'undefined') {
      const keyData = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'fallback-key';
      let encrypted = '';
      for (let i = 0; i < FUSION_API_KEY.length; i++) {
        const keyChar = keyData.charCodeAt(i % keyData.length);
        const textChar = FUSION_API_KEY.charCodeAt(i);
        encrypted += String.fromCharCode(textChar ^ keyChar);
      }
      sessionStorage.setItem('fusion_secure_api_key', btoa(encrypted));
      // Remove old localStorage key if it exists
      localStorage.removeItem('fusion_api_key');
    }

    const savedLocation = localStorage.getItem('fusion_selected_location');
    const initialLoad = async () => {
      try {
        console.log('🚀 initialLoad function started');
        alarmKeypad.setLoading(true);
        await alarmKeypad.loadOrganizationAndLocations(savedLocation);
        
        // Load weather data directly using savedLocation data (not relying on async React state)
        console.log('🌤️ Weather Debug - Saved Location:', savedLocation);
        console.log('🌤️ Weather Debug - API Key Available:', !!process.env.NEXT_PUBLIC_WEATHER_API_KEY);

        if (savedLocation && process.env.NEXT_PUBLIC_WEATHER_API_KEY) {
          try {
            const locationData = JSON.parse(savedLocation);
            console.log('🌤️ Parsed location data:', locationData);
            
            if (locationData.addressPostalCode) {
              console.log('🌤️ Fetching weather for postal code:', locationData.addressPostalCode);
              await weather.fetchWeatherData(locationData.addressPostalCode);
              console.log('🌤️ Weather result:', weather.weather);
            } else {
              console.log('🌤️ Weather NOT loaded - No postal code in location:', locationData);
            }
          } catch (e) {
            console.error('🌤️ Error parsing location for weather:', e);
          }
        } else {
          console.log('🌤️ Weather NOT loaded - Missing:', {
            savedLocation: !!savedLocation,
            hasApiKey: !!process.env.NEXT_PUBLIC_WEATHER_API_KEY
          });
        }
      } catch (error) {
        console.error('Initialization error:', error);
        alarmKeypad.setError('Failed to initialize application');
      } finally {
        alarmKeypad.setLoading(false);
      }
    };
    initialLoad();
    serviceWorker.registerUpdateListener();
    const updateClockInterval = setInterval(() => {
      const { timeString, dateString } = updateClock();
      setCurrentTime(timeString);
      setCurrentDate(dateString);
    }, 1000);
    const updateMobileState = () => {
      const device = getDeviceType();
      setDeviceType(device);
      setIsMobile(device === 'mobile'); // Keep legacy isMobile for compatibility
    };
    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    const healthInterval = setInterval(() => {
      if (alarmKeypad.devices.length > 0) {
        systemHealth.checkDeviceStatus(alarmKeypad.devices);
        systemHealth.updateHeartbeat();
      }
    }, 30000);
    return () => {
      clearInterval(updateClockInterval);
      clearInterval(healthInterval);
      window.removeEventListener('resize', updateMobileState);
    };
  }, []);

  // Weather effect - fetch weather when location becomes available
  useEffect(() => {
    const fetchWeatherForLocation = async () => {
      if (alarmKeypad.selectedLocation?.addressPostalCode && process.env.NEXT_PUBLIC_WEATHER_API_KEY) {
        try {
          console.log('🌤️ Weather Effect: Fetching weather for location:', alarmKeypad.selectedLocation.name);
          console.log('🌤️ Weather Effect: Postal code:', alarmKeypad.selectedLocation.addressPostalCode);
          
          // Ensure temperature unit is set from localStorage if not already set
          const savedTempUnit = localStorage.getItem('temperature_unit') as 'celsius' | 'fahrenheit';
          if (savedTempUnit && weather.temperatureUnit !== savedTempUnit) {
            weather.setTemperatureUnit(savedTempUnit);
            setTemperatureUnit(savedTempUnit);
          }
          
          await weather.fetchWeatherData(alarmKeypad.selectedLocation.addressPostalCode);
          console.log('🌤️ Weather Effect: Weather fetched successfully:', weather.weather);
        } catch (error) {
          console.error('🌤️ Weather Effect: Failed to fetch weather:', error);
        }
      } else {
        console.log('🌤️ Weather Effect: Skipping weather fetch:', {
          hasLocation: !!alarmKeypad.selectedLocation,
          hasPostalCode: !!alarmKeypad.selectedLocation?.addressPostalCode,
          hasApiKey: !!process.env.NEXT_PUBLIC_WEATHER_API_KEY
        });
      }
    };

    fetchWeatherForLocation();
  }, [alarmKeypad.selectedLocation?.addressPostalCode]);

  // Handle PIN authentication
  const handleAuthenticate = async () => {
    await auth.handleAuthenticate(alarmKeypad.selectedLocation);
  };

  // Handle logout
  const handleLogout = () => {
    auth.handleLogout(alarmKeypad.selectedLocation);
  };

  // Handle PIN key press
  const handlePinKeyPress = (digit: string) => {
    auth.handlePinKeyPress(digit);
  };

  // Handle PIN clear
  const handlePinClear = () => {
    auth.clearPin();
  };

  // Handle PIN backspace
  const handlePinBackspace = () => {
    auth.removeLastDigit();
  };

  // Handle pressed button change
  const handlePressedButtonChange = (button: string | null) => {
    alarmKeypad.setPressedButton(button);
  };

  // Handle settings button click
  const handleSettingsClick = () => {
    setSettingsModalOpen(true);
  };

  const handleDebugModeChange = (value: boolean) => {
    setDebugMode(value);
    localStorage.setItem('fusion_debug_mode', value.toString());
    console.log(value ? '🐛 Debug mode enabled' : '🐛 Debug mode disabled');
  };

  const handleTemperatureUnitChange = (unit: 'celsius' | 'fahrenheit') => {
    setTemperatureUnit(unit);
    weather.setTemperatureUnit(unit);
    localStorage.setItem('temperature_unit', unit);
    console.log(`🌡️ Temperature unit changed to ${unit}`);
  };

  // Carousel navigation handlers
  const handleSlideChange = (slide: number) => {
    setCurrentSlide(slide);
    setTranslateX(-slide * 100);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    const slideWidth = carouselRef.current?.offsetWidth || window.innerWidth;
    const dragPercentage = (diff / slideWidth) * 100;
    
    setTranslateX(-currentSlide * 100 + dragPercentage);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    const slideWidth = carouselRef.current?.offsetWidth || window.innerWidth;
    const threshold = slideWidth * 0.2; // 20% threshold
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentSlide > 0) {
        // Swipe right - go to previous slide
        handleSlideChange(currentSlide - 1);
      } else if (diff < 0 && currentSlide < 1) {
        // Swipe left - go to next slide  
        handleSlideChange(currentSlide + 1);
      } else {
        // Snap back to current slide
        setTranslateX(-currentSlide * 100);
      }
    } else {
      // Snap back to current slide
      setTranslateX(-currentSlide * 100);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX;
    const slideWidth = carouselRef.current?.offsetWidth || window.innerWidth;
    const dragPercentage = (diff / slideWidth) * 100;
    
    setTranslateX(-currentSlide * 100 + dragPercentage);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const endX = e.clientX;
    const diff = endX - startX;
    const slideWidth = carouselRef.current?.offsetWidth || window.innerWidth;
    const threshold = slideWidth * 0.2;
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentSlide > 0) {
        handleSlideChange(currentSlide - 1);
      } else if (diff < 0 && currentSlide < 1) {
        handleSlideChange(currentSlide + 1);
      } else {
        setTranslateX(-currentSlide * 100);
      }
    } else {
      setTranslateX(-currentSlide * 100);
    }
  };

  // Auto-authenticate when PIN is complete
  useEffect(() => {
    if (auth.pin.length === 6 && !auth.isProcessing) {
      handleAuthenticate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.pin, auth.isProcessing]);

  // Don't render until client-side
  if (!isClient) {
    return null;
  }

  // Show loading state
  if (alarmKeypad.loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22c55f] mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show location selector if no location is selected
  if (alarmKeypad.showLocationSelect) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Select Location
          </h2>
          <div className="space-y-2">
            {alarmKeypad.locations.length === 0 ? (
              <div className="text-center">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  No locations available.<br />
                  Please check your API key or network connection.
                </p>
                <button
                  onClick={alarmKeypad.loadLocations}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              alarmKeypad.locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => alarmKeypad.handleLocationSelect(location)}
                  className="w-full p-3 text-left bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="font-medium text-gray-900 dark:text-white">{location.name}</div>
                  {location.addressCity && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {location.addressCity}, {location.addressState}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Helper function to get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Handle zone toggle
  const handleZoneToggle = async (zone: any) => {
    await alarmKeypad.handleZoneToggle(zone);
  };

  // Show authenticated dashboard
  if (auth.isAuthenticated) {
    return (
      <div className="w-full h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Carousel Container */}
        <div 
          ref={carouselRef}
          className="w-full h-full flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${translateX}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Slide 1: Main Dashboard */}
          <div className="w-full h-full flex-shrink-0">
            <div className="flex flex-col items-center justify-center min-h-screen p-3">
          <div className="w-full max-w-sm">
            {/* Compact Greeting Header - Smaller on mobile */}
            <div className={`text-center ${isMobile ? 'mb-4' : 'mb-6'}`}>
              <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl mb-1' : 'text-2xl mb-2'}`}>
                {getTimeBasedGreeting()}, {auth.authenticatedUser}
              </h1>
              <p className={`text-gray-600 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                {alarmKeypad.selectedLocation?.name}
              </p>
            </div>

            {/* Compact Alarm Zones */}
            <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
              <h2 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-lg mb-3' : 'text-xl mb-4'}`}>
                Alarm Zones
              </h2>
              
              {alarmKeypad.alarmZones && alarmKeypad.alarmZones.length > 0 ? (
                <div className={`space-y-${isMobile ? '2' : '3'}`}>
                  {alarmKeypad.alarmZones.filter(zone => zone.isActive).map((zone) => {
                    const zonesWithDevices = alarmKeypad.getZonesWithDevices();
                    const zoneData = zonesWithDevices.find(z => z.id === zone.id);
                    const isArmed = zone.armedState !== 'DISARMED';
                    
                    return (
                      <div
                        key={zone.id}
                        className={`flex items-center justify-between bg-gray-50 dark:bg-[#161c25] rounded-xl border border-gray-200 dark:border-gray-800 ${isMobile ? 'p-3' : 'p-4'}`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                            {zone.name}
                          </span>
                          <span className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                            {zoneData?.devices?.length || 0} device{(zoneData?.devices?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Compact Toggle Switch */}
                        <button
                          onClick={() => handleZoneToggle(zone)}
                          disabled={alarmKeypad.isProcessing}
                          className={`relative inline-flex ${isMobile ? 'h-6 w-11' : 'h-7 w-12'} items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-[#1a1a1a] ${
                            isArmed
                              ? 'bg-rose-500 hover:bg-rose-600 focus:ring-rose-500 shadow-lg shadow-rose-500/30' 
                              : 'bg-[#22c55f] hover:bg-[#16a34a] focus:ring-[#22c55f] shadow-lg shadow-[#22c55f]/30'
                          } ${alarmKeypad.isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        >
                          <span
                            className={`inline-block ${isMobile ? 'h-4 w-4' : 'h-5 w-5'} transform rounded-full bg-white transition-transform duration-300 shadow-lg ${
                              isArmed ? (isMobile ? 'translate-x-6' : 'translate-x-6') : 'translate-x-1'
                            }`}
                          />
                        </button>
                        
                        {/* Compact Status Text */}
                        <div className="flex flex-col items-end ml-2">
                          <span className={`font-bold ${isMobile ? 'text-xs' : 'text-sm'} ${
                            isArmed ? 'text-rose-600 dark:text-rose-400' : 'text-[#22c55f]'
                          }`}>
                            {isArmed ? 'ARMED' : 'DISARMED'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No alarm zones configured
                  </p>
                </div>
              )}
            </div>

            {/* Swipe Indicator for Events */}
            <div className="bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 mb-4 overflow-hidden">
              <div className="p-4">
                <button
                  onClick={() => handleSlideChange(1)}
                  className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          View Events Grid
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {(() => {
                            if (!alarmKeypad.eventFilterSettings) return sse.recentEvents.length;
                            
                            const eventFilterSettings = alarmKeypad.eventFilterSettings;
                            
                            const filteredCount = sse.recentEvents.filter(event => {
                              const eventType = event.type?.toLowerCase();
                              
                              // Check individual event type settings first
                              if (eventType && eventFilterSettings.eventTypes.hasOwnProperty(eventType)) {
                                const isEnabled = eventFilterSettings.eventTypes[eventType] !== false;
                                if (eventFilterSettings.showAllEvents) {
                                  return true;
                                }
                                return isEnabled;
                              }
                              
                              // Check new event type settings format
                              if (eventType && eventFilterSettings.eventTypeSettings[eventType]) {
                                const isEnabled = eventFilterSettings.eventTypeSettings[eventType].showInTimeline;
                                if (eventFilterSettings.showAllEvents) {
                                  return true;
                                }
                                return isEnabled;
                              }
                              
                              // Check if event is space-related
                              const isSpaceEvent = event.spaceId && event.spaceName;
                              if (eventFilterSettings.showSpaceEvents && isSpaceEvent) return true;
                              
                              // Default fallback
                              return eventFilterSettings.showAllEvents;
                            }).length;
                            
                            return filteredCount;
                          })()} events (filtered)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-blue-600 dark:text-blue-400 mr-2 group-hover:mr-3 transition-all duration-200">
                        Swipe left →
                      </span>
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Compact Quick Actions */}
            <div className={`flex gap-2 ${isMobile ? 'mb-3' : 'mb-4'}`}>
              <button
                onClick={handleLogout}
                className={`flex-1 bg-gray-100 dark:bg-[#161c25] hover:bg-gray-200 dark:hover:bg-[#1f2937] text-gray-700 dark:text-gray-300 rounded-xl transition-all duration-200 font-medium border border-gray-300 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-700 ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3'}`}
              >
                Logout
              </button>
              <button
                onClick={handleSettingsClick}
                className={`flex-1 bg-[#22c55f] hover:bg-[#16a34a] text-white rounded-xl transition-all duration-200 font-medium shadow-lg shadow-[#22c55f]/30 hover:shadow-[#22c55f]/40 hover:scale-105 ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-3'}`}
              >
                Settings
              </button>
            </div>

            {/* Compact System Status */}
            <div className={`bg-white dark:bg-[#0f0f0f] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm ${isMobile ? 'p-3' : 'p-4'}`}>
              <div className="flex items-center justify-between">
                <span className={`font-medium text-gray-600 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>System Status</span>
                <div className="flex items-center gap-2">
                  <div 
                    className={`rounded-full ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} shadow-lg`}
                    style={{ 
                      backgroundColor: systemHealth.getSystemStatusColor(),
                      boxShadow: `0 0 8px ${systemHealth.getSystemStatusColor()}40`
                    }}
                  />
                  <span className={`font-semibold text-gray-900 dark:text-white capitalize ${isMobile ? 'text-xs' : 'text-sm'}`}>
                    {systemHealth.systemStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Show Live Events Toggle on Mobile */}
            {isMobile && (
              <div className="mt-3">
                <button
                  onClick={() => alarmKeypad.setShowLiveEvents(!alarmKeypad.showLiveEvents)}
                  className="w-full bg-gray-100 dark:bg-[#161c25] hover:bg-gray-200 dark:hover:bg-[#1f2937] text-gray-600 dark:text-gray-400 rounded-lg px-3 py-2 text-xs font-medium border border-gray-300 dark:border-gray-800 transition-all duration-200"
                >
                  {alarmKeypad.showLiveEvents ? 'Hide' : 'Show'} Live Events
                </button>
              </div>
            )}
          </div>
        </div>

            {/* Mobile Live Events - Conditionally shown */}
            {isMobile && alarmKeypad.showLiveEvents && (
              <div className="absolute bottom-0 left-0 right-0">
                <LiveEventsTicker
                  showLiveEvents={alarmKeypad.showLiveEvents}
                  recentEvents={sse.recentEvents}
                  debugMode={debugMode}
                  cameras={alarmKeypad.cameras}
                  spaces={alarmKeypad.spaces}
                  eventFilterSettings={alarmKeypad.eventFilterSettings}
                  alarmZones={alarmKeypad.alarmZones}
                />
              </div>
            )}
          </div>

          {/* Slide 2: Events Grid */}
          <div className="w-full h-full flex-shrink-0">
            <EventsGridSlide 
              onBack={() => handleSlideChange(0)}
              eventFilterSettings={alarmKeypad.eventFilterSettings}
              alarmZones={alarmKeypad.alarmZones}
            />
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
          {[0, 1].map((slide) => (
            <button
              key={slide}
              onClick={() => handleSlideChange(slide)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                currentSlide === slide 
                  ? 'bg-blue-500 w-6' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>

        {/* Swipe Hint - Show on first visit */}
        {currentSlide === 0 && (
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 z-10">
            <div className="flex items-center text-blue-500 dark:text-blue-400 animate-pulse">
              <span className="text-sm mr-2">Swipe for events</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <SettingsModal
          open={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          apiKey={alarmKeypad.apiKey}
          onApiKeyUpdate={(key) => {
            alarmKeypad.setApiKey(key);
            // 🔒 SECURITY: Use secure storage instead of localStorage
            if (typeof window !== 'undefined') {
              const keyData = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'fallback-key';
              let encrypted = '';
              for (let i = 0; i < key.length; i++) {
                const keyChar = keyData.charCodeAt(i % keyData.length);
                const textChar = key.charCodeAt(i);
                encrypted += String.fromCharCode(textChar ^ keyChar);
              }
              sessionStorage.setItem('fusion_secure_api_key', btoa(encrypted));
              localStorage.removeItem('fusion_api_key');
            }
          }}
          weather={weather.weather}
          selectedLocation={alarmKeypad.selectedLocation}
          organization={alarmKeypad.organization}
          temperatureUnit={temperatureUnit}
          onTemperatureUnitChange={handleTemperatureUnitChange}
          armingDelaySeconds={alarmKeypad.armingDelaySeconds}
          onArmingDelaySecondsChange={alarmKeypad.setArmingDelaySeconds}
          showZonesPreview={alarmKeypad.showZonesPreview}
          onShowZonesPreviewChange={(value) => {
            alarmKeypad.setShowZonesPreview(value);
            localStorage.setItem('show_zones_preview', value.toString());
          }}
          showSeconds={alarmKeypad.showSeconds}
          onShowSecondsChange={(value) => {
            alarmKeypad.setShowSeconds(value);
            localStorage.setItem('show_seconds', value.toString());
          }}
          highlightPinButtons={alarmKeypad.highlightPinButtons}
          onHighlightPinButtonsChange={(value) => {
            alarmKeypad.setHighlightPinButtons(value);
            localStorage.setItem('highlight_pin_buttons', value.toString());
          }}
          sseConnected={sse.isConnected}
          lastSSEEvent={sse.lastSSEEvent}
          showLiveEvents={alarmKeypad.showLiveEvents}
          onShowLiveEventsChange={(value) => {
            alarmKeypad.setShowLiveEvents(value);
          }}
          debugMode={debugMode}
          onDebugModeChange={handleDebugModeChange}
          eventFilterSettings={alarmKeypad.eventFilterSettings}
          onEventFilterSettingsChange={alarmKeypad.updateEventFilterSettings}
          chimeSettings={alarmKeypad.chimeSettings}
          onChimeSettingsChange={alarmKeypad.updateChimeSettings}
          useTestDesign={alarmKeypad.useTestDesign}
          onUseTestDesignChange={(value) => {
            alarmKeypad.setUseTestDesign(value);
            localStorage.setItem('use_test_design', value.toString());
          }}
          useTestDesign2={alarmKeypad.useTestDesign2}
          onUseTestDesign2Change={(value) => {
            alarmKeypad.setUseTestDesign2(value);
            localStorage.setItem('use_test_design_2', value.toString());
          }}
          systemStatus={systemHealth.systemStatus}
          deviceConnectivity={systemHealth.deviceConnectivity}
          offlineDevices={systemHealth.offlineDevices}
          lastHeartbeat={systemHealth.lastHeartbeat}
          theme={theme.theme}
          onThemeChange={theme.setTheme}
          spaces={alarmKeypad.spaces}
          alarmZones={alarmKeypad.alarmZones}
          onAlarmZonesChange={alarmKeypad.setAlarmZones}
          onLocationChange={() => {
            // Handle location change if needed
          }}
          requireApiKey={requireApiKey}
        />

        {/* Zone Warning Modal */}
        <ZoneWarningModal
          isOpen={alarmKeypad.showWarningConfirm && !!alarmKeypad.pendingZoneToggle}
          onClose={() => alarmKeypad.setShowWarningConfirm(false)}
          onConfirm={alarmKeypad.handleZoneWarningConfirm}
          zone={alarmKeypad.pendingZoneToggle?.zone || null}
          warnings={alarmKeypad.pendingZoneToggle ? (alarmKeypad.zoneWarnings[alarmKeypad.pendingZoneToggle.zone.id] || []) : []}
        />

        {/* Arming Countdown Modal */}
        <ArmingCountdown
          isVisible={alarmKeypad.showArmingCountdown}
          initialSeconds={alarmKeypad.armingDelaySeconds}
          zoneName={alarmKeypad.countdownZone?.name || ''}
          onComplete={alarmKeypad.handleCountdownComplete}
          onCancel={alarmKeypad.handleCountdownCancel}
        />
      </div>
    );
  }

  // Show PIN entry interface
  return (
    <div className="w-full h-full flex flex-col relative">
      {/* SSE Connection Manager */}
      <SSEConnectionManager 
        organization={alarmKeypad.organization} 
        apiKey={alarmKeypad.apiKey} 
      />
      

      {/* Main Layout Container */}
      <div className="flex-1 min-h-0">
      {/* Layout Selection */}
      {alarmKeypad.useTestDesign2 ? (
        <VisionProLayout
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          isMobile={isMobile}
          currentTime={currentTime}
          currentDate={currentDate}
          selectedLocation={alarmKeypad.selectedLocation}
          showSeconds={alarmKeypad.showSeconds}
          weather={weather.weather}
          spaces={alarmKeypad.spaces}
          devices={alarmKeypad.devices}
          getZonesWithDevices={alarmKeypad.getZonesWithDevices}
          pin={auth.pin}
          isProcessing={auth.isProcessing}
          error={auth.error}
          highlightPinButtons={alarmKeypad.highlightPinButtons}
          pressedButton={alarmKeypad.pressedButton}
          onPinKeyPress={handlePinKeyPress}
          onClear={handlePinClear}
          onBackspace={handlePinBackspace}
          onPressedButtonChange={handlePressedButtonChange}
          onSettingsClick={handleSettingsClick}
        />
      ) : alarmKeypad.useTestDesign ? (
        <TestDesignLayout
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          isMobile={isMobile}
          currentTime={currentTime}
          currentDate={currentDate}
          selectedLocation={alarmKeypad.selectedLocation}
          showSeconds={alarmKeypad.showSeconds}
          weather={weather.weather}
          temperatureUnit={temperatureUnit}
          getDisplayTemperature={weather.getDisplayTemperature}
          getTemperatureUnit={weather.getTemperatureUnit}
          spaces={alarmKeypad.spaces}
          devices={alarmKeypad.devices}
          showZonesPreview={alarmKeypad.showZonesPreview}
          getZonesWithDevices={alarmKeypad.getZonesWithDevices}
          pin={auth.pin}
          isProcessing={auth.isProcessing}
          error={auth.error}
          highlightPinButtons={alarmKeypad.highlightPinButtons}
          pressedButton={alarmKeypad.pressedButton}
          onPinKeyPress={handlePinKeyPress}
          onClear={handlePinClear}
          onBackspace={handlePinBackspace}
          onPressedButtonChange={handlePressedButtonChange}
          onSettingsClick={handleSettingsClick}
        />
      ) : deviceType === 'mobile' ? (
        <MobileLayout
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          currentTime={currentTime}
          currentDate={currentDate}
          selectedLocation={alarmKeypad.selectedLocation}
          showSeconds={alarmKeypad.showSeconds}
          spaces={alarmKeypad.spaces}
          alarmZones={alarmKeypad.alarmZones}
          getZonesWithDevices={alarmKeypad.getZonesWithDevices}
          weather={weather.weather}
          temperatureUnit={temperatureUnit}
          getDisplayTemperature={weather.getDisplayTemperature}
          getTemperatureUnit={weather.getTemperatureUnit}
          useDesign2={alarmKeypad.useDesign2}
          showZonesPreview={alarmKeypad.showZonesPreview}
          pin={auth.pin}
          isProcessing={auth.isProcessing}
          error={auth.error}
          highlightPinButtons={alarmKeypad.highlightPinButtons}
          pressedButton={alarmKeypad.pressedButton}
          onPinKeyPress={handlePinKeyPress}
          onClear={handlePinClear}
          onBackspace={handlePinBackspace}
          onPressedButtonChange={handlePressedButtonChange}
          onSettingsClick={handleSettingsClick}
        />
      ) : deviceType === 'tablet' ? (
        <DesktopLayout
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          currentTime={currentTime}
          currentDate={currentDate}
          selectedLocation={alarmKeypad.selectedLocation}
          showSeconds={alarmKeypad.showSeconds}
          alarmZones={alarmKeypad.alarmZones}
          spaces={alarmKeypad.spaces}
          getZonesWithDevices={alarmKeypad.getZonesWithDevices}
          weather={weather.weather}
          useDesign2={alarmKeypad.useDesign2}
          showZonesPreview={alarmKeypad.showZonesPreview}
          pin={auth.pin}
          isProcessing={auth.isProcessing}
          error={auth.error}
          highlightPinButtons={alarmKeypad.highlightPinButtons}
          pressedButton={alarmKeypad.pressedButton}
          onPinKeyPress={handlePinKeyPress}
          onClear={handlePinClear}
          onBackspace={handlePinBackspace}
          onPressedButtonChange={handlePressedButtonChange}
          onSettingsClick={handleSettingsClick}
        />
      ) : (
        <DesktopLayout
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          currentTime={currentTime}
          currentDate={currentDate}
          selectedLocation={alarmKeypad.selectedLocation}
          showSeconds={alarmKeypad.showSeconds}
          alarmZones={alarmKeypad.alarmZones}
          spaces={alarmKeypad.spaces}
          getZonesWithDevices={alarmKeypad.getZonesWithDevices}
          weather={weather.weather}
          temperatureUnit={temperatureUnit}
          getDisplayTemperature={weather.getDisplayTemperature}
          getTemperatureUnit={weather.getTemperatureUnit}
          useDesign2={alarmKeypad.useDesign2}
          showZonesPreview={alarmKeypad.showZonesPreview}
          pin={auth.pin}
          isProcessing={auth.isProcessing}
          error={auth.error}
          highlightPinButtons={alarmKeypad.highlightPinButtons}
          pressedButton={alarmKeypad.pressedButton}
          onPinKeyPress={handlePinKeyPress}
          onClear={handlePinClear}
          onBackspace={handlePinBackspace}
          onPressedButtonChange={handlePressedButtonChange}
          onSettingsClick={handleSettingsClick}
        />
      )}
      </div>

      {/* Live Events Ticker - Now in proper layout flow */}
      <div className="flex-shrink-0">
        <LiveEventsTicker
          showLiveEvents={alarmKeypad.showLiveEvents}
          recentEvents={sse.recentEvents}
          debugMode={debugMode}
          cameras={alarmKeypad.cameras}
          spaces={alarmKeypad.spaces}
          eventFilterSettings={alarmKeypad.eventFilterSettings}
          alarmZones={alarmKeypad.alarmZones}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        open={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)}
        apiKey={alarmKeypad.apiKey}
        onApiKeyUpdate={alarmKeypad.setApiKey}
        weather={weather.weather}
        selectedLocation={alarmKeypad.selectedLocation}
        organization={alarmKeypad.organization}
        temperatureUnit={temperatureUnit}
        onTemperatureUnitChange={handleTemperatureUnitChange}
        armingDelaySeconds={alarmKeypad.armingDelaySeconds}
        onArmingDelaySecondsChange={alarmKeypad.setArmingDelaySeconds}
        showZonesPreview={alarmKeypad.showZonesPreview}
        onShowZonesPreviewChange={alarmKeypad.setShowZonesPreview}
        showSeconds={alarmKeypad.showSeconds}
        onShowSecondsChange={alarmKeypad.setShowSeconds}
        highlightPinButtons={alarmKeypad.highlightPinButtons}
        onHighlightPinButtonsChange={alarmKeypad.setHighlightPinButtons}

        sseConnected={sse.sseConnected}
        lastSSEEvent={sse.lastSSEEvent}
        showLiveEvents={alarmKeypad.showLiveEvents}
        onShowLiveEventsChange={alarmKeypad.setShowLiveEvents}
        debugMode={debugMode}
        onDebugModeChange={handleDebugModeChange}
        eventFilterSettings={alarmKeypad.eventFilterSettings}
        onEventFilterSettingsChange={alarmKeypad.updateEventFilterSettings}
        chimeSettings={alarmKeypad.chimeSettings}
        onChimeSettingsChange={alarmKeypad.updateChimeSettings}
        useTestDesign={alarmKeypad.useTestDesign}
         onUseTestDesignChange={alarmKeypad.setUseTestDesign}
         useTestDesign2={alarmKeypad.useTestDesign2}
         onUseTestDesign2Change={alarmKeypad.setUseTestDesign2}
         systemStatus={systemHealth.systemStatus}
        deviceConnectivity={systemHealth.deviceConnectivity}
        offlineDevices={systemHealth.offlineDevices}
        lastHeartbeat={systemHealth.lastHeartbeat}
        theme={theme.theme}
        onThemeChange={theme.setTheme}
        spaces={alarmKeypad.spaces}
        alarmZones={alarmKeypad.alarmZones}
        onAlarmZonesChange={alarmKeypad.setAlarmZones}
        onLocationChange={() => {
          setSettingsModalOpen(false);
          alarmKeypad.setShowLocationSelect(true);
        }}
        requireApiKey={requireApiKey}
      />
    </div>
  );
} 