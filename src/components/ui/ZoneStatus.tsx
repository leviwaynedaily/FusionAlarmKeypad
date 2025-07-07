import React from 'react';
import { Area } from '@/lib/api';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface ZoneStatusProps {
  areas: Area[];
  weather: WeatherData | null;
  useDesign2: boolean;
  showZonesPreview: boolean;
}

export function ZoneStatus({ 
  areas, 
  weather, 
  useDesign2, 
  showZonesPreview 
}: ZoneStatusProps) {
  if (!showZonesPreview || areas.length === 0) {
    return null;
  }

  const armedAreasCount = areas.filter(a => a.armedState !== 'DISARMED').length;

  return (
    <div className="flex-shrink-0 px-4 mb-4">
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3">
        <div className="flex items-center justify-between">
          {useDesign2 && weather ? (
            <div className="flex items-center gap-2">
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
          ) : !useDesign2 ? (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zone Status
            </span>
          ) : null}
          
          <div className="flex items-center gap-2">
            {armedAreasCount > 0 ? (
              <>
                <span className="text-xs text-rose-600 dark:text-rose-400">
                  {armedAreasCount} Armed
                </span>
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></div>
              </>
            ) : (
              <>
                <span className="text-xs text-[#22c55f]">All Clear</span>
                <div className="w-2 h-2 bg-[#22c55f] rounded-full"></div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 