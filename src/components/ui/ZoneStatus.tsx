import React from 'react';
import { Area, Space, AlarmZone, ZoneWithDevices } from '@/lib/api';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface ZoneStatusProps {
  spaces: Space[];
  alarmZones: AlarmZone[];
  getZonesWithDevices: () => ZoneWithDevices[];
  weather: WeatherData | null;
  useDesign2: boolean;
  showZonesPreview: boolean;
}

export function ZoneStatus({ 
  spaces, 
  alarmZones,
  getZonesWithDevices,
  weather, 
  useDesign2, 
  showZonesPreview 
}: ZoneStatusProps) {
  if (!showZonesPreview) {
    return null;
  }

  // Get zones with device data
  const zonesWithDevices = getZonesWithDevices();
  const activeZones = zonesWithDevices.filter(zone => zone.totalCount > 0);
  const armedZonesCount = activeZones.filter(zone => zone.armedCount > 0).length;

  // Return early if no active zones
  if (activeZones.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0 px-4 mb-4">
      {/* Header with weather or title */}
      {useDesign2 && weather && (
        <div className="flex items-center gap-2 mb-3">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
            alt={weather.condition}
            className="w-5 h-5"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {weather.temp}°F
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {weather.condition}
          </span>
        </div>
      )}
      
      {/* Alarm Zones */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alarm Zones
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {activeZones.length} Zone{activeZones.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {activeZones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between bg-white dark:bg-gray-800/50 rounded-lg p-2 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: zone.color }}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {zone.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {zone.totalCount} device{zone.totalCount !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {zone.armedCount > 0 && (
                <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                </svg>
              )}
              <span className={`text-xs font-medium ${zone.armedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {zone.armedCount > 0 ? `${zone.armedCount} Armed` : 'All Clear'}
              </span>
              <div className={`w-2 h-2 rounded-full ${zone.armedCount > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 