import React from 'react';
import Header from '../Header';
import { Clock } from '../ui/Clock';
import { ZoneStatus } from '../ui/ZoneStatus';
import { PinEntry } from '../ui/PinEntry';
import { ProcessingOverlay } from '../ui/ProcessingOverlay';
import { Area, Space, AlarmZone, ZoneWithDevices } from '@/lib/api';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface MobileLayoutProps {
  // Header props
  locationName?: string;
  postalCode?: string;
  organizationName?: string;
  // Clock props
  currentTime: string;
  currentDate: string;
  selectedLocation?: any;
  showSeconds: boolean;
  
  // Zone status props
  spaces: Space[];
  alarmZones: AlarmZone[];
  getZonesWithDevices: () => ZoneWithDevices[];
  weather: WeatherData | null;
  temperatureUnit?: 'celsius' | 'fahrenheit';
  getDisplayTemperature?: (temp: number) => number;
  getTemperatureUnit?: () => string;
  useDesign2: boolean;
  showZonesPreview: boolean;
  
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

export function MobileLayout({
  locationName,
  postalCode,
  organizationName,
  currentTime,
  currentDate,
  selectedLocation,
  showSeconds,
  spaces,
  alarmZones,
  getZonesWithDevices,
  weather,
  temperatureUnit,
  getDisplayTemperature,
  getTemperatureUnit,
  useDesign2,
  showZonesPreview,
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
}: MobileLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col relative">
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
      {/* Mobile Header with Time */}
      <Clock 
        currentTime={currentTime}
        currentDate={currentDate}
        selectedLocation={selectedLocation}
        showSeconds={showSeconds}
      />

      {/* Zone Status Summary - Compact view */}
      <ZoneStatus 
        spaces={spaces}
        alarmZones={alarmZones}
        getZonesWithDevices={getZonesWithDevices}
        weather={weather}
        useDesign2={useDesign2}
        showZonesPreview={showZonesPreview}
      />

      {/* PIN Entry Section - Takes remaining space */}
      <div className="flex-1 flex flex-col justify-center px-4 pb-8">
        <PinEntry
          pin={pin}
          isProcessing={isProcessing}
          error={error}
          useDesign2={useDesign2}
          highlightPinButtons={highlightPinButtons}
          pressedButton={pressedButton}
          onPinKeyPress={onPinKeyPress}
          onClear={onClear}
          onBackspace={onBackspace}
          onPressedButtonChange={onPressedButtonChange}
        />
      </div>

      {/* Processing Overlay */}
      <ProcessingOverlay isProcessing={isProcessing} />
    </div>
  );
} 