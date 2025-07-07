'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SSEEventDisplay } from '@/hooks/useSSE';
import { EventDetailsModal } from './EventDetailsModal';
import { formatRelativeTime } from '@/lib/alarmKeypadUtils';

interface LiveEventsTickerProps {
  showLiveEvents: boolean;
  recentEvents: SSEEventDisplay[];
}

const eventTypeIcon: Record<string, React.ReactNode> = {
  lock_locked: <span role="img" aria-label="Locked">🔒</span>,
  lock_unlocked: <span role="img" aria-label="Unlocked">🔓</span>,
  door_opened: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <rect x="4" y="3" width="6" height="18" rx="1" />
      <path d="M10 4l9 2v12l-9 2z" />
      <circle cx="14" cy="12" r="0.8" fill="#fff" />
    </svg>
  ),
  door_closed: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <circle cx="14" cy="12" r="0.8" fill="#fff" />
    </svg>
  ),
  motion_detected: <span role="img" aria-label="Motion">🏃‍♂️</span>,
  alarm_triggered: <span role="img" aria-label="Alarm">🚨</span>,
  area_armed: <span role="img" aria-label="Armed">🟩</span>,
  area_disarmed: <span role="img" aria-label="Disarmed">⬜️</span>,
  light_on: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M12 2a7 7 0 00-4 12.83V17a1 1 0 001 1h6a1 1 0 001-1v-2.17A7 7 0 0012 2z" />
      <path d="M9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  light_off: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10a5 5 0 00-8.9-3" />
      <path d="M9.34 9.34A5 5 0 002 10a5 5 0 008.9 3" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  unknown: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <line x1="7" y1="21" x2="17" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M16 7s-1.5-2-4-2-4 2-4 2" />
      <path d="M14 10s-.9-1-2-1-2 1-2 1" />
    </svg>
  ),
  // Add more mappings as needed
  default: <span role="img" aria-label="Event">🔔</span>,
};

// Human-readable labels for event types
const eventTypeLabel: Record<string, string> = {
  lock_locked: 'Locked',
  lock_unlocked: 'Unlocked',
  door_opened: 'Open',
  door_closed: 'Closed',
  motion_detected: 'Motion',
  alarm_triggered: 'Alarm',
  area_armed: 'Armed',
  area_disarmed: 'Disarmed',
  light_on: 'On',
  light_off: 'Off',
};

