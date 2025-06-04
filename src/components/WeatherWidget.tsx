'use client';

import { useEffect, useState } from 'react';
import { getWeather, WeatherData } from '@/lib/weather';

interface WeatherWidgetProps {
  postalCode: string;
}

export default function WeatherWidget({ postalCode }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const data = await getWeather(postalCode);
        if (!data) {
          setError('Failed to fetch weather data');
          return;
        }
        setWeather(data);
      } catch (err) {
        setError('An error occurred while fetching weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Update every 5 minutes

    return () => clearInterval(interval);
  }, [postalCode]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <p className="text-red-500 text-sm">{error || 'Weather data unavailable'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Current Weather</h3>
          <p className="text-3xl font-bold text-gray-900">{weather.temperature}°F</p>
          <p className="text-gray-600">{weather.condition}</p>
        </div>
        {weather.icon && (
          <img
            src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
            alt={weather.condition}
            className="w-16 h-16"
          />
        )}
      </div>
    </div>
  );
} 