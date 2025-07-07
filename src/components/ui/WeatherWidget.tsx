import React from 'react';
import { getWeatherStyle } from '@/lib/alarmKeypadUtils';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface WeatherWidgetProps {
  weather: WeatherData;
  variant?: 'iphone' | 'vision-pro' | 'compact';
  className?: string;
}

export function WeatherWidget({ weather, variant = 'iphone', className = '' }: WeatherWidgetProps) {
  const style = getWeatherStyle(weather.condition);
  
  if (variant === 'vision-pro') {
    return (
      <div className={`backdrop-blur-2xl bg-white/5 border border-white/10 rounded-xl p-3 shadow-lg relative overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/8 to-transparent rounded-xl"></div>
        <div className="relative flex items-center justify-between text-white">
          <div>
            <div className="text-lg font-light">{weather.temp}°</div>
            <div className="text-xs opacity-80">{weather.condition}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-lg border border-white/20">
            {style.icon}
          </div>
        </div>
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
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
    );
  }
  
  // Default iPhone style
  return (
    <div className={`${style.bg} rounded-2xl p-4 shadow-lg relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
      <div className="relative flex items-center justify-between text-white">
        <div>
          <div className="text-2xl font-light">{weather.temp}°</div>
          <div className="text-sm opacity-90">{weather.condition}</div>
        </div>
        <div className="text-3xl">{style.icon}</div>
      </div>
    </div>
  );
} 