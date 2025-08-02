import React, { useState } from 'react';
import Header from '../Header';
import { WeatherWidget } from '../ui/WeatherWidget';
import { ZoneDevicesModal } from '../ui/ZoneDevicesModal';
import { Area, Device, Space, ZoneWithDevices } from '@/lib/api';
import { getWeatherStyle } from '@/lib/alarmKeypadUtils';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface VisionProLayoutProps {
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
  temperatureUnit?: 'celsius' | 'fahrenheit';
  getDisplayTemperature?: (temp: number) => number;
  getTemperatureUnit?: () => string;
  
  // Zone props
  spaces: Space[];
  devices: Device[];
  getZonesWithDevices: () => any[];
  
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

export function VisionProLayout({
  locationName,
  postalCode,
  organizationName,
  isMobile,
  currentTime,
  currentDate,
  selectedLocation,
  showSeconds,
  weather,
  temperatureUnit,
  getDisplayTemperature,
  getTemperatureUnit,
  spaces,
  devices,
  getZonesWithDevices,
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
}: VisionProLayoutProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneWithDevices | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleZoneClick = (zone: any) => {
    console.log('🔍 [VisionProLayout] Zone clicked:', zone.name);
    setSelectedZone(zone);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedZone(null);
  };

  if (isMobile) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden flex flex-col">
        {/* Header with logo */}
        <Header 
          locationName={locationName}
          postalCode={postalCode}
          organizationName={organizationName}
          weather={weather}
          temperatureUnit={temperatureUnit}
          getDisplayTemperature={getDisplayTemperature}
          getTemperatureUnit={getTemperatureUnit}
          onSettingsClick={onSettingsClick}
        />
        {/* Floating ambient background layers - Full coverage */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/4 to-transparent"></div>
        
        {/* Centered Clock & Date at Top - Ultra Glass */}
        <div className="flex-shrink-0 text-center py-8 px-4 relative">
          <div className="backdrop-blur-3xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden max-w-sm mx-auto">
            {/* Glass layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-tr from-gray-900/10 via-transparent to-gray-800/10 rounded-2xl"></div>
            
            <div className="relative">
              <div className="text-sm text-white/70 mb-1 font-medium tracking-wide">{currentDate}</div>
              <div className="text-4xl font-ultra-thin text-white mb-4 tracking-tight">{currentTime}</div>
              {/* Weather */}
              {weather && (
                <WeatherWidget 
                  weather={weather} 
                  variant="vision-pro" 
                  className="mb-2"
                  temperatureUnit={temperatureUnit}
                  getDisplayTemperature={getDisplayTemperature}
                  getTemperatureUnit={getTemperatureUnit}
                />
              )}
            </div>
          </div>
        </div>

        {/* Floating Zone Status Cards - View Only */}
        {spaces.length > 0 && (
          <div className="flex-shrink-0 px-4 mb-6">
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {getZonesWithDevices().filter(zone => zone.totalCount > 0).slice(0, 3).map((zone: any, index: number) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneClick(zone)}
                  className="backdrop-blur-3xl bg-white/5 border border-white/10 rounded-xl p-3 shadow-xl relative overflow-hidden hover:bg-white/10 transition-all cursor-pointer w-full text-left"
                >
                  {/* Glass overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent rounded-xl"></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div 
                            className="w-2 h-2 rounded-full shadow-lg border border-white/20"
                            style={{ backgroundColor: zone.color, boxShadow: `0 0 10px ${zone.color}40` }}
                          />
                          {zone.armedCount > 0 && (
                            <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                            </svg>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white/90">{zone.name}</h4>
                          <p className="text-xs text-white/60">
                            {zone.armedState !== 'DISARMED' ? 'Armed' : 'Disarmed'}
                          </p>
                        </div>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${zone.armedCount > 0 ? 'bg-red-400 animate-pulse shadow-red-400/50' : 'bg-green-400 shadow-green-400/50'}`} />
                    </div>
                    
                    {/* Show first space only for mobile */}
                    {zone.devices.slice(0, 3).map((device: Device) => {
                      const space = spaces.find(s => s.id === device.spaceId);
                      return (
                        <div key={device.id} className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-lg p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium text-white/80 truncate">{device.name}</span>
                              {device.armedState !== 'DISARMED' && (
                                <svg className="w-2.5 h-2.5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                                </svg>
                              )}
                            </div>
                            <div className={`w-1 h-1 rounded-full ${device.armedState !== 'DISARMED' ? 'bg-red-400' : 'bg-green-400'}`} />
                          </div>
                          {space && (
                            <div className="mt-1 text-xs text-white/50 truncate">
                              {space.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {zone.devices.length > 3 && (
                      <div className="text-center mt-2">
                        <span className="text-xs text-white/40 italic">
                          +{zone.devices.length - 3} more devices
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Floating PIN Entry */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-8">
          <div className="max-w-xs w-full mx-auto">
            <div className="backdrop-blur-3xl bg-white/8 border border-white/15 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              {/* Glass layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl"></div>
              
              <div className="relative">
                {/* PIN Display */}
                <div className="mb-6">
                  <div className="flex justify-center gap-3">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full border transition-all duration-300 ${
                          pin[i] 
                            ? 'bg-white border-white shadow-lg shadow-white/30' 
                            : 'bg-transparent border-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 backdrop-blur-2xl bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-center shadow-lg">
                    <p className="font-medium text-sm">Authentication Failed</p>
                    <p className="text-xs opacity-80">Please try again</p>
                  </div>
                )}

                {/* Vision Pro Style PIN Pad */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => onPinKeyPress(num.toString())}
                      disabled={isProcessing}
                      className="h-14 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={onClear}
                    disabled={isProcessing}
                    className="h-14 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-xs text-white/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => onPinKeyPress('0')}
                    disabled={isProcessing}
                    className="h-14 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                  >
                    0
                  </button>
                  <button
                    onClick={onBackspace}
                    disabled={isProcessing}
                    className="h-14 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-base text-white/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                  >
                    ←
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 backdrop-blur-3xl bg-black/60 flex items-center justify-center z-50">
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center shadow-2xl">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-white/30 border-t-white mx-auto mb-3"></div>
              <p className="text-base font-semibold text-white">Authenticating...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop Apple Vision Pro Layout
  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 overflow-hidden flex flex-col">
      {/* Header with logo */}
      <Header 
        locationName={locationName}
        postalCode={postalCode}
        organizationName={organizationName}
        weather={weather}
        temperatureUnit={temperatureUnit}
        getDisplayTemperature={getDisplayTemperature}
        getTemperatureUnit={getTemperatureUnit}
        onSettingsClick={onSettingsClick}
      />
      {/* Floating ambient background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/4 to-transparent"></div>
      
      {/* Centered Clock & Date at Top - Ultra Glass */}
      <div className="flex-shrink-0 text-center py-12 px-8 relative">
        <div className="backdrop-blur-3xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden max-w-lg mx-auto">
          {/* Glass layers */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-white/5 rounded-3xl"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/10 via-transparent to-purple-400/10 rounded-3xl"></div>
          
          <div className="relative">
            <div className="text-xl text-white/70 mb-2 font-medium tracking-wide">{currentDate}</div>
            <div className="text-8xl font-ultra-thin text-white mb-8 tracking-tight">{currentTime}</div>
            
            {/* Inline Weather */}
            {weather && (
              <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent rounded-2xl"></div>
                <div className="relative flex items-center justify-between text-white">
                  <div>
                    <div className="text-2xl font-light">{weather.temp}°</div>
                    <div className="text-sm opacity-80">{weather.condition}</div>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-2xl border border-white/20">
                    ☀️
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-7xl grid grid-cols-2 gap-16 items-center">
          {/* Left Side - Floating Zone Cards */}
          <div className="space-y-6">
            {getZonesWithDevices().filter(zone => zone.totalCount > 0).map((zone) => (
              <div
                key={zone.id}
                className="backdrop-blur-3xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden hover:shadow-3xl transition-all duration-300"
              >
                {/* Glass overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent rounded-2xl"></div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full shadow-lg border border-white/20"
                          style={{ backgroundColor: zone.color, boxShadow: `0 0 15px ${zone.color}40` }}
                        />
                        {zone.armedCount > 0 && (
                          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white/90">{zone.name}</h3>
                        <p className="text-sm text-white/60">
                          {zone.totalCount} device{zone.totalCount !== 1 ? 's' : ''} • {zone.armedState !== 'DISARMED' ? 'Armed' : 'Disarmed'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full shadow-lg ${zone.armedCount > 0 ? 'bg-red-400 animate-pulse shadow-red-400/50' : 'bg-green-400 shadow-green-400/50'}`} />
                  </div>
                  
                  {/* Zone Devices */}
                  <div className="space-y-2">
                    {zone.devices.slice(0, 5).map((device: Device) => {
                      const space = spaces.find(s => s.id === device.spaceId);
                      return (
                        <div
                          key={device.id}
                          className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/8 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white/80 truncate">{device.name}</span>
                              {device.armedState !== 'DISARMED' && (
                                <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                                </svg>
                              )}
                            </div>
                            <div className={`w-2 h-2 rounded-full ${device.armedState !== 'DISARMED' ? 'bg-red-400' : 'bg-green-400'}`} />
                          </div>
                          {space && (
                            <div className="mt-1 text-xs text-white/50 truncate">
                              Space: {space.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {zone.devices.length > 5 && (
                      <div className="p-2 text-center">
                        <span className="text-xs text-white/40 italic">
                          and {zone.devices.length - 5} more device{zone.devices.length - 5 !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Side - Floating PIN Entry */}
          <div className="flex items-center justify-center">
            <div className="backdrop-blur-3xl bg-white/8 border border-white/15 rounded-3xl p-10 shadow-2xl relative overflow-hidden">
              {/* Glass layers */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-3xl"></div>
              
              <div className="relative">
                {/* PIN Display */}
                <div className="mb-10">
                  <div className="flex justify-center gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                          pin[i] 
                            ? 'bg-white border-white shadow-lg shadow-white/30' 
                            : 'bg-transparent border-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <div className="p-4 backdrop-blur-2xl bg-red-500/20 border border-red-400/30 rounded-xl text-red-200 text-center shadow-lg">
                      <p className="font-medium">Authentication Failed</p>
                      <p className="text-sm opacity-80">Please try again</p>
                    </div>
                  </div>
                )}

                {/* Vision Pro Style PIN Pad */}
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => onPinKeyPress(num.toString())}
                      disabled={isProcessing}
                      className="py-6 px-8 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-2xl font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={onClear}
                    disabled={isProcessing}
                    className="py-6 px-8 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-sm text-white/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => onPinKeyPress('0')}
                    disabled={isProcessing}
                    className="py-6 px-8 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-2xl font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                  >
                    0
                  </button>
                  <button
                    onClick={onBackspace}
                    disabled={isProcessing}
                    className="py-6 px-8 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-xl text-xl text-white/70 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:bg-white/15 hover:border-white/30 hover:shadow-xl active:scale-95"
                  >
                    ←
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 backdrop-blur-3xl bg-black/60 flex items-center justify-center z-50">
          <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/30 border-t-white mx-auto mb-4"></div>
            <p className="text-lg font-semibold text-white">Authenticating...</p>
          </div>
        </div>
              )}

        {/* Zone Devices Modal */}
        <ZoneDevicesModal
          zone={selectedZone}
          spaces={spaces}
          isOpen={showModal}
          onClose={handleCloseModal}
        />
    </div>
  );
} 