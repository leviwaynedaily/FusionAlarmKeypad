import React from 'react';
import Header from '../Header';
import { WeatherWidget } from '../ui/WeatherWidget';
import { Area, Device } from '@/lib/api';
import { AlarmZone } from '@/hooks/useAlarmKeypad';
import { getWeatherStyle } from '@/lib/alarmKeypadUtils';
import { ProcessingOverlay } from '../ui/ProcessingOverlay';
import { PinEntry } from '../ui/PinEntry';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface TestDesignLayoutProps {
  // Header props
  locationName?: string;
  postalCode?: string;
  organizationName?: string;
  
  // Layout props
  isMobile: boolean;
  
  // Clock props
  currentTime: string;
  currentDate: string;
  selectedLocation?: any;
  showSeconds: boolean;
  
  // Weather props
  weather: WeatherData | null;
  
  // Zone props
  areas: Area[];
  devices: Device[];
  showZonesPreview: boolean;
  getZonesWithAreas: () => any[];
  
  // PIN entry props
  pin: string;
  isProcessing: boolean;
  error: string;
  highlightPinButtons: boolean;
  pressedButton: string | null;
  onPinKeyPress: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onPressedButtonChange: (button: string | null) => void;
  onSettingsClick: () => void;
}

export function TestDesignLayout({
  locationName,
  postalCode,
  organizationName,
  isMobile,
  currentTime,
  currentDate,
  selectedLocation,
  showSeconds,
  weather,
  areas,
  devices,
  showZonesPreview,
  getZonesWithAreas,
  pin,
  isProcessing,
  error,
  highlightPinButtons,
  pressedButton,
  onPinKeyPress,
  onClear,
  onBackspace,
  onPressedButtonChange,
  onSettingsClick,
}: TestDesignLayoutProps) {
  if (isMobile) {
    return (
      <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
        {/* Header with logo */}
        <Header 
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          onSettingsClick={onSettingsClick}
        />
        {/* Centered Clock & Date at Top */}
        <div className="flex-shrink-0 text-center py-8 px-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{currentDate}</div>
          <div className="text-5xl font-thin text-gray-900 dark:text-white mb-4">{currentTime}</div>
          
          {/* Weather */}
          {weather && (
            <div className="max-w-xs mx-auto mb-6">
              <WeatherWidget weather={weather} variant="iphone" />
            </div>
          )}
        </div>

        {/* Alarm Zones Preview */}
        {showZonesPreview && areas.length > 0 && (
          <div className="flex-shrink-0 px-4 mb-6">
            <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white mb-4">Security Zones</h3>
            <div className="space-y-3">
              {getZonesWithAreas().filter(zone => zone.totalCount > 0).map((zone: any) => (
                <div
                  key={zone.id}
                  className="bg-white dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{zone.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {zone.armedCount > 0 ? `${zone.armedCount}/${zone.totalCount} Armed` : 'All Clear'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${zone.armedCount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-green-500'}`} />
                  </div>
                  
                  {/* Show first 2 areas on mobile */}
                  <div className="space-y-1">
                    {zone.areaObjects.slice(0, 2).map((area: Area) => {
                      const areaDevices = devices.filter(device => device.areaId === area.id);
                      return (
                        <div key={area.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{area.name}</span>
                            <div className={`w-1.5 h-1.5 rounded-full ${area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-green-500'}`} />
                          </div>
                          {areaDevices.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                              {areaDevices.slice(0, 2).map(device => device.name).join(', ')}
                              {areaDevices.length > 2 && ` +${areaDevices.length - 2}`}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {zone.areaObjects.length > 2 && (
                      <div className="text-center py-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                          +{zone.areaObjects.length - 2} more
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIN Entry */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-8">
          <div className="max-w-xs w-full mx-auto">
            {/* PIN Display */}
            <div className="mb-8">
              <div className="flex justify-center gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      pin[i] 
                        ? 'bg-[#22c55f] border-[#22c55f] shadow-lg' 
                        : 'bg-transparent border-gray-400 dark:border-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-rose-500/90 rounded-xl text-white text-center backdrop-blur-sm shadow-lg">
                <p className="font-medium text-sm">Authentication Failed</p>
                <p className="text-xs opacity-90">Please try again</p>
              </div>
            )}

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => onPinKeyPress(num.toString())}
                  onTouchStart={() => highlightPinButtons && onPressedButtonChange(num.toString())}
                  onTouchEnd={() => onPressedButtonChange(null)}
                  disabled={isProcessing}
                  className={`h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                    highlightPinButtons && pressedButton === num.toString()
                      ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={onClear}
                onTouchStart={() => highlightPinButtons && onPressedButtonChange('clear')}
                onTouchEnd={() => onPressedButtonChange(null)}
                disabled={isProcessing}
                className={`h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                  highlightPinButtons && pressedButton === 'clear'
                    ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Clear
              </button>
              <button
                onClick={() => onPinKeyPress('0')}
                onTouchStart={() => highlightPinButtons && onPressedButtonChange('0')}
                onTouchEnd={() => onPressedButtonChange(null)}
                disabled={isProcessing}
                className={`h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                  highlightPinButtons && pressedButton === '0'
                    ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                0
              </button>
              <button
                onClick={onBackspace}
                onTouchStart={() => highlightPinButtons && onPressedButtonChange('backspace')}
                onTouchEnd={() => onPressedButtonChange(null)}
                disabled={isProcessing}
                className={`h-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                  highlightPinButtons && pressedButton === 'backspace'
                    ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                ←
              </button>
            </div>
          </div>
        </div>

        {/* Processing Overlay */}
        <ProcessingOverlay isProcessing={isProcessing} />
      </div>
    );
  }

  // Desktop Test Design Layout
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header with logo */}
      <Header 
        locationName={locationName}
        postalCode={postalCode}
        organizationName={organizationName}
        onSettingsClick={onSettingsClick}
      />
      {/* Centered Clock, Date & Weather at Top */}
      <div className="flex-shrink-0 text-center py-12 px-8">
        <div className="text-xl text-gray-600 dark:text-gray-400 mb-2">{currentDate}</div>
        <div className="text-8xl font-thin text-gray-900 dark:text-white mb-8">{currentTime}</div>
        
        {/* Weather */}
        {weather && (
          <div className="max-w-sm mx-auto mb-8">
            <WeatherWidget weather={weather} variant="compact" />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-6xl grid grid-cols-2 gap-12 items-center">
          {/* Left Side - Alarm Zones */}
          <div className="space-y-4">
            {getZonesWithAreas().filter(zone => zone.totalCount > 0).length > 0 ? (
              <div className="space-y-4">
                {getZonesWithAreas().filter(zone => zone.totalCount > 0).map((zone) => (
                  <div
                    key={zone.id}
                    className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full shadow-md"
                            style={{ backgroundColor: zone.color }}
                          />
                          {zone.armedCount > 0 && (
                            <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{zone.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {zone.totalCount} area{zone.totalCount !== 1 ? 's' : ''} • {zone.armedCount > 0 ? `${zone.armedCount} armed` : 'All clear'}
                          </p>
                        </div>
                      </div>
                      {/* Status Indicator - View Only */}
                      <div className={`w-4 h-4 rounded-full shadow-lg ${
                        zone.armedCount > 0 ? 'bg-rose-500' : 'bg-green-500'
                      }`} />
                    </div>
                    
                    {/* Zone Areas */}
                    <div className="space-y-2">
                      {zone.areaObjects.slice(0, 5).map((area: Area) => {
                        const areaDevices = devices.filter(device => device.areaId === area.id);
                        return (
                          <div
                            key={area.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{area.name}</span>
                                  {area.armedState !== 'DISARMED' && (
                                    <svg className="w-3 h-3 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                                    </svg>
                                  )}
                                </div>
                                <div className={`w-2 h-2 rounded-full ml-2 ${area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-green-500'}`} />
                              </div>
                              {areaDevices.length > 0 && (
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {areaDevices.slice(0, 3).map(device => device.name).join(', ')}
                                  {areaDevices.length > 3 && ` +${areaDevices.length - 3} more`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show "and X more" if there are more than 5 areas */}
                      {zone.areaObjects.length > 5 && (
                        <div className="p-2 text-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                            and {zone.areaObjects.length - 5} more area{zone.areaObjects.length - 5 !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">No zones configured</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Areas will be automatically organized into zones</p>
              </div>
            )}
          </div>

          {/* Right Side - PIN Entry */}
          <div className="flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800/50 rounded-3xl p-10 shadow-2xl border border-gray-200 dark:border-gray-700 backdrop-blur-sm relative h-full">
              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-white/90 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-3xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22c55f] mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Authenticating...</p>
                  </div>
                </div>
              )}

              <div className="relative">
                {/* PIN Display */}
                <div className="mb-10">
                  <div className="flex justify-center gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border-2 transition-all ${
                          pin[i] 
                            ? 'bg-[#22c55f] border-[#22c55f] shadow-lg' 
                            : 'bg-transparent border-gray-400 dark:border-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="p-4 bg-rose-500/90 rounded-xl text-white text-center backdrop-blur-sm shadow-lg">
                      <p className="font-medium">Authentication Failed</p>
                      <p className="text-sm opacity-90">Please try again</p>
                    </div>
                  </div>
                )}

                {/* PIN Pad */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => onPinKeyPress(num.toString())}
                      onMouseDown={() => highlightPinButtons && onPressedButtonChange(num.toString())}
                      onMouseUp={() => onPressedButtonChange(null)}
                      onMouseLeave={() => onPressedButtonChange(null)}
                      disabled={isProcessing}
                      className={`py-6 px-8 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                        highlightPinButtons && pressedButton === num.toString()
                          ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                          : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600/50'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={onClear}
                    onMouseDown={() => highlightPinButtons && onPressedButtonChange('clear')}
                    onMouseUp={() => onPressedButtonChange(null)}
                    onMouseLeave={() => onPressedButtonChange(null)}
                    disabled={isProcessing}
                    className={`py-6 px-8 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                      highlightPinButtons && pressedButton === 'clear'
                        ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => onPinKeyPress('0')}
                    onMouseDown={() => highlightPinButtons && onPressedButtonChange('0')}
                    onMouseUp={() => onPressedButtonChange(null)}
                    onMouseLeave={() => onPressedButtonChange(null)}
                    disabled={isProcessing}
                    className={`py-6 px-8 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                      highlightPinButtons && pressedButton === '0'
                        ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                        : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    0
                  </button>
                  <button
                    onClick={onBackspace}
                    onMouseDown={() => highlightPinButtons && onPressedButtonChange('backspace')}
                    onMouseUp={() => onPressedButtonChange(null)}
                    onMouseLeave={() => onPressedButtonChange(null)}
                    disabled={isProcessing}
                    className={`py-6 px-8 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md ${
                      highlightPinButtons && pressedButton === 'backspace'
                        ? 'bg-[#22c55f] text-white transform scale-95 shadow-lg'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600/50'
                    }`}
                  >
                    ←
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 