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
  const mapRawStateToDisplayState = (rawState: string | boolean | number): string => {
    // Handle non-string values
    if (typeof rawState === 'boolean') {
      return rawState ? 'On' : 'Off';
    }
    
    if (typeof rawState === 'number') {
      return rawState === 1 ? 'On' : rawState === 0 ? 'Off' : rawState.toString();
    }
    
    // Handle null/undefined
    if (rawState === null || rawState === undefined) {
      return 'Unknown';
    }
    
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
      'error': 'Error',
      // Power states (various formats)
      'power_on': 'On',
      'power_off': 'Off',
      'powered_on': 'On',
      'powered_off': 'Off',
      'turned_on': 'On',
      'turned_off': 'Off',
      'switch_on': 'On',
      'switch_off': 'Off',
      'light_on': 'On',
      'light_off': 'Off',
      // Active/inactive states
      'active': 'On',
      'inactive': 'Off',
      'enabled': 'On',
      'disabled': 'Off',
      // Numeric strings
      'yes': 'On',
      'no': 'Off',
      // Other common states
      'up': 'On',
      'down': 'Off',
      'high': 'On',
      'low': 'Off'
    };
    
    const normalizedState = rawState.toString().toLowerCase().trim();
    return stateMap[normalizedState] || rawState.toString();
  };

  const extractDeviceState = (rawData: any): string => {
    // With normalized data, we primarily use event.displayState
    if (rawData.event?.displayState) {
      return rawData.event.displayState;
    }
    
    // Fallback to intermediateState if displayState is not available
    if (rawData.event?.intermediateState) {
      return mapRawStateToDisplayState(rawData.event.intermediateState);
    }
    
    // Default fallback
    return 'Unknown';
  };

  // Helper function to check if an event should be treated as a device state change
  const isDeviceStateEvent = (rawData: any): boolean => {
    // With normalized data, we can check the categoryId directly
    const categoryId = rawData.event?.categoryId;
    const typeId = rawData.event?.typeId;
    
    // Check if it's a device state event based on normalized categoryId
    if (categoryId === 'DEVICE_STATE' || categoryId === 'Device State') {
      return true;
    }
    
    // Check if it's a state change event based on normalized typeId
    if (typeId === 'STATE_CHANGED' || typeId === 'State Changed') {
      return true;
    }
    
    // Fallback: check if device name suggests it's a controllable device
    const deviceName = (rawData.deviceName || '').toLowerCase();
    const deviceKeywords = ['light', 'switch', 'outlet', 'plug', 'socket', 'fan', 'dimmer', 'bulb', 'lamp'];
    
    return deviceKeywords.some(keyword => deviceName.includes(keyword));
  };

  // Enhanced device type detection
  const detectDeviceType = (deviceName: string): string => {
    const lowerName = deviceName.toLowerCase();
    
    // Light devices (most specific first)
    if (lowerName.includes('light') || lowerName.includes('bulb') || lowerName.includes('lamp')) {
      return 'light';
    }
    
    // Switch devices
    if (lowerName.includes('switch')) {
      return 'switch';
    }
    
    // Outlet/plug devices
    if (lowerName.includes('outlet') || lowerName.includes('plug') || lowerName.includes('socket')) {
      return 'outlet';
    }
    
    // Fan devices
    if (lowerName.includes('fan')) {
      return 'fan';
    }
    
    // Dimmer devices
    if (lowerName.includes('dimmer')) {
      return 'dimmer';
    }
    
    // Door devices
    if (lowerName.includes('door') || lowerName.includes('garage')) {
      return 'door';
    }
    
    // Lock devices
    if (lowerName.includes('lock')) {
      return 'lock';
    }
    
    return 'unknown';
  };

  // Enhanced state detection
  const normalizeState = (state: string): string => {
    if (!state) return '';
    const lowerState = state.toLowerCase();
    
    // On states
    if (/^(on|open|opened|active|enabled|armed|true|1|yes|up|high)$/i.test(lowerState)) {
      return 'on';
    }
    
    // Off states  
    if (/^(off|closed|inactive|disabled|disarmed|false|0|no|down|low)$/i.test(lowerState)) {
      return 'off';
    }
    
    return lowerState;
  };

  const processEvent = (rawData: any, eventType: string): ProcessedEvent => {
    const timestamp = new Date(rawData.timestamp || Date.now());
    const eventUuid = rawData.eventUuid || `${eventType}-${Date.now()}`;
    
    let title = '';
    let description = '';
    let category = '';
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Check if this is a device state event using normalized data
    if (isDeviceStateEvent(rawData)) {
      const deviceName = rawData.deviceName || 'Unknown Device';
      const deviceState = extractDeviceState(rawData);
      const deviceType = detectDeviceType(deviceName);
      const normalizedState = normalizeState(deviceState);
      
      // Create clean event messages based on device type and state using consistent format
      if (['light', 'switch', 'outlet', 'fan'].includes(deviceType)) {
        // For controllable devices, use "Device Name turned On/Off" format
        if (normalizedState === 'on') {
          title = `${deviceName} turned On`;
          description = `${deviceName} turned on`;
        } else if (normalizedState === 'off') {
          title = `${deviceName} turned Off`;
          description = `${deviceName} turned off`;
        } else {
          title = `${deviceName} State Changed`;
          description = `${deviceName} changed to ${deviceState}`;
        }
      } else if (deviceType === 'door') {
        // For doors, use action-based descriptions
        if (normalizedState === 'on') {
          title = `${deviceName} Opened`;
          description = `${deviceName} was opened`;
        } else if (normalizedState === 'off') {
          title = `${deviceName} Closed`;
          description = `${deviceName} was closed`;
        } else {
          title = `${deviceName} State Changed`;
          description = `${deviceName} changed to ${deviceState}`;
        }
      } else if (deviceType === 'lock') {
        // For locks, use action-based descriptions
        if (deviceState && /unlock/i.test(deviceState)) {
          title = `${deviceName} Unlocked`;
          description = `${deviceName} was unlocked`;
        } else if (deviceState && /lock/i.test(deviceState)) {
          title = `${deviceName} Locked`;
          description = `${deviceName} was locked`;
        } else {
          title = `${deviceName} State Changed`;
          description = `${deviceName} changed to ${deviceState}`;
        }
      } else if (deviceType === 'dimmer') {
        title = `${deviceName} Adjusted`;
        description = `${deviceName} changed to ${deviceState}`;
      } else {
        title = `${deviceName} Updated`;
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
          const deviceType = detectDeviceType(deviceName);
          const normalizedState = normalizeState(displayState);
          
          if (deviceType === 'door') {
            const mappedState = mapRawStateToDisplayState(displayState);
            title = normalizedState === 'on' ? `${deviceName} Opened` : `${deviceName} Closed`;
            description = `${deviceName} was ${normalizedState === 'on' ? 'opened' : 'closed'}`;
            category = 'security';
            severity = 'medium';
          } else if (['light', 'switch', 'outlet', 'fan'].includes(deviceType)) {
            // For controllable devices, use "Device Name turned On/Off" format
            if (normalizedState === 'on') {
              title = `${deviceName} turned On`;
              description = `${deviceName} turned on`;
            } else if (normalizedState === 'off') {
              title = `${deviceName} turned Off`;
              description = `${deviceName} turned off`;
            } else {
              title = `${deviceName} State Changed`;
              description = `${deviceName} changed to ${displayState}`;
            }
            category = 'device';
            severity = 'low';
          } else if (deviceType === 'lock') {
            if (displayState && /unlock/i.test(displayState)) {
              title = `${deviceName} Unlocked`;
              description = `${deviceName} was unlocked`;
            } else if (displayState && /lock/i.test(displayState)) {
              title = `${deviceName} Locked`;
              description = `${deviceName} was locked`;
            } else {
              title = `${deviceName} State Changed`;
              description = `${deviceName} changed to ${displayState}`;
            }
            category = 'security';
            severity = 'medium';
          } else {
            title = `${deviceName} Updated`;
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
    
    // 🔒 SECURITY: Get API key from secure storage
    let apiKey = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
    if (!apiKey && typeof window !== 'undefined') {
      // Try encrypted sessionStorage
      const sessionKey = sessionStorage.getItem('fusion_secure_api_key');
      if (sessionKey) {
        try {
          const keyData = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'fallback-key';
          const decoded = atob(sessionKey);
          let result = '';
          for (let i = 0; i < decoded.length; i++) {
            const keyChar = keyData.charCodeAt(i % keyData.length);
            const encChar = decoded.charCodeAt(i);
            result += String.fromCharCode(encChar ^ keyChar);
          }
          apiKey = result;
        } catch {
          // Migration from old localStorage
          const oldKey = localStorage.getItem('fusion_api_key');
          if (oldKey) {
            console.log('🔒 Migrating API key from localStorage in events page');
            apiKey = oldKey;
            localStorage.removeItem('fusion_api_key');
          }
        }
      }
    }

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
      const client = createSSEClient(apiKey);
      
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
                bgColor = 'bg-[#22c55f]/5 border-[#22c55f]/20';
                iconColor = 'text-[#22c55f]';
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