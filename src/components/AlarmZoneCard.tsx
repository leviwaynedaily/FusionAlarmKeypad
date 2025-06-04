'use client';

import { useState } from 'react';
import { Area } from '@/lib/api';

interface AlarmZoneCardProps {
  zoneName: string;
  zoneType: 'critical' | 'perimeter' | 'indoor';
  areas: Area[];
  onAreaToggle: (area: Area) => void;
  onZoneToggle: () => void;
  isProcessing?: boolean;
  areaWarnings?: Record<string, string[]>;
  onShowWarningDetails?: (areaId: string) => void;
}

export default function AlarmZoneCard({ 
  zoneName, 
  zoneType, 
  areas, 
  onAreaToggle, 
  onZoneToggle, 
  isProcessing = false,
  areaWarnings = {},
  onShowWarningDetails 
}: AlarmZoneCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const armedAreas = areas.filter(area => area.armedState !== 'DISARMED');
  const allArmed = armedAreas.length === areas.length && areas.length > 0;
  const allDisarmed = armedAreas.length === 0;
  const isPartial = !allArmed && !allDisarmed;

  const getZoneIcon = () => {
    switch (zoneType) {
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'perimeter':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'indoor':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
    }
  };

  const getZoneColors = () => {
    switch (zoneType) {
      case 'critical':
        return {
          bg: allArmed ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-white dark:bg-[#1a1a1a]',
          border: allArmed ? 'border-rose-200 dark:border-rose-800' : 'border-gray-200 dark:border-gray-800',
          icon: allArmed ? 'text-rose-500' : 'text-gray-500 dark:text-gray-400',
          header: allArmed ? 'text-rose-700 dark:text-rose-300' : 'text-gray-900 dark:text-white',
          badge: allArmed ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 
                 isPartial ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                 'bg-[#22c55f]/10 text-[#22c55f]'
        };
      case 'perimeter':
        return {
          bg: allArmed ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-[#1a1a1a]',
          border: allArmed ? 'border-blue-200 dark:border-blue-800' : 'border-gray-200 dark:border-gray-800',
          icon: allArmed ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400',
          header: allArmed ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white',
          badge: allArmed ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 
                 isPartial ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                 'bg-[#22c55f]/10 text-[#22c55f]'
        };
      case 'indoor':
        return {
          bg: allArmed ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-white dark:bg-[#1a1a1a]',
          border: allArmed ? 'border-purple-200 dark:border-purple-800' : 'border-gray-200 dark:border-gray-800',
          icon: allArmed ? 'text-purple-500' : 'text-gray-500 dark:text-gray-400',
          header: allArmed ? 'text-purple-700 dark:text-purple-300' : 'text-gray-900 dark:text-white',
          badge: allArmed ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 
                 isPartial ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                 'bg-[#22c55f]/10 text-[#22c55f]'
        };
    }
  };

  const colors = getZoneColors();

  if (areas.length === 0) {
    return null;
  }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 transition-all duration-200`}>
      {/* Zone Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={colors.icon}>
            {getZoneIcon()}
          </div>
          <div>
            <h3 className={`text-lg font-bold ${colors.header}`}>{zoneName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {areas.length} area{areas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-lg font-medium text-sm ${colors.badge}`}>
            {allArmed ? 'ARMED' : allDisarmed ? 'DISARMED' : 'PARTIAL'}
          </div>
          
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${collapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zone Master Control */}
      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-3">
        <div className="flex items-center gap-3">
          <div className={allArmed ? 'text-rose-500' : 'text-[#22c55f]'}>
            {allArmed ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Entire {zoneName}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {allArmed ? 'All areas armed' : 
               allDisarmed ? 'All areas disarmed' : 
               `${armedAreas.length} of ${areas.length} armed`}
            </p>
          </div>
        </div>
        
        <button
          onClick={onZoneToggle}
          disabled={isProcessing}
          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            allArmed ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              allArmed ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Individual Areas */}
      {!collapsed && (
        <div className="space-y-2">
          {areas.map((area) => {
            const hasWarnings = areaWarnings[area.id] && areaWarnings[area.id].length > 0;
            
            return (
              <div
                key={area.id}
                className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all"
              >
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
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">{area.name}</h5>
                    <p className={`text-xs ${
                      area.armedState !== 'DISARMED' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {area.armedState === 'DISARMED' ? 'Disarmed' : 
                       area.armedState === 'ARMED_AWAY' ? 'Armed Away' : 'Armed Stay'}
                    </p>
                  </div>
                  {hasWarnings && onShowWarningDetails && (
                    <button
                      onClick={() => onShowWarningDetails(area.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => onAreaToggle(area)}
                  disabled={isProcessing}
                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      area.armedState !== 'DISARMED' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 