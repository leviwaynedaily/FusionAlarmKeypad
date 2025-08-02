'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSSEContext } from '@/hooks/SSEContext';
import { useAlarmKeypad } from '@/hooks/useAlarmKeypad';
import { EventDetailsModal } from '@/components/ui/EventDetailsModal';
import { SSEEventDisplay } from '@/hooks/useSSE';

interface EventsGridSlideProps {
  onBack?: () => void;
}

export const EventsGridSlide: React.FC<EventsGridSlideProps> = ({ onBack }) => {
  const sse = useSSEContext();
  const alarmKeypad = useAlarmKeypad();
  const [selectedEvent, setSelectedEvent] = useState<SSEEventDisplay | null>(null);
  const [events, setEvents] = useState<SSEEventDisplay[]>([]);

  // Helper function to find alarm zone for an event (exact copy from LiveEventsTicker)
  const getAlarmZoneForEvent = (event: SSEEventDisplay) => {
    if (!event.deviceName || !alarmKeypad.alarmZones || alarmKeypad.alarmZones.length === 0) return null;
    
    // Find alarm zone that contains this device (same logic as LiveEventsTicker)
    return alarmKeypad.alarmZones.find(zone => 
      zone.devices?.some(device => 
        device.name === event.deviceName || 
        device.id === event.deviceId
      )
    ) || null;
  };

  // Filter events based on Event Display Settings (same logic as LiveEventsTicker)
  const filteredEvents = useMemo(() => {
    if (!alarmKeypad.eventFilterSettings) return sse.recentEvents || [];
    
    const eventFilterSettings = alarmKeypad.eventFilterSettings;
    
    console.log('🔍 EventsGridSlide Debug Info:', {
      totalEvents: sse.recentEvents?.length || 0,
      eventFilterSettings: eventFilterSettings,
      showAllEvents: eventFilterSettings.showAllEvents,
      showSpaceEvents: eventFilterSettings.showSpaceEvents,
      showAlarmZoneEvents: eventFilterSettings.showAlarmZoneEvents,
      showOnlyAlarmZoneEvents: eventFilterSettings.showOnlyAlarmZoneEvents,
      selectedAlarmZones: eventFilterSettings.selectedAlarmZones,
      eventTypes: eventFilterSettings.eventTypes,
      eventTypeSettings: eventFilterSettings.eventTypeSettings
    });
    
    return (sse.recentEvents || []).filter(event => {
      const eventType = event.type?.toLowerCase();
      
      console.log('🔍 Filtering event:', {
        eventType: eventType,
        originalType: event.type,
        deviceName: event.deviceName,
        deviceId: event.deviceId,
        spaceId: event.spaceId,
        spaceName: event.spaceName,
        category: event.category,
        displayState: event.displayState
      });
      
      // Quick check: if this is a connection event, let's see what's happening
      if (eventType === 'connection') {
        console.log('🔌 CONNECTION EVENT DETECTED:', {
          eventType,
          hasEventTypeSetting: eventFilterSettings.eventTypes.hasOwnProperty(eventType),
          eventTypeSetting: eventFilterSettings.eventTypes[eventType],
          showAllEvents: eventFilterSettings.showAllEvents
        });
      }
      
      // Check individual event type settings first (highest priority)
      if (eventType && eventFilterSettings.eventTypes.hasOwnProperty(eventType)) {
        const isEnabled = eventFilterSettings.eventTypes[eventType] !== false;
        console.log('🎯 Individual event type check:', { eventType, isEnabled, showAllEvents: eventFilterSettings.showAllEvents });
        // If "Show All Events" is enabled, it can override disabled events to show them
        if (eventFilterSettings.showAllEvents) {
          console.log('✅ Showing due to showAllEvents override');
          return true; // Show all events when explicitly requested
        }
        console.log(isEnabled ? '✅ Showing due to individual toggle' : '❌ Filtered out by individual toggle');
        return isEnabled; // Respect individual toggle when "Show All Events" is off
      }
      
      // Check new event type settings format
      if (eventType && eventFilterSettings.eventTypeSettings[eventType]) {
        const isEnabled = eventFilterSettings.eventTypeSettings[eventType].showInTimeline;
        console.log('🎯 New event type settings check:', { eventType, isEnabled, showAllEvents: eventFilterSettings.showAllEvents });
        if (eventFilterSettings.showAllEvents) {
          console.log('✅ Showing due to showAllEvents override');
          return true; // Show all events when explicitly requested
        }
        console.log(isEnabled ? '✅ Showing due to new settings toggle' : '❌ Filtered out by new settings toggle');
        return isEnabled;
      }
      
      // Alarm zone specific filtering
      const eventAlarmZone = getAlarmZoneForEvent(event);
      const isInAlarmZone = !!eventAlarmZone;
      console.log('🏠 Alarm zone check:', { eventAlarmZone: eventAlarmZone?.name, isInAlarmZone });
      
      // If "Show only alarm zone events" is enabled, filter out non-alarm-zone events
      if (eventFilterSettings.showOnlyAlarmZoneEvents && !isInAlarmZone) {
        console.log('❌ Filtered out: showOnlyAlarmZoneEvents is true but event not in alarm zone');
        return false;
      }
      
      // If specific alarm zones are selected, only show events from those zones
      if (eventFilterSettings.selectedAlarmZones.length > 0 && isInAlarmZone) {
        if (!eventFilterSettings.selectedAlarmZones.includes(eventAlarmZone.id)) {
          console.log('❌ Filtered out: event not in selected alarm zones');
          return false;
        }
      }
      
      // Check if event is space-related
      const isSpaceEvent = event.spaceId && event.spaceName;
      if (eventFilterSettings.showSpaceEvents && isSpaceEvent) {
        console.log('✅ Showing space event');
        return true;
      }
      
      // Check if event is alarm zone related (legacy logic - device in an alarm zone)
      const isAlarmZoneEvent = event.category?.includes('alarm') || 
                               event.type?.includes('alarm') ||
                               event.displayState?.includes('armed') ||
                               isInAlarmZone; // Also include our new alarm zone detection
      if (eventFilterSettings.showAlarmZoneEvents && isAlarmZoneEvent) {
        console.log('✅ Showing alarm zone event (legacy logic)');
        return true;
      }
      
      // Default fallback - only show if "Show All Events" is enabled
      console.log(eventFilterSettings.showAllEvents ? '✅ Showing due to showAllEvents fallback' : '❌ Filtered out by default fallback');
      return eventFilterSettings.showAllEvents;
    });
  }, [sse.recentEvents, alarmKeypad.eventFilterSettings, alarmKeypad.alarmZones]);

  // Load events from filtered results
  useEffect(() => {
    // Apply timestamp filtering and sorting to the already filtered events
    const sortedFilteredEvents = filteredEvents
      .filter(event => event.timestamp) // Only filter out events without timestamps
      .sort((a, b) => {
        const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTime - aTime;
      });
    
    setEvents(sortedFilteredEvents);
  }, [filteredEvents]);

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
              {events.length} events (filtered)
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {events.length === 0 ? (
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {events.map((event, index) => (
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