function formatTime(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LiveEventsTicker({ 
  showLiveEvents, 
  recentEvents 
}: LiveEventsTickerProps) {
  const [selected, setSelected] = useState<SSEEventDisplay | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClose = () => setSelected(null);

  // Get timeline event settings from localStorage
  const getTimelineSettings = () => {
    try {
      const settings = localStorage.getItem('timeline_events');
      if (settings) {
        return JSON.parse(settings);
      }
    } catch (error) {
      console.error('Error parsing timeline settings:', error);
    }
    // Default settings - show all event types
    return {
      camera: true,
      lights: true,
      doors: true,
      motion: true,
      security: true
    };
  };

  // Filter events based on timeline settings
  const filteredEvents = useMemo(() => {
    return recentEvents.filter(event => {
      const settings = getTimelineSettings();
      const deviceName = (event.deviceName || '').toLowerCase();
      const eventType = (event.type || '').toLowerCase();
      
      // Camera events (events with images)
      if (event.imageUrl || event.thumbnail || (event as any).thumbnailData?.data) {
        return settings.camera;
      }
      
      // Light events
      if (deviceName.includes('light') || eventType.includes('light')) {
        return settings.lights;
      }
      
      // Door events
      if (deviceName.includes('door') || eventType.includes('door') || eventType.includes('lock')) {
        return settings.doors;
      }
      
      // Motion events
      if (eventType.includes('motion') || deviceName.includes('motion') || deviceName.includes('sensor')) {
        return settings.motion;
      }
      
      // Security events
      if (eventType.includes('arm') || eventType.includes('disarm') || eventType.includes('alarm') || eventType.includes('security')) {
        return settings.security;
      }
      
      // Default to security events for unknown types
      return settings.security;
    });
  }, [recentEvents, settingsVersion]);

  // Auto-scroll left to show newest card
  useEffect(() => {
    if (rowRef.current) {
      rowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [filteredEvents]);



  // Listen for timeline settings changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timeline_events') {
        setSettingsVersion(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!showLiveEvents || !filteredEvents.length) {
    return null;
  }

  return (
    <>
    <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none">
      <div className="relative">
        {/* Timeline header */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/60 dark:from-gray-900/60 to-transparent flex items-center justify-center">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-900/80 px-3 py-1 rounded-full">
            Timeline • {filteredEvents.length} events
          </div>
        </div>

        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/90 dark:from-gray-900/90 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/90 dark:from-gray-900/90 to-transparent z-10" />

        {/* Scroll buttons */}
        {filteredEvents.length > 3 && (
          <>
            <button
              onClick={() => {
                if (rowRef.current) {
                  rowRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                }
              }}
              className="pointer-events-auto absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200 hover:scale-105"
              title="Scroll left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (rowRef.current) {
                  rowRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }
              }}
              className="pointer-events-auto absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200 hover:scale-105"
              title="Scroll right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Scrollable timeline */}
        <div
          ref={rowRef}
          className="relative flex gap-4 py-4 px-8 bg-white/85 dark:bg-gray-900/85 shadow-2xl rounded-t-3xl overflow-x-auto scrollbar-hide scroll-snap-x mandatory pointer-events-auto backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50"
        >
          {/* Timeline connector line - centered */}
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent pointer-events-none transform -translate-y-1/2" />
          {filteredEvents.map((event, idx) => {
            let type = (event.type || '').toLowerCase();
            const deviceName = event.deviceName || 'Unknown Device';

            // Extract state from various possible locations
            const rawState: string = (event.displayState || event.payload?.displayState || event.payload?.state || '').toString();

            // Special-case lights: choose icon by state
            if (/light/i.test(deviceName) && rawState) {
              if (/on/i.test(rawState)) type = 'light_on';
              else if (/off/i.test(rawState)) type = 'light_off';
            }

            // Special-case doors: choose icon by state
            if (/door/i.test(deviceName) && rawState) {
              if (/open/i.test(rawState)) type = 'door_opened';
              else if (/close/i.test(rawState) || /closed/i.test(rawState)) type = 'door_closed';
            }

            // Build label preference order
            const formattedState = rawState ? rawState.charAt(0).toUpperCase() + rawState.slice(1) : '';
            const actionLabel = (eventTypeLabel[type] ?? formattedState).trim() || type.replace(/_/g, ' ');

            return (
              <button
                key={event.id || idx}
                onClick={() => setSelected(event)}
                className="group flex flex-col items-center min-w-[140px] max-w-[140px] sm:min-w-[160px] sm:max-w-[160px] scroll-snap-start focus:outline-none transition-all duration-200 hover:scale-105"
                title={`${deviceName} – ${event.type}`}
              >
                {/* Timeline dot indicator */}
                <div className="relative">
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900" />
                  )}
                  
                  {/* Image or Icon Container */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors duration-200 bg-gray-50 dark:bg-gray-800">
                    {(() => {
                      const rawImg = (event.imageUrl || event.thumbnail || (event as any).thumbnailData?.data) as string | undefined;
                      if (rawImg) {
                        const src = rawImg.startsWith('data:') ? rawImg : `data:image/jpeg;base64,${rawImg}`;
                        return <img src={src} alt={type} className="object-cover w-full h-full" />;
                      }
                      const iconEl = eventTypeIcon[type] || eventTypeIcon.unknown || eventTypeIcon.default;
                      return (
                        <div className="flex items-center justify-center w-full h-full text-4xl sm:text-5xl text-gray-600 dark:text-gray-400">
                          {iconEl}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Event details */}
                <div className="mt-2 text-center space-y-1">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                    {deviceName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {actionLabel}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {formatRelativeTime(event.timestamp ? new Date(event.timestamp).getTime() : Date.now())}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    {selected && <EventDetailsModal event={selected} onClose={handleClose} />}
    </>
  );
} 