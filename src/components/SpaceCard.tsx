'use client';

import { useState } from 'react';
import { Space } from '@/lib/api';

interface SpaceCardProps {
  space: Space;
  onSpaceClick?: (space: Space) => void;
  deviceCount?: number;
  alarmZoneName?: string;
}

export default function SpaceCard({ 
  space, 
  onSpaceClick, 
  deviceCount = 0,
  alarmZoneName 
}: SpaceCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onSpaceClick) {
      onSpaceClick(space);
    }
  };

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 transition-all duration-200 ${
        onSpaceClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600' : ''
      }`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Space Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {space.name}
          </h3>
        </div>
        
        {onSpaceClick && (
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isHovered ? 'translate-x-1' : ''
            }`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>

      {/* Space Description */}
      {space.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {space.description}
        </p>
      )}

      {/* Space Info */}
      <div className="space-y-2">
        {/* Device Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Devices:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {deviceCount} {deviceCount === 1 ? 'device' : 'devices'}
          </span>
        </div>

        {/* Alarm Zone */}
        {alarmZoneName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Zone:</span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
              {alarmZoneName}
            </span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Location:</span>
          <span className="text-gray-700 dark:text-gray-300 text-xs">
            {space.locationName}
          </span>
        </div>
      </div>

      {/* Bottom Border for Visual Separation */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>ID: {space.id.substring(0, 8)}...</span>
          <span>Updated: {space.updatedAt ? new Date(space.updatedAt).toLocaleDateString() : 'Never'}</span>
        </div>
      </div>
    </div>
  );
} 