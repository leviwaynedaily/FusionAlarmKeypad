import React, { useState, useEffect } from 'react';

interface ClockProps {
  currentTime: string;
  currentDate: string;
  selectedLocation?: any;
  showSeconds: boolean;
}

export function Clock({ 
  currentTime, 
  currentDate, 
  selectedLocation, 
  showSeconds 
}: ClockProps) {
  // Format time to show/hide seconds based on showSeconds prop
  const formatTime = (timeString: string) => {
    if (!showSeconds && timeString.includes(':')) {
      // Remove seconds from time string (e.g., "09:04:37 AM" -> "09:04 AM")
      const parts = timeString.split(':');
      if (parts.length === 3) {
        const lastPart = parts[2]; // "37 AM"
        const amPm = lastPart.includes(' ') ? ' ' + lastPart.split(' ')[1] : '';
        return parts[0] + ':' + parts[1] + amPm;
      }
    }
    return timeString;
  };

  return (
    <div className="flex-shrink-0 px-4 pt-4 pb-2">
      <div className="text-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentDate}
        </div>
        <div className="text-3xl font-light text-gray-900 dark:text-white">
          {formatTime(currentTime)}
        </div>
        {selectedLocation && (
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {selectedLocation.name}
          </div>
        )}
      </div>
    </div>
  );
} 