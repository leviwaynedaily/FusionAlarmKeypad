'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Event } from '@/lib/api';
import { optimizedGetAreas, SmartPoller, clearCache } from '@/lib/api-optimized';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ id: string; name: string; addressPostalCode: string } | null>(null);
  const [organization, setOrganization] = useState<{ name: string } | null>(null);
  const [smartPoller, setSmartPoller] = useState<SmartPoller | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a user ID
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/pin');
      return;
    }

    // Get location from localStorage
    const storedLocation = localStorage.getItem('selected_location');
    if (!storedLocation) {
      router.push('/location');
      return;
    }

    const loc = JSON.parse(storedLocation);
    setLocation(loc);

    // Get organization from localStorage
    const storedOrganization = localStorage.getItem('fusion_organization');
    if (storedOrganization) {
      try {
        setOrganization(JSON.parse(storedOrganization));
      } catch (e) {
        console.error('Failed to parse organization:', e);
      }
    }

    const fetchEvents = async () => {
      try {
        // Get areas for filtering
        const areasResponse = await optimizedGetAreas(loc.id);
        const areas = areasResponse.data || [];
        const areaIds = areas.map(area => area.id);

        // TODO: Implement events API
        const response = { data: [], error: null };
        if (response.error) {
          if (loading) setError('Failed to fetch events');
          return { events: [], hasChanges: false };
        }

        // Filter for security-relevant events only from configured areas
        const relevantEvents = (response.data || []).filter((event: any) => {
          // Only show events from configured areas (allow events without areaId for location-wide events)
          if (event.areaId && areaIds.length > 0 && !areaIds.includes(event.areaId)) {
            return false;
          }
          
          const type = event.eventType.toLowerCase();
          const subtype = (event.eventSubtype || '').toLowerCase();
          const deviceName = (event.deviceName || '').toLowerCase();
          const displayState = (event.displayState || '').toLowerCase();
          
          // Include door, motion, alarm, intrusion, arm/disarm, lock events
          return (
            type.includes('door') ||
            type.includes('motion') ||
            type.includes('alarm') ||
            type.includes('intrusion') ||
            type.includes('contact') ||
            type.includes('entry') ||
            type.includes('arm') ||
            type.includes('disarm') ||
            type.includes('trigger') ||
            type.includes('tamper') ||
            type.includes('armed') ||
            type.includes('disarmed') ||
            type.includes('lock') ||
            type.includes('unlock') ||
            type.includes('opened') ||
            type.includes('closed') ||
            subtype.includes('open') ||
            subtype.includes('close') ||
            subtype.includes('lock') ||
            subtype.includes('unlock') ||
            displayState.includes('open') ||
            displayState.includes('close') ||
            displayState.includes('lock') ||
            displayState.includes('unlock') ||
            deviceName.includes('door') ||
            deviceName.includes('lock')
          );
        });

        // Sort by timestamp descending (most recent first)
        relevantEvents.sort((a: any, b: any) => b.timestamp - a.timestamp);

        // Only update if there are changes (prevents unnecessary re-renders)
        const existingIds = new Set(events.map((e: any) => e.id));
        const newIds = new Set(relevantEvents.map((e: any) => e.id));
        const hasChanges = relevantEvents.length !== events.length || 
                          relevantEvents.some((e: any) => !existingIds.has(e.id)) ||
                          events.some((e: any) => !newIds.has(e.id));

        if (hasChanges) {
          setEvents(relevantEvents);
        }
        setError(''); // Clear any previous errors
        
        return { events: relevantEvents, hasChanges };
      } catch (err) {
        if (loading) setError('An error occurred while fetching events');
        return { events: [], hasChanges: false };
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchEvents();

    // Set up smart polling
    const poller = new SmartPoller(5000, 30000);
    poller.start(async () => {
      const result = await fetchEvents();
      return result.events; // Return data for change detection
    });
    setSmartPoller(poller);

    // Cleanup on unmount
    return () => {
      poller.stop();
    };
  }, [router]);

  // Filter events from the last 24 hours for display
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentEvents = events.filter(event => event.timestamp >= twentyFourHoursAgo);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-100 pb-16">
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          <TabNav />
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        locationName={location?.name}
        postalCode={location?.addressPostalCode}
        organizationName={organization?.name}
      />
      <main className="min-h-screen bg-gray-100 pb-16">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Event History</h1>
            <p className="text-sm text-gray-600 mt-1">
              {location?.name} • Last 24 hours • {recentEvents.length} total events
            </p>
            {error && (
              <div className="mt-2 text-red-500 text-sm">{error}</div>
            )}
          </div>



          {/* Events List */}
          <div className="space-y-4">
            {recentEvents.map((event) => {
              const eventType = event.eventType.toLowerCase();
              const eventSubtype = (event.eventSubtype || '').toLowerCase();
              const displayState = (event.displayState || '').toLowerCase();
              const deviceName = (event.deviceName || '').toLowerCase();
              
              const isAlarm = eventType.includes('alarm') || eventType.includes('trigger') || eventType.includes('intrusion');
              const isMotion = eventType.includes('motion');
              const isDoor = eventType.includes('door') || eventType.includes('contact') || eventType.includes('entry') || deviceName.includes('door');
              const isLock = eventType.includes('lock') || deviceName.includes('lock');
              const isArm = eventType.includes('arm') && !eventType.includes('disarm');
              const isDisarm = eventType.includes('disarm');
              
              // Determine event description
              let eventDescription = event.eventType;
              if (isDoor) {
                if (displayState.includes('open') || eventSubtype.includes('open') || eventType.includes('opened')) {
                  eventDescription = 'Door Opened';
                } else if (displayState.includes('closed') || eventSubtype.includes('close') || eventType.includes('closed')) {
                  eventDescription = 'Door Closed';
                } else {
                  eventDescription = 'Door Activity';
                }
              } else if (isLock) {
                if (eventType.includes('unlock') || displayState.includes('unlock')) {
                  eventDescription = 'Door Unlocked';
                } else if (eventType.includes('lock') || displayState.includes('lock')) {
                  eventDescription = 'Door Locked';
                } else {
                  eventDescription = 'Lock Activity';
                }
              } else if (isMotion) {
                eventDescription = 'Motion Detected';
              } else if (isAlarm) {
                // Parse intrusion type from payload caption
                if (event.eventType === 'INTRUSION' && event.payload?.caption) {
                  const caption = event.payload.caption;
                  if (caption.includes('- Person -')) {
                    eventDescription = 'Person Detected';
                  } else if (caption.includes('- Animal -')) {
                    eventDescription = 'Animal Detected';
                  } else if (caption.includes('- Vehicle -')) {
                    eventDescription = 'Vehicle Detected';
                  } else {
                    eventDescription = 'Intrusion Detected';
                  }
                } else {
                  eventDescription = 'Alarm Triggered';
                }
              } else if (isArm) {
                eventDescription = 'System Armed';
              } else if (isDisarm) {
                eventDescription = 'System Disarmed';
              }

              // Get event colors
              const eventColors = isAlarm ? {
                bg: 'bg-rose-50 border-rose-200',
                icon: 'text-rose-500'
              } : isMotion ? {
                bg: 'bg-blue-50 border-blue-200',
                icon: 'text-blue-500'
              } : isDoor ? {
                bg: 'bg-amber-50 border-amber-200',
                icon: 'text-amber-500'
              } : isLock ? {
                bg: 'bg-purple-50 border-purple-200',
                icon: 'text-purple-500'
              } : (isArm || isDisarm) ? {
                bg: 'bg-green-50 border-green-200',
                icon: 'text-green-500'
              } : {
                bg: 'bg-gray-50 border-gray-200',
                icon: 'text-gray-500'
              };

              return (
                <div key={event.id} className={`bg-white p-4 rounded-lg shadow border ${eventColors.bg} ${eventColors.bg.replace('bg-', 'border-')}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`${eventColors.icon}`}>
                        {isAlarm ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        ) : isDoor ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        ) : isMotion ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : isLock ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                          </svg>
                        ) : (isArm || isDisarm) ? (
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{eventDescription}</h3>
                        <p className="text-sm text-gray-600">{event.deviceName}</p>
                        <p className="text-xs text-gray-500">Area: {event.areaName}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}

            {recentEvents.length === 0 && !error && (
              <div className="text-center py-8 text-gray-500">
                No events found in the last 24 hours
              </div>
            )}
          </div>
        </div>
        <TabNav />
      </main>
    </>
  );
} 