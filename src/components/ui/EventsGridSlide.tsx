'use client';

import React, { useState, useEffect } from 'react';
import { useSSEContext } from '@/hooks/SSEContext';
import { EventDetailsModal } from '@/components/ui/EventDetailsModal';
import { SSEEventDisplay } from '@/hooks/useSSE';

interface EventsGridSlideProps {
  onBack?: () => void;
}

export const EventsGridSlide: React.FC<EventsGridSlideProps> = ({ onBack }) => {
  const sse = useSSEContext();
  const [selectedEvent, setSelectedEvent] = useState<SSEEventDisplay | null>(null);
  const [events, setEvents] = useState<SSEEventDisplay[]>([]);

  // Load events from SSE context
  useEffect(() => {
    if (sse.recentEvents && sse.recentEvents.length > 0) {
      // Filter for events with images and sort by timestamp (newest first)
      const eventsWithImages = sse.recentEvents
        .filter(event => event.imageUrl && event.timestamp)
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        });
      
      setEvents(eventsWithImages);
    }
  }, [sse.recentEvents]);

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

  const getEventTypeLabel = (event: SSEEventDisplay) => {
    try {
      if (typeof event.type === 'string' && event.type.startsWith('{')) {
        const parsed = JSON.parse(event.type);
        return parsed.type || parsed.displayState || 'Event';
      }
      return event.type || 'Event';
    } catch {
      return event.type || 'Event';
    }
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
              {events.length} events with images
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
                No events with images
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Events with camera images will appear here when they occur.
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
                  {/* Image */}
                  <div className="aspect-square relative overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={`${event.deviceName} event`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Overlay with event info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="text-white text-xs font-medium truncate">
                          {event.deviceName}
                        </div>
                        <div className="text-white/80 text-xs truncate">
                          {getEventTypeLabel(event)}
                        </div>
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
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {getEventTypeLabel(event)}
                    </div>
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