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
      {/* Main content: two columns with maximum compaction */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch justify-center max-w-screen-xl mx-auto w-full px-1 sm:px-2 py-1 sm:py-2 md:py-4 gap-2 sm:gap-3 md:gap-4 bg-gray-100 dark:bg-[#0f0f0f]">
        {/* Left column: clock, date, zone status, areas, latest event - Tablet optimized */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto md:mx-0 md:items-start">
          <div className="text-gray-500 dark:text-gray-400" 
            style={{ 
              fontSize: 'clamp(0.75rem, 2vw, 1.125rem)',
              marginBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)'
            }}>{currentDate}</div>
          <div className="font-thin text-gray-900 dark:text-white" 
            style={{ 
              fontSize: 'clamp(2rem, 6vw, 4rem)',
              marginBottom: 'clamp(0.25rem, 1vw, 1rem)'
            }}>{currentTime}</div>
          <div className="font-semibold text-gray-800 dark:text-gray-200" 
            style={{ 
              fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)',
              marginBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)'
            }}>Alarm Zones</div>
          <div className="w-full" style={{ gap: 'clamp(0.25rem, 0.75vw, 0.75rem)', display: 'flex', flexDirection: 'column' }}>
            {areas.length === 0 && (
              <div className="text-gray-400 text-xs">No alarm zones configured</div>
            )}
            {areas.map((area) => (
                              <div key={area.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-md shadow border border-gray-100 dark:border-gray-700"
                style={{
                  padding: 'clamp(0.375rem, 1vw, 0.75rem) clamp(0.5rem, 1.5vw, 1rem)'
                }}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white" style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>{area.name}</span>
                </div>
                <span className={`font-semibold ${area.armedState !== 'DISARMED' ? 'text-rose-500' : 'text-green-500'}`} style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>{area.armedState}</span>
              </div>
            ))}
          </div>
          {/* Optionally, latest event/activity */}
          {lastEvent && (
            <div className="mt-4">{lastEvent}</div>
          )}
        </div>
        {/* Right column: PIN entry and keypad - Tablet optimized */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto md:mx-0">
                      <div className="w-full bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-xl border border-gray-100 dark:border-transparent p-2 sm:p-3 md:p-4">
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