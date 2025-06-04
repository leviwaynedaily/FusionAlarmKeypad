'use client';

import { useEffect, useState } from 'react';
import { getWeather, WeatherData } from '@/lib/weather';

interface HeaderProps {
  locationName?: string;
  postalCode?: string;
  organizationName?: string;
}

export default function Header({ locationName, postalCode, organizationName }: HeaderProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!postalCode) return;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const data = await getWeather(postalCode);
        setWeather(data);
      } catch (err) {
        console.error('Error fetching weather:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, [postalCode]);

  return (
    <header className="bg-white dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-800 px-6 py-4">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 375 375" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#22c55f]">
            <g fill="currentColor">
              <path d="M35.32 25.422h124.578c7.457 0 13.5 6.043 13.5 13.5v158.894c0 7.457-6.043 13.5-13.5 13.5H35.32c-7.457 0-13.5-6.043-13.5-13.5V38.922c0-7.457 6.043-13.5 13.5-13.5ZM35.32 242.773h124.578a13.503 13.503 0 0 1 13.5 13.5v82.387c0 7.453-6.043 13.5-13.5 13.5H35.32a13.503 13.503 0 0 1-13.5-13.5v-82.387c0-7.453 6.043-13.5 13.5-13.5ZM218.844 25.422h124.574a13.5 13.5 0 0 1 13.5 13.5v82.348c0 7.457-6.043 13.5-13.5 13.5H218.844a13.5 13.5 0 0 1-13.5-13.5V38.922c0-7.457 6.043-13.5 13.5-13.5ZM218.844 163.672h124.574a13.51 13.51 0 0 1 9.547 3.957 13.497 13.497 0 0 1 3.953 9.543v158.926c0 7.457-6.043 13.5-13.5 13.5H218.844a13.5 13.5 0 0 1-13.5-13.5V177.172c0-7.453 6.043-13.5 13.5-13.5Z" />
            </g>
          </svg>
          <div>
            <h1 className="text-xl text-gray-900 dark:text-white" style={{ fontFamily: 'CSG, sans-serif', letterSpacing: '0.05em' }}>FUSION</h1>
            {organizationName && (
              <p className="text-xs text-gray-600 dark:text-gray-400">{organizationName}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {locationName && (
            <div className="flex items-center gap-3">
              <span className="text-base font-medium text-gray-700 dark:text-gray-300">{locationName}</span>
              {postalCode && weather && !loading && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <img 
                    src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
                    alt={weather.condition}
                    className="w-8 h-8"
                  />
                  <span className="font-medium">{weather.temperature}°F</span>
                  <span className="text-xs">{weather.condition}</span>
                </div>
              )}
              {postalCode && loading && (
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 