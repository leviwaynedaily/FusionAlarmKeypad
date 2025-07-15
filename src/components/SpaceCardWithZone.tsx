'use client';

import { Space } from '@/lib/api';

interface SpaceCardWithZoneProps {
  space: Space;
  zoneName?: string;
  zoneColor?: string;
  deviceCount?: number;
  onSpaceClick?: (space: Space) => void;
  isHighlighted?: boolean;
  showDevices?: boolean;
}

export default function SpaceCardWithZone({ 
  space, 
  zoneName, 
  zoneColor = 'gray',
  deviceCount = 0,
  onSpaceClick,
  isHighlighted = false,
  showDevices = true
}: SpaceCardWithZoneProps) {
  
  const getZoneColorClasses = () => {
    switch (zoneColor) {
      case 'critical':
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800';
      case 'perimeter':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'indoor':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getZoneIconColor = () => {
    switch (zoneColor) {
      case 'critical':
        return 'text-rose-500';
      case 'perimeter':
        return 'text-blue-500';
      case 'indoor':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleClick = () => {
    if (onSpaceClick) {
      onSpaceClick(space);
    }
  };

  return (
    <div 
      className={`flex items-center justify-between rounded-xl border transition-all p-3 ${
        onSpaceClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30' : ''
      } ${
        isHighlighted ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
      } ${
        zoneName ? getZoneColorClasses() : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 flex-1">
        {/* Space Icon */}
        <div className={`${getZoneIconColor()}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m14 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2z" />
          </svg>
        </div>

        {/* Space Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {space.name}
            </h4>
            {zoneName && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  zoneColor === 'critical' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' :
                  zoneColor === 'perimeter' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  zoneColor === 'indoor' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                }`}>
                  {zoneName}
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {showDevices && (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {deviceCount} {deviceCount === 1 ? 'device' : 'devices'}
              </span>
            )}
            
            {space.description && (
              <span className="truncate flex-1">
                {space.description}
              </span>
            )}
          </div>
        </div>

        {/* Location Badge */}
        <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
            {space.locationName}
          </span>
        </div>
      </div>
      
      {/* Action Arrow */}
      {onSpaceClick && (
        <div className="ml-3">
          <svg 
            className="w-4 h-4 text-gray-400 transition-transform duration-200 group-hover:translate-x-0.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );
} 