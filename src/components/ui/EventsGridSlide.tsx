'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSSEContext } from '@/hooks/SSEContext';
import { useAlarmKeypad } from '@/hooks/useAlarmKeypad';
import { EventDetailsModal } from '@/components/ui/EventDetailsModal';
import { SSEEventDisplay } from '@/hooks/useSSE';
import { EventFilterSettings, AlarmZone } from '@/lib/api';

interface EventsGridSlideProps {
  onBack?: () => void;
  eventFilterSettings?: EventFilterSettings;
  alarmZones?: AlarmZone[];
}

export const EventsGridSlide: React.FC<EventsGridSlideProps> = ({ onBack, eventFilterSettings, alarmZones }) => {
  const sse = useSSEContext();
  const alarmKeypad = useAlarmKeypad();
  const [selectedEvent, setSelectedEvent] = useState<SSEEventDisplay | null>(null);
  const [events, setEvents] = useState<SSEEventDisplay[]>([]);
  // Use props if provided, otherwise fallback to hook data
  const activeEventFilterSettings = eventFilterSettings || alarmKeypad.eventFilterSettings;
  const activeAlarmZones = alarmZones || alarmKeypad.alarmZones;

  // Helper function to find alarm zone for an event (exact copy from LiveEventsTicker)
  const getAlarmZoneForEvent = (event: SSEEventDisplay) => {
    if (!event.deviceName || !activeAlarmZones || activeAlarmZones.length === 0) return null;
    
    // Find alarm zone that contains this device (same logic as LiveEventsTicker)
    return activeAlarmZones.find(zone => 
      zone.devices?.some(device => 
        device.name === event.deviceName || 
        device.id === event.deviceId
      )
    ) || null;
  };

  // Filter events based on Event Display Settings (same logic as LiveEventsTicker)
  const filteredEvents = useMemo(() => {
    if (!activeEventFilterSettings) return sse.recentEvents || [];
    
    const filterSettings = activeEventFilterSettings;
    
    // Debug info removed for performance
    
    return (sse.recentEvents || []).filter(event => {
      const eventType = event.type?.toLowerCase();
      
      // Debug logging removed for performance
      
      // Check individual event type settings first (highest priority)
      if (eventType && filterSettings.eventTypes.hasOwnProperty(eventType)) {
        const isEnabled = filterSettings.eventTypes[eventType] !== false;
        // If "Show All Events" is enabled, it can override disabled events to show them
        if (filterSettings.showAllEvents) {
          return true; // Show all events when explicitly requested
        }
        return isEnabled; // Respect individual toggle when "Show All Events" is off
      }
      
      // Check new event type settings format
      if (eventType && filterSettings.eventTypeSettings[eventType]) {
        const isEnabled = filterSettings.eventTypeSettings[eventType].showInTimeline;
        if (filterSettings.showAllEvents) {
          return true; // Show all events when explicitly requested
        }
        return isEnabled;
      }
      
      // Alarm zone specific filtering
      const eventAlarmZone = getAlarmZoneForEvent(event);
      const isInAlarmZone = !!eventAlarmZone;
      
      // If "Show only alarm zone events" is enabled, filter out non-alarm-zone events
      if (filterSettings.showOnlyAlarmZoneEvents && !isInAlarmZone) {
        return false;
      }
      
      // If specific alarm zones are selected, only show events from those zones
      if (filterSettings.selectedAlarmZones.length > 0 && isInAlarmZone) {
        if (!filterSettings.selectedAlarmZones.includes(eventAlarmZone.id)) {
          return false;
        }
      }
      
      // Check if event is space-related
      const isSpaceEvent = event.spaceId && event.spaceName;
      if (filterSettings.showSpaceEvents && isSpaceEvent) {
        return true;
      }
      
      // Check if event is alarm zone related (legacy logic - device in an alarm zone)
      const isAlarmZoneEvent = event.category?.includes('alarm') || 
                               event.type?.includes('alarm') ||
                               event.displayState?.includes('armed') ||
                               isInAlarmZone; // Also include our new alarm zone detection
      if (filterSettings.showAlarmZoneEvents && isAlarmZoneEvent) {
        return true;
      }
      
      // Default fallback - only show if "Show All Events" is enabled
      return filterSettings.showAllEvents;
    });
  }, [sse.recentEvents, activeEventFilterSettings, activeAlarmZones]);

  // Dynamic time grouping function
  const getTimeGrouping = (timestamp: string | undefined): string => {
    if (!timestamp) return 'Unknown Time';
    
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    // Dynamic time groupings based on actual time differences
    if (diffInMinutes < 5) return 'Just Now';
    if (diffInMinutes < 15) return 'Last 15 Minutes';
    if (diffInMinutes < 60) return 'Last Hour';
    if (diffInHours < 6) return 'Last 6 Hours';
    if (diffInHours < 24) return 'Earlier Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return 'This Week';
    if (diffInDays < 30) return 'This Month';
    return 'Older';
  };

  // Group filtered events by time periods
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: SSEEventDisplay[] } = {};
    
    // Sort events by timestamp (newest first)
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
    
    // Group events by time periods
    sortedEvents.forEach(event => {
      const group = getTimeGrouping(event.timestamp);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(event);
    });
    
    // Define display order for time groups (most recent first)
    const groupOrder = [
      'Just Now',
      'Last 15 Minutes', 
      'Last Hour',
      'Last 6 Hours',
      'Earlier Today',
      'Yesterday',
      'This Week',
      'This Month',
      'Older'
    ];
    
    // Return ordered groups that actually have events
    return groupOrder
      .filter(groupName => groups[groupName] && groups[groupName].length > 0)
      .map(groupName => ({
        name: groupName,
        events: groups[groupName],
        count: groups[groupName].length
      }));
  }, [filteredEvents]);

  // Total count of all filtered events for display
  const totalFilteredEvents = useMemo(() => {
    return groupedEvents.reduce((total, group) => total + group.count, 0);
  }, [groupedEvents]);

  const handleEventClick = (event: SSEEventDisplay) => {
    setSelectedEvent(event);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
  };

  const getRelativeTime = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown time';
    
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - eventTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Enhanced event label generation (matches LiveEventsTicker logic)
  const getEventLabels = (event: SSEEventDisplay) => {
    const deviceName = event.deviceName || 'Unknown Device';
    let primaryLabel = 'Event';
    let secondaryLabel = '';
    
    try {
      let parsedEventType: any = event.type;
      
      // Parse JSON event types
      if (typeof event.type === 'string' && event.type.startsWith('{')) {
        parsedEventType = JSON.parse(event.type);
      }
      
      // If we have a parsed JSON event type
      if (typeof parsedEventType === 'object' && parsedEventType) {
        
        // For intrusion/analytics events - show specific detection type
        if (parsedEventType.type === 'Intrusion Detected' || parsedEventType.type === 'intrusion detected') {
          primaryLabel = 'Intrusion Detected';
          
          // Extract object type from caption
          const caption = (event as any).caption || 
                        parsedEventType.caption || 
                        parsedEventType.payload?.caption || 
                        (event as any).event_data?.payload?.caption ||
                        (event as any).event_data?.caption ||
                        (event as any).event?.caption ||
                        (event as any).rawEvent?.caption ||
                        '';
          
          if (caption) {
            if (caption.includes('Vehicle') || caption.includes('vehicle')) {
              secondaryLabel = 'Vehicle Detected';
            } else if (caption.includes('Person') || caption.includes('person') || caption.includes('Human') || caption.includes('human')) {
              secondaryLabel = 'Person Detected';  
            } else if (caption.includes('Animal') || caption.includes('animal') || caption.includes('Pet') || caption.includes('pet')) {
              secondaryLabel = 'Animal Detected';
            } else {
              secondaryLabel = 'Object Detected';
            }
          } else {
            secondaryLabel = 'Motion Detected';
          }
          
          return { primaryLabel, secondaryLabel };
        }
        
        // For state changes
        if (parsedEventType.type === 'State Changed') {
          const state = parsedEventType.displayState || parsedEventType.intermediateState;
          primaryLabel = deviceName;
          secondaryLabel = state ? `${state}` : 'State Changed';
          return { primaryLabel, secondaryLabel };
        }
        
        // For device check-ins
        if (parsedEventType.type === 'Device Check-in') {
          primaryLabel = deviceName;
          secondaryLabel = 'Check-in';
          
          if (parsedEventType.batteryPercentage !== undefined) {
            secondaryLabel = `${parsedEventType.batteryPercentage}% Battery`;
          }
          
          return { primaryLabel, secondaryLabel };
        }
        
        // For other structured events
        if (parsedEventType.type && typeof parsedEventType.type === 'string') {
          primaryLabel = parsedEventType.type;
          secondaryLabel = deviceName;
          return { primaryLabel, secondaryLabel };
        }
      }
      
      // Handle simple string event types
      const eventType = (event.type || '').toString().toLowerCase();
      
      if (eventType.includes('intrusion')) {
        primaryLabel = 'Intrusion Detected';
        secondaryLabel = 'Motion Detected';
        return { primaryLabel, secondaryLabel };
      }
      
      if (eventType.includes('motion')) {
        primaryLabel = 'Motion Detected';
        secondaryLabel = deviceName;
        return { primaryLabel, secondaryLabel };
      }
      
      if (eventType.includes('state') || eventType.includes('device_state')) {
        primaryLabel = deviceName;
        secondaryLabel = 'State Changed';
        return { primaryLabel, secondaryLabel };
      }
      
      if (eventType.includes('heartbeat')) {
        primaryLabel = deviceName;
        secondaryLabel = 'Heartbeat';
        return { primaryLabel, secondaryLabel };
      }
      
      if (eventType.includes('connection')) {
        primaryLabel = 'System';
        secondaryLabel = 'Connection Event';
        return { primaryLabel, secondaryLabel };
      }
      
      // Default fallback
      primaryLabel = event.type || 'Event';
      secondaryLabel = deviceName;
      
    } catch (error) {
      primaryLabel = event.type || 'Event';
      secondaryLabel = deviceName;
    }
    
    return { primaryLabel, secondaryLabel };
  };



  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors mr-4"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Events
              </h1>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {totalFilteredEvents} events (filtered)
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid with Time Grouping */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {groupedEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No recent events
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                System events and alerts will appear here when they occur.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedEvents.map((group) => (
                <div key={group.name} className="space-y-4">
                  {/* Time Group Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {group.name}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      {group.count} event{group.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {/* Events Grid for this time group */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-4">
                    {group.events.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  onClick={() => handleEventClick(event)}
                  className="group cursor-pointer bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                >
                  {/* Image or Icon */}
                  <div className="aspect-square relative overflow-hidden">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={`${event.deviceName} event`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                        {(() => {
                          const { primaryLabel } = getEventLabels(event);
                          const eventType = (event.type || '').toString().toLowerCase();
                          
                          // Choose icon based on event type
                          if (eventType.includes('intrusion') || primaryLabel.includes('Intrusion')) {
                            return (
                              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            );
                          } else if (eventType.includes('motion') || primaryLabel.includes('Motion')) {
                            return (
                              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            );
                          } else if (eventType.includes('state') || primaryLabel.includes('State')) {
                            return (
                              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                              </svg>
                            );
                          } else if (eventType.includes('heartbeat') || eventType.includes('check-in') || primaryLabel.includes('Check-in')) {
                            return (
                              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                            );
                          } else if (eventType.includes('connection') || primaryLabel.includes('Connection')) {
                            return (
                              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                              </svg>
                            );
                          } else {
                            // Default icon
                            return (
                              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 17H4l5 5v-5zM9 7H4l5-5v5zM15 7h5l-5-5v5z" />
                              </svg>
                            );
                          }
                        })()}
                      </div>
                    )}
                    
                    {/* Overlay with event info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="text-white text-xs font-medium truncate">
                          {event.deviceName}
                        </div>
                        {(() => {
                          const { primaryLabel, secondaryLabel } = getEventLabels(event);
                          return (
                            <>
                              <div className="text-white/90 text-xs truncate font-medium">
                                {primaryLabel}
                              </div>
                              {secondaryLabel && (
                                <div className="text-white/75 text-xs truncate">
                                  {secondaryLabel}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Time badge */}
                    <div className="absolute top-2 right-2">
                      <span className="bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                        {getRelativeTime(event.timestamp || '')}
                      </span>
                    </div>
                  </div>

                  {/* Event info (always visible on mobile) */}
                  <div className="p-3 sm:p-2 lg:hidden">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {event.deviceName}
                    </div>
                    {(() => {
                      const { primaryLabel, secondaryLabel } = getEventLabels(event);
                      return (
                        <>
                          <div className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium">
                            {primaryLabel}
                          </div>
                          {secondaryLabel && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {secondaryLabel}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={handleCloseModal}
          debugMode={false}
        />
      )}
    </div>
  );
};