'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSSEClient, FusionSSEClient } from '@/lib/sse';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';

interface ProcessedEvent {
  id: string;
  timestamp: Date;
  type: string;
  category: string;
  title: string;
  description: string;
  deviceName?: string;
  areaName?: string;
  locationName?: string;
  image?: {
    data: string;
    contentType: string;
    size: number;
  };
  severity: 'low' | 'medium' | 'high';
  rawData?: any;
}

export default function EventsPage() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ id: string; name: string; addressPostalCode: string } | null>(null);
  const [organization, setOrganization] = useState<{ name: string } | null>(null);
  const [sseClient, setSSEClient] = useState<FusionSSEClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();

  // Filtering state
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterDevice, setFilterDevice] = useState('all');
  const [showDebug, setShowDebug] = useState(false);
  const [maxEvents, setMaxEvents] = useState(100);

  // Helper function to extract device state from multiple possible locations
  // Helper function to map raw device states to display states (extensible for future devices)
  const mapRawStateToDisplayState = (rawState: string): string => {
    const stateMap: { [key: string]: string } = {
      // YoLink states
      'closed': 'Off',
      'open': 'On',
      // Common switch/outlet states
      'on': 'On',
      'off': 'Off',
      'true': 'On',
      'false': 'Off',
      '1': 'On',
      '0': 'Off',
      // Door/sensor states
      'opened': 'Open',
      'locked': 'Locked',
      'unlocked': 'Unlocked',
      'triggered': 'Triggered',
      'clear': 'Clear',
      // Motion/presence states
      'detected': 'Detected',
      'no_motion': 'Clear',
      'motion': 'Detected',
      // Environmental states
      'normal': 'Normal',
      'alarm': 'Alarm',
      'ok': 'OK',
      'error': 'Error'
    };
    
    return stateMap[rawState.toLowerCase()] || rawState;
  };

  const extractDeviceState = (rawData: any): string => {
    // Check multiple locations for device state
    let state = 'Unknown';
    
    // Debug logging for troubleshooting
    if (rawData.deviceName && rawData.deviceName.toLowerCase().includes('light')) {
      console.log('🔍 DEBUG - Light device found:', {
        deviceName: rawData.deviceName,
        eventDisplayState: rawData.event?.displayState,
        eventIntermediateState: rawData.event?.intermediateState,
        rawEventDataState: rawData.rawEvent?.data?.state,
        eventRawEventPayloadState: rawData.event?.rawEventPayload?.state,
        dataState: rawData.data?.state,
        fullRawData: rawData
      });
    }
    
    // Check in event.displayState or event.intermediateState first (preferred)
    if (rawData.event?.displayState) {
      state = rawData.event.displayState;
      console.log('✅ Found state in event.displayState:', state);
    } else if (rawData.event?.intermediateState) {
      state = rawData.event.intermediateState;
      console.log('✅ Found state in event.intermediateState:', state);
    }
    // Check in rawEvent.data.state (YoLink and other IoT platforms)
    else if (rawData.rawEvent?.data?.state) {
      const rawState = rawData.rawEvent.data.state;
      state = mapRawStateToDisplayState(rawState);
      console.log('✅ Found state in rawEvent.data.state:', rawState, '→', state);
    }
    // Check in event.rawEventPayload.state (alternative format)
    else if (rawData.event?.rawEventPayload?.state) {
      const rawState = rawData.event.rawEventPayload.state;
      state = mapRawStateToDisplayState(rawState);
      console.log('✅ Found state in event.rawEventPayload.state:', rawState, '→', state);
    }
    // Check in data.state (direct format)
    else if (rawData.data?.state) {
      const rawState = rawData.data.state;
      state = mapRawStateToDisplayState(rawState);
      console.log('✅ Found state in data.state:', rawState, '→', state);
    } else {
      console.log('❌ No state found in any location for device:', rawData.deviceName);
    }
    
    return state;
  };

  // Helper function to check if an event should be treated as a device state change
  const isDeviceStateEvent = (rawData: any): boolean => {
    const deviceName = (rawData.deviceName || '').toLowerCase();
    const eventCategory = rawData.event?.categoryId || rawData.event?.category || '';
    const eventType = rawData.event?.type || '';
    
    // Device type keywords to look for
    const deviceKeywords = [
      'light', 'switch', 'outlet', 'plug', 'socket',
      'fan', 'dimmer', 'relay', 'controller',
      'bulb', 'lamp', 'fixture'
    ];
    
    // Check if device name contains any device keywords
    const isDeviceByName = deviceKeywords.some(keyword => deviceName.includes(keyword));
    
    // Check if it's a diagnostic/check-in event with state information
    const isDiagnosticWithState = (
      (eventCategory === 'DIAGNOSTICS' || eventType === 'Device Check-in') &&
      (rawData.rawEvent?.data?.state || rawData.event?.rawEventPayload?.state || rawData.data?.state)
    );
    
    const result = isDeviceByName || isDiagnosticWithState;
    
    // Debug logging for light devices
    if (deviceName.includes('light')) {
      console.log('🔍 DEBUG - Device detection for light:', {
        deviceName: rawData.deviceName,
        eventCategory,
        eventType,
        isDeviceByName,
        isDiagnosticWithState,
        finalResult: result,
        hasRawEventDataState: !!rawData.rawEvent?.data?.state,
        hasEventRawEventPayloadState: !!rawData.event?.rawEventPayload?.state,
        hasDataState: !!rawData.data?.state
      });
    }
    
    return result;
  };

  const processEvent = (rawData: any, eventType: string): ProcessedEvent => {
    // Force rebuild - version 2.0
    console.log('🚀 PROCESSVENT V2.0 - Starting event processing:', { deviceName: rawData.deviceName, eventType });
    
    const timestamp = new Date(rawData.timestamp || Date.now());
    const eventUuid = rawData.eventUuid || `${eventType}-${Date.now()}`;
    
    let title = '';
    let description = '';
    let category = '';
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Check if this is actually a device state event regardless of event type
    if (isDeviceStateEvent(rawData)) {
      const deviceName = rawData.deviceName || 'Unknown Device';
      const deviceState = extractDeviceState(rawData);
      const lowerDeviceName = deviceName.toLowerCase();
      
      console.log('🎯 DEBUG - Processing as device state event:', {
        deviceName,
        deviceState,
        eventType
      });
      
      // Determine device type and create appropriate title/description
      if (lowerDeviceName.includes('light') || lowerDeviceName.includes('bulb') || lowerDeviceName.includes('lamp')) {
        title = deviceState === 'On' ? 'Light Turned On' : 'Light Turned Off';
        description = `${deviceName} is now ${deviceState.toLowerCase()}`;
        console.log('✅ DEBUG - Light processed:', { title, description });
      } else if (lowerDeviceName.includes('switch')) {
        title = deviceState === 'On' ? 'Switch Turned On' : 'Switch Turned Off';
        description = `${deviceName} is now ${deviceState.toLowerCase()}`;
      } else if (lowerDeviceName.includes('outlet') || lowerDeviceName.includes('plug') || lowerDeviceName.includes('socket')) {
        title = deviceState === 'On' ? 'Outlet Turned On' : 'Outlet Turned Off';
        description = `${deviceName} is now ${deviceState.toLowerCase()}`;
      } else if (lowerDeviceName.includes('fan')) {
        title = deviceState === 'On' ? 'Fan Turned On' : 'Fan Turned Off';
        description = `${deviceName} is now ${deviceState.toLowerCase()}`;
      } else if (lowerDeviceName.includes('dimmer')) {
        title = 'Dimmer State Changed';
        description = `${deviceName} changed to ${deviceState}`;
      } else {
        title = 'Device State Changed';
        description = `${deviceName} changed to ${deviceState}`;
      }
      
      category = 'device';
      severity = 'low';
    } else {
      // Process different event types
      switch (eventType) {
        case 'heartbeat':
          title = 'System Heartbeat';
          description = 'System is running normally';
          category = 'system';
          severity = 'low';
          break;

        case 'connection':
        case 'connection_confirmed':
          title = 'Connection Established';
          description = 'Successfully connected to event stream';
          category = 'system';
          severity = 'low';
          break;

        case 'device_state_change':
          const deviceName = rawData.deviceName || 'Unknown Device';
          const displayState = extractDeviceState(rawData);
          const lowerDeviceName = deviceName.toLowerCase();
          
          if (lowerDeviceName.includes('door')) {
            const mappedState = mapRawStateToDisplayState(displayState);
            title = mappedState === 'Open' || mappedState === 'On' ? 'Door Opened' : 'Door Closed';
            description = `${deviceName} was ${mappedState === 'Open' || mappedState === 'On' ? 'opened' : 'closed'}`;
            category = 'security';
            severity = 'medium';
          } else if (lowerDeviceName.includes('light') || lowerDeviceName.includes('bulb') || lowerDeviceName.includes('lamp')) {
            title = displayState === 'On' ? 'Light Turned On' : 'Light Turned Off';
            description = `${deviceName} is now ${displayState.toLowerCase()}`;
            category = 'device';
            severity = 'low';
          } else if (lowerDeviceName.includes('switch')) {
            title = displayState === 'On' ? 'Switch Turned On' : 'Switch Turned Off';
            description = `${deviceName} is now ${displayState.toLowerCase()}`;
            category = 'device';
            severity = 'low';
          } else if (lowerDeviceName.includes('outlet') || lowerDeviceName.includes('plug') || lowerDeviceName.includes('socket')) {
            title = displayState === 'On' ? 'Outlet Turned On' : 'Outlet Turned Off';
            description = `${deviceName} is now ${displayState.toLowerCase()}`;
            category = 'device';
            severity = 'low';
          } else if (lowerDeviceName.includes('fan')) {
            title = displayState === 'On' ? 'Fan Turned On' : 'Fan Turned Off';
            description = `${deviceName} is now ${displayState.toLowerCase()}`;
            category = 'device';
            severity = 'low';
          } else {
            title = 'Device State Changed';
            description = `${deviceName} changed to ${displayState}`;
            category = 'device';
            severity = 'low';
          }
          break;

        case 'security_event':
          title = 'Security Event';
          description = `Security event detected${rawData.deviceName ? ` on ${rawData.deviceName}` : ''}`;
          category = 'security';
          severity = 'medium';
          break;

        case 'unknown_event':
          // Handle arming events that come as unknown_event
          if (rawData.type === 'arming' && rawData.area) {
            const area = rawData.area;
            const previousState = area.previousStateDisplayName || area.previousState;
            const currentState = area.currentStateDisplayName || area.currentState;
            
            if (currentState === 'Armed' || currentState === 'ARMED_AWAY' || currentState === 'ARMED_HOME') {
              title = 'Area Armed';
              description = `${area.name} has been armed (${currentState})`;
              category = 'security';
              severity = 'high';
            } else if (currentState === 'Disarmed' || currentState === 'DISARMED') {
              title = 'Area Disarmed';
              description = `${area.name} has been disarmed`;
              category = 'security';
              severity = 'medium';
            } else {
              title = 'Area State Changed';
              description = `${area.name} changed from ${previousState} to ${currentState}`;
              category = 'security';
              severity = 'medium';
            }
          } else {
            title = 'Unknown Event';
            description = 'An unrecognized event occurred';
            category = 'other';
            severity = 'low';
          }
          break;

        case 'area_state_change':
          const areaName = rawData.areaName || 'Unknown Area';
          const eventTypeId = rawData.event?.typeId || rawData.event?.type;
          
          if (eventTypeId === 'ARMED' || eventTypeId === 'armed') {
            title = 'Area Armed';
            description = `${areaName} has been armed`;
            category = 'security';
            severity = 'high';
          } else if (eventTypeId === 'DISARMED' || eventTypeId === 'disarmed') {
            title = 'Area Disarmed';
            description = `${areaName} has been disarmed`;
            category = 'security';
            severity = 'medium';
          } else {
            title = 'Area State Changed';
            description = `${areaName} state changed`;
            category = 'security';
            severity = 'medium';
          }
          break;

        case 'alarm_event':
          title = 'Alarm Triggered';
          description = `Alarm event detected${rawData.deviceName ? ` on ${rawData.deviceName}` : ''}`;
          category = 'alarm';
          severity = 'high';
          break;

        default:
          title = 'System Event';
          description = `${eventType} event occurred`;
          category = 'other';
          severity = 'low';
          break;
      }
    }

    // Handle images (thumbnailData)
    let image: ProcessedEvent['image'] = undefined;
    if (rawData.thumbnailData) {
      image = {
        data: rawData.thumbnailData.data,
        contentType: rawData.thumbnailData.contentType,
        size: rawData.thumbnailData.size
      };
      // Events with images are likely more important
      if (severity === 'low') severity = 'medium';
    }

    return {
      id: eventUuid,
      timestamp,
      type: eventType,
      category,
      title,
      description,
      deviceName: rawData.deviceName,
      areaName: rawData.areaName || rawData.area?.name,
      locationName: rawData.locationName,
      image,
      severity,
      rawData: showDebug ? rawData : undefined
    };
  };

  // Add new event to the list
  const addEvent = (rawData: any, eventType: string) => {
    const processedEvent = processEvent(rawData, eventType);
    
    setEvents(prev => {
      const updated = [processedEvent, ...prev];
      return updated.slice(0, maxEvents); // Keep only last N events
    });
  };

  useEffect(() => {
    // Check if we have a user ID and organization
    const userId = localStorage.getItem('user_id');
    const organizationStr = localStorage.getItem('fusion_organization');
    const apiKey = localStorage.getItem('fusion_api_key');

    if (!userId) {
      router.push('/pin');
      return;
    }

    if (!organizationStr || !apiKey) {
      setError('Missing organization or API key');
      setLoading(false);
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
    try {
      const org = JSON.parse(organizationStr);
      setOrganization(org);
      
      // Connect to SSE
      const client = createSSEClient(org.id, apiKey);
      
      // Set up event listeners
      client.on('connected', () => {
        setIsConnected(true);
        setError('');
        setLoading(false);
        addEvent({ type: 'connection', message: 'Connected to event stream' }, 'connection');
      });

      client.on('disconnected', () => {
        setIsConnected(false);
        addEvent({ type: 'connection', message: 'Disconnected from event stream' }, 'connection');
      });

      client.on('error', (error: any) => {
        setError(`Connection error: ${error.message || error}`);
        setLoading(false);
        addEvent({ type: 'error', message: error.message || error, error }, 'error');
      });

      client.on('heartbeat', (data: any) => {
        addEvent(data, 'heartbeat');
      });

      client.on('connection_confirmed', (data: any) => {
        addEvent(data, 'connection_confirmed');
      });

      client.on('security_event', (data: any) => {
        addEvent(data, 'security_event');
      });

      client.on('device_state_change', (data: any) => {
        addEvent(data, 'device_state_change');
      });

      client.on('area_state_change', (data: any) => {
        addEvent(data, 'area_state_change');
      });

      client.on('alarm_event', (data: any) => {
        addEvent(data, 'alarm_event');
      });

      client.on('unknown_event', (data: any) => {
        addEvent(data, 'unknown_event');
      });

      setSSEClient(client);
      
      // Connect to the stream
      client.connect().catch(err => {
        setError(`Failed to connect: ${err.message}`);
        setLoading(false);
      });

    } catch (e) {
      setError('Failed to parse organization data');
      setLoading(false);
    }

    // Cleanup on unmount
    return () => {
      if (sseClient) {
        sseClient.disconnect();
      }
    };
  }, [router]);

  // Filter events based on current filters
  const filteredEvents = events.filter(event => {
    if (filterType !== 'all' && event.category !== filterType) return false;
    if (filterSeverity !== 'all' && event.severity !== filterSeverity) return false;
    if (filterDevice !== 'all' && event.deviceName !== filterDevice) return false;
    return true;
  });

  // Get unique values for filter dropdowns
  const uniqueDevices = [...new Set(events.map(e => e.deviceName).filter(Boolean))].sort();
  const uniqueCategories = [...new Set(events.map(e => e.category))].sort();

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
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Live Events</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {location?.name} • {filteredEvents.length} events
                  <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                {showDebug ? 'Hide Debug' : 'Show Debug'}
              </button>
            </div>
            
            {error && (
              <div className="mt-2 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="security">Security</option>
                  <option value="device">Device</option>
                  <option value="alarm">Alarm</option>
                  <option value="system">System</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
                <select
                  value={filterDevice}
                  onChange={(e) => setFilterDevice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Devices</option>
                  {uniqueDevices.map(device => (
                    <option key={device} value={device}>{device}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Events</label>
                <select
                  value={maxEvents}
                  onChange={(e) => setMaxEvents(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                </select>
              </div>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {filteredEvents.map((event) => {
              // Get colors based on category and severity
              let bgColor = 'bg-gray-50 border-gray-200';
              let iconColor = 'text-gray-500';
              
              if (event.category === 'security') {
                bgColor = event.severity === 'high' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200';
                iconColor = event.severity === 'high' ? 'text-red-500' : 'text-orange-500';
              } else if (event.category === 'alarm') {
                bgColor = 'bg-red-50 border-red-200';
                iconColor = 'text-red-500';
              } else if (event.category === 'device') {
                bgColor = 'bg-blue-50 border-blue-200';
                iconColor = 'text-blue-500';
              } else if (event.category === 'system') {
                bgColor = 'bg-green-50 border-green-200';
                iconColor = 'text-green-500';
              }

              return (
                <div key={event.id} className={`bg-white p-4 rounded-lg shadow border ${bgColor}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Icon */}
                      <div className={`${iconColor} mt-1`}>
                        {event.category === 'security' ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        ) : event.category === 'alarm' ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                        ) : event.category === 'device' ? (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Event Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            event.severity === 'high' ? 'bg-red-100 text-red-800' :
                            event.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {event.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{event.description}</p>
                        
                        {/* Device and Area info */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          {event.deviceName && (
                            <span>Device: {event.deviceName}</span>
                          )}
                          {event.areaName && (
                            <span>Area: {event.areaName}</span>
                          )}
                          {event.locationName && (
                            <span>Location: {event.locationName}</span>
                          )}
                        </div>

                        {/* Debug info */}
                        {showDebug && event.rawData && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                              Raw Event Data
                            </summary>
                            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(event.rawData, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>

                    {/* Image */}
                    {event.image && (
                      <div className="flex-shrink-0">
                        <img
                          src={`data:${event.image.contentType};base64,${event.image.data}`}
                          alt="Event image"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                    )}

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {event.timestamp.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredEvents.length === 0 && !error && (
              <div className="text-center py-8 text-gray-500">
                {events.length === 0 ? 'No events received yet' : 'No events match current filters'}
              </div>
            )}
          </div>
        </div>
        <TabNav />
      </main>
    </>
  );
} 