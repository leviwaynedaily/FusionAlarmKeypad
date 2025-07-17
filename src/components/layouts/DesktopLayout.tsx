import React from 'react';
import Header from '../Header';
import { Clock } from '../ui/Clock';
import { ZoneStatus } from '../ui/ZoneStatus';
import { PinEntry } from '../ui/PinEntry';
import { ProcessingOverlay } from '../ui/ProcessingOverlay';
import { Area } from '@/lib/api';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface DesktopLayoutProps {
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
  areas: Area[];
  weather: WeatherData | null;
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
  // Optionally, latest event/activity
  lastEvent?: React.ReactNode;
}

export function DesktopLayout({
  locationName,
  postalCode,
  organizationName,
  currentTime,
  currentDate,
  selectedLocation,
  showSeconds,
  areas,
  weather,
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
  lastEvent,
}: DesktopLayoutProps) {
  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-[#0f0f0f]">
      {/* Header with logo */}
      <Header 
        locationName={locationName}
        postalCode={postalCode}
        organizationName={organizationName}
        onSettingsClick={onSettingsClick}
      />
      {/* Main content: two columns */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center max-w-screen-xl mx-auto w-full px-4 py-8 gap-8 bg-gray-100 dark:bg-[#0f0f0f]">
        {/* Left column: clock, date, zone status, areas, latest event */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto md:mx-0 md:items-start">
          <div className="mb-2 text-lg text-gray-500 dark:text-gray-400">{currentDate}</div>
          <div className="text-6xl md:text-7xl font-thin text-gray-900 dark:text-white mb-6">{currentTime}</div>
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Alarm Zones</div>
          <div className="space-y-2 w-full">
            {areas.length === 0 && (
              <div className="text-gray-400 text-sm">No alarm zones configured</div>
            )}
            {areas.map((area) => (
                              <div key={area.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg px-4 py-3 shadow border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-900 dark:text-white">{area.name}</span>
                </div>
                <span className={`text-sm font-semibold ${area.armedState !== 'DISARMED' ? 'text-rose-500' : 'text-green-500'}`}>{area.armedState}</span>
              </div>
            ))}
          </div>
          {/* Optionally, latest event/activity */}
          {lastEvent && (
            <div className="mt-4">{lastEvent}</div>
          )}
        </div>
        {/* Right column: PIN entry and keypad */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto md:mx-0">
                      <div className="w-full bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-xl border border-gray-100 dark:border-transparent p-8">
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
          <ProcessingOverlay isProcessing={isProcessing} />
        </div>
      </div>
    </div>
  );
} 