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

import { useState, useEffect, useCallback } from 'react';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance';
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
import { updateClock, isMobileDevice } from '@/lib/alarmKeypadUtils';
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

  useEffect(() => {
    const startBackgroundSSE = async () => {
      // 🔍 Dependency validation with detailed debugging
      if (!organization || !apiKey) {
        debugLog('⏳ Waiting for dependencies...', {
          organization: {
            exists: !!organization,
            value: organization
          },
          apiKey: {
            exists: !!apiKey,
            length: apiKey?.length
          },
          reason: !organization ? 'Missing organization' : 'Missing API key'
        }, 'warn');
        setAutoStartStatus('idle');
        return;
      }

      debugLog('🚀 Starting auto-start sequence', {
        organizationId: organization.id,
        organizationName: organization.name,
        apiKeyLength: apiKey.length,
        retryAttempt: retryCount + 1,
        maxRetries,
        timestamp: new Date().toISOString()
      });
      
      setAutoStartStatus('starting');
      setLastError(null);
      
      try {
        // 📊 Check current status with enhanced debugging
        debugLog('🔍 Checking background service status...');
        const statusController = new AbortController();
        const statusTimeout = setTimeout(() => {
          debugLog('⏰ Status check timeout triggered (10s)', {}, 'warn');
          statusController.abort();
        }, 10000);
        
        const statusResponse = await debugFetch('/api/background-sse', {
          signal: statusController.signal
        });
        clearTimeout(statusTimeout);
        
        if (!statusResponse.ok) {
          throw new Error(`Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
        }
        
        const status = await statusResponse.json();
        debugLog('📊 Background service status response:', status);
        
        if (status.status?.isRunning) {
          debugLog('✅ Service already running, verifying connection...');
          setAutoStartStatus('success');
          
          // Trust that the service is working - no need to verify again
          debugLog('✅ Auto-start completed - service was already running');
          
          return;
        }

        // 🚀 Start the background service with enhanced debugging
        debugLog('🚀 Service not running, starting background SSE service...');
        const startController = new AbortController();
        const startTimeout = setTimeout(() => {
          debugLog('⏰ Start request timeout triggered (15s)', {}, 'warn');
          startController.abort();
        }, 15000);
        
        const startPayload = { 
          action: 'start',
          organizationId: organization.id,
          apiKey: apiKey,
          timestamp: new Date().toISOString(),
          clientInfo: {
            userAgent: navigator.userAgent,
            url: window.location.href
          }
        };
        
        debugLog('📤 Sending start request with payload:', startPayload);
        
        const startResponse = await debugFetch('/api/background-sse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(startPayload),
          signal: startController.signal
        });
        clearTimeout(startTimeout);
        
        if (!startResponse.ok) {
          throw new Error(`Start request failed: ${startResponse.status} ${startResponse.statusText}`);
        }
        
        const result = await startResponse.json();
        debugLog('🔄 Start service response:', result);
        
        if (result.success) {
          debugLog('✅ Service start successful, verifying...');
          setAutoStartStatus('success');
          setRetryCount(0);
          
          // 🔄 Give service time to initialize with progress updates
          debugLog('⏳ Waiting for service initialization (2s)...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // 🔄 Load recent events to populate the UI
          debugLog('📥 Loading recent events...');
          await sse.refreshEvents();
          
          debugLog('✅ Auto-start sequence completed successfully');
        } else {
          throw new Error(result.message || result.error || 'Failed to start service - unknown error');
        }
        
      } catch (error: any) {
        const errorMessage = error.name === 'AbortError' 
          ? 'Request timeout - service may be unavailable'
          : error.message || 'Unknown error occurred';
          
        debugLog('❌ Auto-start error occurred', {
          error: errorMessage,
          errorType: error.name,
          errorStack: error.stack,
          retryCount,
          maxRetries,
          organizationId: organization.id,
          apiKeyLength: apiKey.length,
          debugInfo,
          timestamp: new Date().toISOString()
        }, 'error');
        
        setLastError(errorMessage);
        
        // 🔄 Enhanced retry logic with exponential backoff
        if (retryCount < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10s delay
          debugLog(`🔄 Scheduling retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms...`, {
            nextRetryIn: retryDelay,
            reason: errorMessage
          }, 'warn');
          
          setAutoStartStatus('retrying');
          setRetryCount(prev => prev + 1);
          
          setTimeout(() => {
            debugLog(`🔄 Executing retry ${retryCount + 2}/${maxRetries}...`);
            startBackgroundSSE();
          }, retryDelay);
        } else {
          debugLog('❌ Auto-start failed after maximum retries', {
            totalRetries: maxRetries,
            finalError: errorMessage,
            debugInfo,
            timestamp: new Date().toISOString()
          }, 'error');
          setAutoStartStatus('failed');
        }
      }
    };

    // 🔄 Reset retry count when dependencies change
    if (retryCount > 0) {
      debugLog('🔄 Dependencies changed, resetting retry count', {
        previousRetryCount: retryCount
      });
    }
    setRetryCount(0);
    setLastError(null);
    
    // 🚀 Start with a small delay to ensure components are mounted
    const timer = setTimeout(() => {
      debugLog('⏰ Auto-start timer triggered, beginning sequence...');
      startBackgroundSSE();
    }, 1000);
    
    return () => {
      debugLog('🧹 Cleaning up auto-start timer');
      clearTimeout(timer);
    };
  }, [organization, apiKey, sse, retryCount, debugLog, debugFetch, performHealthCheck, debugInfo]);

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
  // Core hooks
  const alarmKeypad = useAlarmKeypad();
  const auth = useAuthentication();
  const sse = useSSEContext();
  const weather = useWeather();
  const theme = useTheme();
  const systemHealth = useSystemHealth();
  const serviceWorker = useServiceWorker();

  // Local state for clock and mobile detection
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [requireApiKey, setRequireApiKey] = useState(false);
  const [debugMode, setDebugMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('fusion_debug_mode') === 'true';
    }
    return false;
  });

  // Extract header props
  const locationName = alarmKeypad.selectedLocation?.name;
  const postalCode = alarmKeypad.selectedLocation?.addressPostalCode;
  const organizationName = alarmKeypad.organization?.name;

  // Initialize on mount
  useEffect(() => {
    setIsClient(true);
    analytics.trackPageView('main-keypad');

    if (!FUSION_API_KEY) {
      alarmKeypad.setError('Fusion API key is not set. Please add NEXT_PUBLIC_FUSION_API_KEY to your .env file.');
      return;
    }
    alarmKeypad.setApiKey(FUSION_API_KEY);
    // Store API key in localStorage for apiFetch to use
    localStorage.setItem('fusion_api_key', FUSION_API_KEY);

    const savedLocation = localStorage.getItem('fusion_selected_location');
    const initialLoad = async () => {
      try {
        alarmKeypad.setLoading(true);
        await alarmKeypad.loadOrganizationAndLocations(savedLocation);
        
        // Wait for areas to be loaded before continuing
        if (alarmKeypad.selectedLocation) {
          // Give a small delay to ensure areas are loaded from the previous call
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Load weather data if we have the required info and API key
          if (alarmKeypad.selectedLocation.addressPostalCode && process.env.NEXT_PUBLIC_WEATHER_API_KEY) {
            await weather.fetchWeatherData(alarmKeypad.selectedLocation.addressPostalCode);
          }
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
      setIsMobile(isMobileDevice());
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

  // Show authenticated dashboard
  if (auth.isAuthenticated) {
    return (
      <div className="w-full h-full bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Welcome, {auth.authenticatedUser}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {alarmKeypad.selectedLocation?.name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Spaces & Alarm Zones */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Security Overview</h3>
              <div className="space-y-3">
                {/* Alarm Zones Section */}
                {((alarmKeypad.alarmZones && alarmKeypad.alarmZones.length > 0) || debugMode) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Alarm Zones ({alarmKeypad.alarmZones?.filter(z => z.isActive).length || 0})
                      {debugMode && (
                        <span className="text-xs text-red-500 ml-2">
                          [Debug: Total {alarmKeypad.alarmZones?.length || 0} zones]
                        </span>
                      )}
                    </h4>
                    <div className="space-y-2">
                      {alarmKeypad.alarmZones?.filter(zone => zone.isActive).map((zone) => (
                        <div
                          key={zone.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                          onClick={() => {
                            console.log('Zone clicked:', zone);
                            // TODO: Add zone toggle functionality
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {zone.name}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {zone.devices?.length || 0} device{(zone.devices?.length || 0) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              zone.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-green-500'
                            }`} />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {zone.armedState || 'DISARMED'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Spaces Section */}
                {alarmKeypad.alarmZones && alarmKeypad.alarmZones.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Spaces ({alarmKeypad.spaces?.length || 0})</h4>
                    <div className="space-y-2">
                      {alarmKeypad.alarmZones.map((zone) => (
                        <div
                          key={zone.id}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{zone.name}</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            zone.armedState !== 'DISARMED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {zone.armedState}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">System Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: systemHealth.getSystemStatusColor() }}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {systemHealth.systemStatus}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Connectivity</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {systemHealth.getConnectivityStatusText()}
                  </span>
                </div>
              </div>
            </div>

            {/* Weather */}
            {weather.weather && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Weather</h3>
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather.weather.icon}.png`} 
                    alt={weather.weather.condition}
                    className="w-8 h-8"
                  />
                  <div>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {weather.weather.temp}°F
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {weather.weather.condition}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show PIN entry interface
  return (
    <div className="w-full h-full relative">
      {/* SSE Connection Manager */}
      <SSEConnectionManager 
        organization={alarmKeypad.organization} 
        apiKey={alarmKeypad.apiKey} 
      />
      

      {/* Live Events Ticker */}
      <LiveEventsTicker
        showLiveEvents={sse.showLiveEvents}
        recentEvents={sse.recentEvents}
        debugMode={debugMode}
        cameras={alarmKeypad.cameras}
        spaces={alarmKeypad.spaces}
        eventFilterSettings={alarmKeypad.eventFilterSettings}
      />
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
      ) : isMobile ? (
        <MobileLayout
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          currentTime={currentTime}
          currentDate={currentDate}
          selectedLocation={alarmKeypad.selectedLocation}
          showSeconds={alarmKeypad.showSeconds}
          spaces={alarmKeypad.spaces}
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
          areas={alarmKeypad.alarmZones}
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
      )}
      
      {/* Settings Modal */}
      <SettingsModal 
        open={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)}
        apiKey={alarmKeypad.apiKey}
        onApiKeyUpdate={alarmKeypad.setApiKey}
        weather={weather.weather}
        selectedLocation={alarmKeypad.selectedLocation}
        organization={alarmKeypad.organization}
        showZonesPreview={alarmKeypad.showZonesPreview}
        onShowZonesPreviewChange={alarmKeypad.setShowZonesPreview}
        showSeconds={alarmKeypad.showSeconds}
        onShowSecondsChange={alarmKeypad.setShowSeconds}
        highlightPinButtons={alarmKeypad.highlightPinButtons}
        onHighlightPinButtonsChange={alarmKeypad.setHighlightPinButtons}
        sseEnabled={sse.sseEnabled}
        onSSEEnabledChange={sse.setSSEEnabled}
        sseConnected={sse.sseConnected}
        lastSSEEvent={sse.lastSSEEvent}
        showLiveEvents={sse.showLiveEvents}
        onShowLiveEventsChange={sse.setShowLiveEvents}
        debugMode={debugMode}
        onDebugModeChange={handleDebugModeChange}
        eventFilterSettings={alarmKeypad.eventFilterSettings}
        onEventFilterSettingsChange={alarmKeypad.updateEventFilterSettings}
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