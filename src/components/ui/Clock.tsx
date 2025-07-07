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
  return (
    <div className="flex-shrink-0 px-4 pt-8 pb-4">
      <div className="text-center">
        <div className="text-base text-gray-600 dark:text-gray-400">
          {currentDate}
        </div>
        <div className="text-4xl font-light text-gray-900 dark:text-white">
          {currentTime}
        </div>
        {selectedLocation && (
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {selectedLocation.name}
          </div>
        )}
      </div>
    </div>
  );
} 