'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EventFilterSettings, EventTypeDisplaySettings, getEventTypes } from '@/lib/api';
import { EventTypeInfo } from '@/types/alarmKeypad';
import { IconPicker } from '@/components/ui/IconPicker';

export default function EventTimelineManagementPage() {
  const router = useRouter();
  const [availableEventTypes, setAvailableEventTypes] = useState<EventTypeInfo[]>([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);
  const [eventFilterSettings, setEventFilterSettings] = useState<EventFilterSettings>({
    showSpaceEvents: true,
    showAlarmZoneEvents: true,
    showAllEvents: true,
    showOnlyAlarmZoneEvents: false,
    selectedAlarmZones: [],
    eventTypes: {},
    categories: {},
    eventTypeSettings: {}
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('event_filter_settings');
    if (savedSettings) {
      try {
        setEventFilterSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to parse saved event filter settings:', e);
      }
    }
  }, []);

  // Load event types from API
  useEffect(() => {
    const loadEventTypes = async () => {
      setLoadingEventTypes(true);
      try {
        // Get organization from localStorage or use default
        const organizationId = localStorage.getItem('selected_organization_id') || 'GF1qXccUcdNJbIkUAbYR9SKAEwVonZZK';
        const locationId = localStorage.getItem('selected_location_id');
        
        const response = await getEventTypes(organizationId, locationId || undefined);
        if (response.data && response.data.eventTypes) {
          setAvailableEventTypes(response.data.eventTypes);
        }
      } catch (error) {
        console.error('Failed to load event types:', error);
      } finally {
        setLoadingEventTypes(false);
      }
    };

    loadEventTypes();
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('event_filter_settings', JSON.stringify(eventFilterSettings));
  }, [eventFilterSettings]);

  // Get display settings for an event type
  const getEventTypeSettings = (eventType: string): EventTypeDisplaySettings => {
    return eventFilterSettings.eventTypeSettings[eventType] || {
      showInTimeline: eventFilterSettings.eventTypes[eventType] ?? true,
      displayMode: 'thumbnail',
      customIcon: '🔔'
    };
  };

  // Update event type settings
  const updateEventTypeSettings = (eventType: string, settings: Partial<EventTypeDisplaySettings>) => {
    const currentSettings = getEventTypeSettings(eventType);
    const newSettings = { ...currentSettings, ...settings };
    
    setEventFilterSettings(prev => ({
      ...prev,
      eventTypeSettings: {
        ...prev.eventTypeSettings,
        [eventType]: newSettings
      }
    }));
  };

  // Toggle global "Show All Events" setting
  const toggleShowAllEvents = (enabled: boolean) => {
    setEventFilterSettings(prev => ({
      ...prev,
      showAllEvents: enabled
    }));
  };

  // Get unique categories
  const categories = Array.from(new Set(availableEventTypes.map(et => et.category).filter((cat): cat is string => Boolean(cat))));

  // Filter event types based on search and category
  const filteredEventTypes = availableEventTypes.filter(eventType => {
    const matchesSearch = searchTerm === '' || 
      eventType.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eventType.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eventType.sampleDevices.some(device => device.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = selectedCategory === 'all' || eventType.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loadingEventTypes) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading event types...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Settings
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Event Timeline Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Control what events show in the timeline and how they appear
              </p>
            </div>
            
            {/* Global Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show All Events
                </label>
                <button
                  onClick={() => toggleShowAllEvents(!eventFilterSettings.showAllEvents)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    eventFilterSettings.showAllEvents 
                      ? 'bg-blue-600' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      eventFilterSettings.showAllEvents ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Events
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by event name, type, or device..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Category Filter */}
            <div className="sm:w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Event Types ({filteredEventTypes.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Configure how each event type appears in the timeline
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              💡 Each event type has its own card with all controls and a live preview
            </p>
          </div>

          {/* Card-based layout for better mobile/responsive experience */}
          <div className="space-y-4">
            {filteredEventTypes.map((eventType, index) => {
              const settings = getEventTypeSettings(eventType.eventType);
              return (
                <div key={`${eventType.eventType}-${index}`} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{eventType.icon}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {eventType.displayName}
                        </h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {eventType.count.toLocaleString()} events
                          </span>
                          {eventType.category && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                              {eventType.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show in Timeline Toggle */}
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Show in Timeline:</span>
                      <button
                        onClick={() => updateEventTypeSettings(eventType.eventType, { 
                          showInTimeline: !settings.showInTimeline 
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.showInTimeline 
                            ? 'bg-blue-600' 
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        disabled={eventFilterSettings.showAllEvents}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            settings.showInTimeline ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Sample Devices */}
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sample Devices: </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {eventType.sampleDevices.slice(0, 3).join(', ')}
                      {eventType.sampleDevices.length > 3 && (
                        <span className="text-gray-400"> +{eventType.sampleDevices.length - 3} more</span>
                      )}
                    </span>
                  </div>

                  {/* Display Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Display Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Mode:
                      </label>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateEventTypeSettings(eventType.eventType, { displayMode: 'thumbnail' })}
                          className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                            settings.displayMode === 'thumbnail'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          📸 Camera Image
                        </button>
                        <button
                          onClick={() => updateEventTypeSettings(eventType.eventType, { displayMode: 'icon' })}
                          className={`flex-1 px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                            settings.displayMode === 'icon'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {settings.customIcon} Custom Icon
                        </button>
                      </div>
                    </div>

                    {/* Custom Icon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Custom Icon:
                      </label>
                      <button
                        onClick={() => setShowIconPicker(eventType.eventType)}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={settings.displayMode !== 'icon'}
                      >
                        <span className="text-lg">{settings.customIcon}</span>
                        <span className="text-sm">Choose Icon</span>
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Override Warning */}
                  {eventFilterSettings.showAllEvents && (
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        ⚠️ Individual settings are overridden by &quot;Show All Events&quot; toggle above
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timeline Preview:</div>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                        {settings.displayMode === 'thumbnail' ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            📷
                          </div>
                        ) : (
                          <span className="text-lg">{settings.customIcon}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {eventType.sampleDevices[0] || 'Sample Device'}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {eventType.displayName}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEventTypes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 text-lg mb-2">📋</div>
              <p className="text-gray-600 dark:text-gray-400">
                No events found matching your search criteria.
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 How Event Display Works
          </h3>
          <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <p><strong>📸 Image Mode:</strong> Shows the base64 image from the event (if available)</p>
            <p><strong>{getEventTypeSettings('').customIcon} Icon Mode:</strong> Shows your chosen icon instead of camera images</p>
            <p><strong>Fallback:</strong> If image mode fails, it automatically shows the default icon</p>
            <p><strong>Performance:</strong> Icon mode is faster and uses less bandwidth</p>
            <p><strong>Perfect for:</strong> Device check-ins, heartbeats, and non-camera events</p>
          </div>
        </div>
      </div>

      {/* Icon Picker Modal */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                         <div className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                   Choose Icon for {showIconPicker}
                 </h3>
                 <button
                   onClick={() => setShowIconPicker(null)}
                   className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
               <IconPicker
                 selectedIcon={getEventTypeSettings(showIconPicker).customIcon}
                 onIconSelect={(icon) => {
                   updateEventTypeSettings(showIconPicker, { customIcon: icon });
                   setShowIconPicker(null);
                 }}
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
} 