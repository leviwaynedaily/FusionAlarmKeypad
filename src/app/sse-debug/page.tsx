'use client';

import { useState, useEffect, useRef } from 'react';
import { createSSEClient, FusionSSEClient } from '@/lib/sse';

interface SSEEvent {
  id: string;
  timestamp: Date;
  type: string;
  category?: string;
  eventUuid?: string;
  deviceName?: string;
  areaName?: string;
  rawData: any;
}

export default function SSEDebugPage() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [sseClient, setSSEClient] = useState<FusionSSEClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [organizationId, setOrganizationId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string>('');
  
  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDevice, setFilterDevice] = useState('');
  const [maxEvents, setMaxEvents] = useState(100);
  
  // Display options
  const [showRawData, setShowRawData] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const eventIdCounter = useRef(0);

  // Helper to safely access localStorage during client-side render only
  const isBrowser = typeof window !== 'undefined';
  const fusionOrganizationStored = isBrowser ? localStorage.getItem('fusion_organization') : null;

  // Load saved credentials from localStorage and environment
  useEffect(() => {
    // Get API key from environment variable first, then localStorage
    const envApiKey = process.env.NEXT_PUBLIC_FUSION_API_KEY;
    const savedApiKey = localStorage.getItem('sse-debug-api-key');
    
    // Use environment API key if available, otherwise use saved
    if (envApiKey) {
      setApiKey(envApiKey);
    } else if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    
    // Get organization ID from main app or debug storage
    const mainAppOrg = localStorage.getItem('fusion_organization');
    const savedOrgId = localStorage.getItem('sse-debug-org-id');
    
    if (savedOrgId) {
      setOrganizationId(savedOrgId);
    } else if (mainAppOrg) {
      try {
        const orgData = JSON.parse(mainAppOrg);
        if (orgData && orgData.id) {
          setOrganizationId(orgData.id);
        }
      } catch (e) {
        console.warn('Failed to parse organization data from main app');
      }
    }
  }, []);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const addEvent = (rawData: any, eventType: string = 'unknown') => {
    const newEvent: SSEEvent = {
      id: `event-${++eventIdCounter.current}`,
      timestamp: new Date(),
      type: eventType,
      category: rawData.category,
      eventUuid: rawData.eventUuid,
      deviceName: rawData.deviceName,
      areaName: rawData.areaName || rawData.areaId,
      rawData
    };

    setEvents((prev: SSEEvent[]) => {
      const updated = [newEvent, ...prev];
      return updated.slice(0, maxEvents); // Keep only last N events
    });
  };

  const handleConnect = async () => {
    if (!organizationId.trim() || !apiKey.trim()) {
      setConnectionError('Please provide both Organization ID and API Key');
      return;
    }

    setIsConnecting(true);
    setConnectionError('');
    
    // Save credentials
    localStorage.setItem('sse-debug-org-id', organizationId);
    localStorage.setItem('sse-debug-api-key', apiKey);

    try {
      const client = createSSEClient(organizationId, apiKey);
      
      // Set up event listeners before connecting
      client.on('connected', () => {
        console.log('✅ SSE Debug Console: Connected');
        setIsConnected(true);
        setIsConnecting(false);
        addEvent({ type: 'connection', message: 'Connected to SSE stream' }, 'connection');
      });

      client.on('disconnected', () => {
        console.log('🔌 SSE Debug Console: Disconnected');
        setIsConnected(false);
        addEvent({ type: 'connection', message: 'Disconnected from SSE stream' }, 'disconnection');
      });

      client.on('error', (error: any) => {
        console.error('💥 SSE Debug Console: Error', error);
        setConnectionError(`Connection error: ${error.message || error}`);
        setIsConnecting(false);
        setIsConnected(false);
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

      client.on('device_check_in', (data: any) => {
        addEvent(data, 'device_check_in');
      });

      client.on('unknown_event', (data: any) => {
        addEvent(data, 'unknown_event');
      });

      setSSEClient(client);
      await client.connect();
      
    } catch (error: any) {
      console.error('Failed to connect:', error);
      setConnectionError(`Failed to connect: ${error.message || error}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (sseClient) {
      sseClient.disconnect();
      setSSEClient(null);
      setIsConnected(false);
    }
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sse-events-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter events based on current filters
  const filteredEvents = events.filter((event: SSEEvent) => {
    if (filterType && !event.type.toLowerCase().includes(filterType.toLowerCase())) return false;
    if (filterCategory && !event.category?.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    if (filterDevice && !event.deviceName?.toLowerCase().includes(filterDevice.toLowerCase())) return false;
    return true;
  });

  // Get unique values for filter dropdowns
  const uniqueTypes = [...new Set(events.map((e: SSEEvent) => e.type))].sort();
  const uniqueCategories = [...new Set(events.map((e: SSEEvent) => e.category).filter((cat): cat is string => Boolean(cat)))].sort();
  const uniqueDevices = [...new Set(events.map((e: SSEEvent) => e.deviceName).filter((device): device is string => Boolean(device)))].sort();

  const [locations, setLocations] = useState<any[]>([]);

  // Load locations using provided API key
  const handleLoadLocations = async () => {
    if (!apiKey.trim()) {
      alert('Enter API key first');
      return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fusion-bridge-production.up.railway.app'}/api/locations`, {
        headers: {
          'x-api-key': apiKey,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLocations(data.data || []);
    } catch (err:any) {
      alert('Failed to load locations: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            SSE Debug Console
          </h1>

          {/* Auto-populate Info */}
          {(process.env.NEXT_PUBLIC_FUSION_API_KEY || fusionOrganizationStored) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Auto-populated Credentials
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <ul className="list-disc pl-5 space-y-1">
                      {process.env.NEXT_PUBLIC_FUSION_API_KEY && (
                        <li>API Key automatically loaded from NEXT_PUBLIC_FUSION_API_KEY environment variable</li>
                      )}
                      {fusionOrganizationStored && (
                        <li>Organization ID loaded from main application session</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Connection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization ID
                {organizationId && fusionOrganizationStored && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(from main app)</span>
                )}
              </label>
              <input
                type="text"
                value={organizationId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationId(e.target.value)}
                disabled={isConnected || isConnecting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter organization ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API Key
                {process.env.NEXT_PUBLIC_FUSION_API_KEY && (
                  <span className="text-xs text-green-600 dark:text-green-400 ml-1">(from .env)</span>
                )}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                disabled={isConnected || isConnecting || !!process.env.NEXT_PUBLIC_FUSION_API_KEY}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  process.env.NEXT_PUBLIC_FUSION_API_KEY ? 'bg-green-50 dark:bg-green-900/20' : ''
                }`}
                placeholder={process.env.NEXT_PUBLIC_FUSION_API_KEY ? 'Using API key from environment' : 'Enter API key'}
              />
              {process.env.NEXT_PUBLIC_FUSION_API_KEY && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Using NEXT_PUBLIC_FUSION_API_KEY from .env.local file
                </p>
              )}
            </div>
            <div className="flex items-end space-x-2">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={handleLoadLocations}
                disabled={!apiKey || isConnected || isConnecting}
                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-40"
              >
                Load Locations
              </button>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center mb-4">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {isConnected && (
              <span className="ml-4 text-sm text-gray-600 dark:text-gray-400">
                Events: {events.length}
              </span>
            )}
          </div>

          {/* Connection Error */}
          {connectionError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {connectionError}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Filters & Controls
          </h2>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <select
                value={filterType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Types</option>
                {uniqueTypes.map((type: string) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={filterCategory}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Categories</option>
                {uniqueCategories.map((category: string) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Device
              </label>
              <select
                value={filterDevice}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Devices</option>
                {uniqueDevices.map((device: string) => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Events
              </label>
              <select
                value={maxEvents}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaxEvents(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>

          {/* Display Options */}
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showRawData}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowRawData(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Show Raw Data</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAutoScroll(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Auto Scroll</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={clearEvents}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear Events
            </button>
            <button
              onClick={exportEvents}
              disabled={events.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export Events
            </button>
          </div>
        </div>

        {/* Events Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Live Events ({filteredEvents.length})
            </h2>
          </div>
          
          <div 
            ref={eventsContainerRef}
            className="h-96 overflow-y-auto p-4 space-y-4"
          >
            {filteredEvents.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                {events.length === 0 ? 'No events received yet' : 'No events match current filters'}
              </div>
            ) : (
              filteredEvents.map((event: SSEEvent) => (
                <div key={event.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {/* Event Header */}
                  <div className="flex flex-wrap items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        event.type === 'heartbeat' ? 'bg-blue-100 text-blue-800' :
                        event.type === 'connection' || event.type === 'connection_confirmed' ? 'bg-green-100 text-green-800' :
                        event.type === 'error' ? 'bg-red-100 text-red-800' :
                        event.type === 'alarm_event' ? 'bg-red-100 text-red-800' :
                        event.type === 'device_state_change' ? 'bg-purple-100 text-purple-800' :
                        event.type === 'area_state_change' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.type}
                      </span>
                      {event.category && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {event.category}
                        </span>
                      )}
                      {event.eventUuid && (
                        <span className="text-xs text-gray-500 font-mono">
                          {event.eventUuid.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {event.timestamp.toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Event Details */}
                  <div className="space-y-1 text-sm">
                    {event.deviceName && (
                      <div><strong>Device:</strong> {event.deviceName}</div>
                    )}
                    {event.areaName && (
                      <div><strong>Area:</strong> {event.areaName}</div>
                    )}
                  </div>

                  {/* Raw Data */}
                  {showRawData && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                        Raw Event Data
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-x-auto">
                        {JSON.stringify(event.rawData, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Location dropdown */}
        {locations.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Location</label>
            <select
              value={organizationId}
              onChange={(e)=>setOrganizationId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">-- Choose --</option>
              {locations.map((loc:any)=> (
                <option key={loc.id} value={loc.organizationId || loc.organization_id || ''}>{loc.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}