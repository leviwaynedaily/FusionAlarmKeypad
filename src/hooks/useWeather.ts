import { useState, useEffect, useRef, useCallback } from 'react';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

// Use environment variable for weather API key
const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('fahrenheit');
  const [currentPostalCode, setCurrentPostalCode] = useState<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Temperature conversion utilities
  const convertTemperature = (temp: number, fromUnit: 'celsius' | 'fahrenheit', toUnit: 'celsius' | 'fahrenheit'): number => {
    if (fromUnit === toUnit) return temp;
    if (fromUnit === 'fahrenheit' && toUnit === 'celsius') {
      return (temp - 32) * 5/9;
    }
    if (fromUnit === 'celsius' && toUnit === 'fahrenheit') {
      return (temp * 9/5) + 32;
    }
    return temp;
  };

  const getDisplayTemperature = (tempF: number): number => {
    if (temperatureUnit === 'celsius') {
      return Math.round(convertTemperature(tempF, 'fahrenheit', 'celsius'));
    }
    return Math.round(tempF);
  };

  const getTemperatureUnit = (): string => {
    return temperatureUnit === 'celsius' ? 'C' : 'F';
  };

  // Fetch weather data using environment variable
  const fetchWeatherData = useCallback(async (postalCode: string) => {
    if (!WEATHER_API_KEY) {
      console.warn('Weather API key not found. Set NEXT_PUBLIC_WEATHER_API_KEY environment variable.');
      return;
    }

    const startTime = performance.now();
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?zip=${postalCode},us&appid=${WEATHER_API_KEY}&units=imperial`
      );
      
      const duration = performance.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        const weatherData: WeatherData = {
          temp: Math.round(data.main.temp),
          condition: data.weather[0].main,
          icon: data.weather[0].icon
        };
        
        setWeather(weatherData);
        setCurrentPostalCode(postalCode); // Track current postal code for auto-refresh
        
        analytics.track({
          action: 'weather_update',
          category: 'integrations',
          label: 'success',
          value: Math.round(duration),
          properties: {
            location: postalCode,
            success: true,
            temperature: weatherData.temp,
            condition: weatherData.condition
          }
        });
        
        performanceMonitor.trackMetric({
          name: 'weather_fetch_duration',
          value: duration,
          rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor'
        });
      } else {
        throw new Error(`Weather API error: ${response.status}`);
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error('Weather fetch error:', error);
      
      analytics.track({
        action: 'weather_update',
        category: 'integrations',
        label: 'failure',
        value: Math.round(duration),
        properties: {
          location: postalCode,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }, [temperatureUnit]); // Dependencies for useCallback



  // Clear weather data
  const clearWeather = () => {
    setWeather(null);
    setCurrentPostalCode(null);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  // Auto-refresh weather every 10 minutes
  useEffect(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up new interval if we have a postal code
    if (currentPostalCode && WEATHER_API_KEY) {
      console.log('🌤️ Setting up weather auto-refresh for:', currentPostalCode);
      
      refreshIntervalRef.current = setInterval(() => {
        console.log('🌤️ Auto-refreshing weather data...');
        fetchWeatherData(currentPostalCode);
      }, 600000); // 10 minutes = 600,000ms
    }

    // Cleanup interval on unmount or postal code change
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [currentPostalCode, fetchWeatherData]); // Re-run when postal code or fetchWeatherData changes

  return {
    // State
    weather,
    temperatureUnit,

    // Actions
    fetchWeatherData,
    clearWeather,
    setTemperatureUnit,
    
    // Utilities
    getDisplayTemperature,
    getTemperatureUnit,
    convertTemperature,
  };
} 