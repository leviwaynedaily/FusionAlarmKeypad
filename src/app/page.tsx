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

import { useState, useEffect } from 'react';
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
  
  useEffect(() => {
    if (organization && apiKey) {
      sse.setupSSEConnection(organization.id, apiKey);
    }
  }, [organization, apiKey, sse]);

  return null; // This component doesn't render anything
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
            {/* Areas */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Areas</h3>
              <div className="space-y-2">
                {alarmKeypad.areas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {area.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-green-500'
                      }`} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {area.armedState}
                      </span>
                    </div>
                  </div>
                ))}
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
          areas={alarmKeypad.areas}
          devices={alarmKeypad.devices}
          getZonesWithAreas={alarmKeypad.getZonesWithAreas}
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
          areas={alarmKeypad.areas}
          devices={alarmKeypad.devices}
          showZonesPreview={alarmKeypad.showZonesPreview}
          getZonesWithAreas={alarmKeypad.getZonesWithAreas}
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
          areas={alarmKeypad.areas}
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
          areas={alarmKeypad.areas}
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
        areas={alarmKeypad.areas}
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