'use client';

import { Area } from '@/lib/api';

interface AreaCardWithZoneProps {
  area: Area;
  zoneName?: string;
  zoneColor?: string;
  onToggle: (area: Area) => void;
  isProcessing?: boolean;
  hasWarnings?: boolean;
  onShowWarnings?: () => void;
}

export default function AreaCardWithZone({ 
  area, 
  zoneName, 
  zoneColor = 'gray',
  onToggle, 
  isProcessing = false,
  hasWarnings = false,
  onShowWarnings 
}: AreaCardWithZoneProps) {
  const getZoneColorClasses = () => {
    switch (zoneColor) {
      case 'critical':
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300';
      case 'perimeter':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
      case 'indoor':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className={`flex items-center justify-between rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all p-3 ${
      zoneName ? getZoneColorClasses() : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`${area.armedState !== 'DISARMED' ? 'text-rose-500' : 'text-gray-400 dark:text-gray-600'}`}>
          {area.armedState !== 'DISARMED' ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{area.name}</h4>
          <div className="flex items-center gap-2">
            <p className={`text-xs ${
              area.armedState !== 'DISARMED' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {area.armedState === 'DISARMED' ? 'Disarmed' : 'Armed'}
            </p>
            {zoneName && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs font-medium">{zoneName}</span>
              </>
            )}
          </div>
        </div>
        {hasWarnings && onShowWarnings && (
          <button
            onClick={onShowWarnings}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>
        )}
      </div>
      
      <button
        onClick={() => onToggle(area)}
        disabled={isProcessing}
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            area.armedState !== 'DISARMED' ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
} 