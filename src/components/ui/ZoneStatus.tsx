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
  // Always show alarm zones if they exist (ignore showZonesPreview for alarm zones)
  if (!alarmZones || alarmZones.length === 0) {
    return null;
  }

  // Get zones with device data
  const zonesWithDevices = getZonesWithDevices();
  
  // Show all alarm zones, even if they don't have devices loaded yet
  const displayZones = zonesWithDevices.length > 0 ? zonesWithDevices : 
    alarmZones.map(zone => ({
      ...zone,
      devices: [],
      armedCount: zone.armedState === 'DISARMED' ? 0 : 1, // Fallback for armed state
      totalCount: zone.deviceIds?.length || 0
    }));
  
  const armedZonesCount = displayZones.filter(zone => zone.armedCount > 0).length;

  return (
    <div className="flex-shrink-0 px-4 mb-1">
      {/* Weather Header (if enabled) */}
      {useDesign2 && weather && (
        <div className="flex items-center gap-2 mb-1">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
            alt={weather.condition}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {weather.temp}°F
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {weather.condition}
          </span>
        </div>
      )}
      
      {/* Micro-Compact Alarm Zones Section */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md px-2 py-1 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            Alarm Zones
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {displayZones.length}
          </span>
        </div>
        
        {displayZones.map((zone) => (
          <div
            key={zone.id}
            className="flex items-center justify-between bg-white dark:bg-gray-800/80 rounded-sm py-1 px-2"
          >
            <div className="flex items-center gap-1.5">
              <div 
                className={`w-2 h-2 rounded-full ${zone.armedCount > 0 ? 'bg-red-500' : 'bg-green-500'}`}
              />
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {zone.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {zone.armedCount > 0 && (
                <svg className="w-2.5 h-2.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4V8H16C17.1 8 18 8.9 18 10V20C18 21.1 17.1 22 16 22H8C6.9 22 6 21.1 6 20V10C6 8.9 6.9 8 8 8H10V4C10 2.9 10.9 2 12 2M12 4C11.4 4 11 4.4 11 5V8H13V5C13 4.4 12.6 4 12 4Z"/>
                </svg>
              )}
              <span className={`text-xs ${zone.armedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {zone.armedCount > 0 ? `Armed` : 'Clear'}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${zone.armedCount > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 