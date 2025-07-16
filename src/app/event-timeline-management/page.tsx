'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EventFilterSettings, EventTypeDisplaySettings, getEventTypes } from '@/lib/api';
import { EventTypeInfo } from '@/types/alarmKeypad';
import { IconPicker } from '@/components/ui/IconPicker';

interface CustomEventNames {
  [eventType: string]: string;
}

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
  const [customEventNames, setCustomEventNames] = useState<CustomEventNames>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [editingEventName, setEditingEventName] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [showQuickGuide, setShowQuickGuide] = useState(false);

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

    const savedCustomNames = localStorage.getItem('custom_event_names');
    if (savedCustomNames) {
      try {
        setCustomEventNames(JSON.parse(savedCustomNames));
      } catch (e) {
        console.error('Failed to parse saved custom event names:', e);
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

  useEffect(() => {
    localStorage.setItem('custom_event_names', JSON.stringify(customEventNames));
  }, [customEventNames]);

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

  // Get custom name or default name
  const getEventDisplayName = (eventType: EventTypeInfo): string => {
    return customEventNames[eventType.eventType] || eventType.displayName;
  };

  // Start editing event name
  const startEditingEventName = (eventType: string, currentName: string) => {
    setEditingEventName(eventType);
    setEditingValue(currentName);
  };

  // Save edited event name
  const saveEventName = () => {
    if (editingEventName && editingValue.trim()) {
      setCustomEventNames(prev => ({
        ...prev,
        [editingEventName]: editingValue.trim()
      }));
    }
    setEditingEventName(null);
    setEditingValue('');
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingEventName(null);
    setEditingValue('');
  };

  // Reset custom name to default
  const resetEventName = (eventType: string) => {
    setCustomEventNames(prev => {
      const updated = { ...prev };
      delete updated[eventType];
      return updated;
    });
  };

  // Get unique categories
  const categories = Array.from(new Set(availableEventTypes.map(et => et.category).filter((cat): cat is string => Boolean(cat))));

  // Filter event types based on search and category
  const filteredEventTypes = availableEventTypes.filter(eventType => {
    const customName = getEventDisplayName(eventType);
    const matchesSearch = searchTerm === '' || 
      customName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eventType.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eventType.sampleDevices.some(device => device.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = selectedCategory === 'all' || eventType.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loadingEventTypes) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22c55f] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading event types...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Event Timeline Management
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block">
                  Customize event names and timeline appearance
                </p>
              </div>
            </div>
            
            {/* Global Toggle - Using signature green */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                Show All
              </span>
              <button
                onClick={() => toggleShowAllEvents(!eventFilterSettings.showAllEvents)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  eventFilterSettings.showAllEvents 
                    ? 'bg-[#22c55f]' 
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

      {/* Filters - Updated styling */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#22c55f] focus:border-[#22c55f]"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#22c55f] focus:border-[#22c55f]"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Event Types ({filteredEventTypes.length})
          </h2>
          {eventFilterSettings.showAllEvents && (
            <div className="text-xs text-[#22c55f] bg-[#22c55f]/10 border border-[#22c55f] px-2 py-1 rounded">
              Global override active
            </div>
          )}
        </div>

        {/* Optimized Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[calc(100vh-300px)] overflow-y-auto">
          {filteredEventTypes.map((eventType, index) => {
            const settings = getEventTypeSettings(eventType.eventType);
            const displayName = getEventDisplayName(eventType);
            const isEditing = editingEventName === eventType.eventType;

            return (
              <div key={`${eventType.eventType}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <span className="text-xl flex-shrink-0">{eventType.icon}</span>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-[#22c55f] rounded focus:outline-none focus:ring-2 focus:ring-[#22c55f] dark:bg-gray-700 dark:border-[#22c55f] dark:text-gray-100"
                            autoFocus
                          />
                          <div className="flex space-x-1">
                            <button
                              onClick={saveEventName}
                              className="px-2 py-1 text-xs bg-[#22c55f] text-white rounded hover:bg-[#16a34a]"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-300"
                            >
                              Cancel
                            </button>
                            {customEventNames[eventType.eventType] && (
                              <button
                                onClick={() => resetEventName(eventType.eventType)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="cursor-pointer group"
                          onClick={() => startEditingEventName(eventType.eventType, displayName)}
                        >
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-[#22c55f]">
                            {displayName}
                            {customEventNames[eventType.eventType] && (
                              <span className="ml-1 text-xs text-[#22c55f]">✏️</span>
                            )}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Click to rename • {eventType.count.toLocaleString()} events
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <button
                      onClick={() => updateEventTypeSettings(eventType.eventType, { 
                        showInTimeline: !settings.showInTimeline 
                      })}
                      className={`ml-2 flex-shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        settings.showInTimeline 
                          ? 'bg-[#22c55f]' 
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      disabled={eventFilterSettings.showAllEvents}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          settings.showInTimeline ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  )}
                </div>

                {!isEditing && (
                  <>
                    {/* Category & Sample Devices - Compact */}
                    <div className="mb-3">
                      {eventType.category && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded mb-2">
                          {eventType.category}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {eventType.sampleDevices.slice(0, 2).join(', ')}
                        {eventType.sampleDevices.length > 2 && ` +${eventType.sampleDevices.length - 2}`}
                      </p>
                    </div>

                    {/* Display Controls - Updated colors */}
                    <div className="space-y-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => updateEventTypeSettings(eventType.eventType, { displayMode: 'thumbnail' })}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                            settings.displayMode === 'thumbnail'
                              ? 'bg-[#22c55f]/10 text-[#22c55f] border border-[#22c55f]'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          📸 Image
                        </button>
                        <button
                          onClick={() => updateEventTypeSettings(eventType.eventType, { displayMode: 'icon' })}
                          className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                            settings.displayMode === 'icon'
                              ? 'bg-[#22c55f]/10 text-[#22c55f] border border-[#22c55f]'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {settings.customIcon} Icon
                        </button>
                      </div>

                      {settings.displayMode === 'icon' && (
                        <button
                          onClick={() => setShowIconPicker(eventType.eventType)}
                          className="w-full flex items-center justify-center space-x-1 px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          <span>{settings.customIcon}</span>
                          <span>Change Icon</span>
                        </button>
                      )}
                    </div>

                    {/* Mini Preview */}
                    <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center text-xs">
                          {settings.displayMode === 'thumbnail' ? '📷' : settings.customIcon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {displayName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {filteredEventTypes.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 text-4xl mb-4">🔍</div>
            <p className="text-gray-600 dark:text-gray-400">
              No events found matching your search criteria.
            </p>
          </div>
        )}

        {/* Collapsible Help */}
        <div className="mt-6">
          <button
            onClick={() => setShowQuickGuide(!showQuickGuide)}
            className="w-full flex items-center justify-between p-4 bg-[#22c55f]/10 border border-[#22c55f] rounded-lg hover:bg-[#22c55f]/20 transition-all"
          >
            <div className="flex items-center">
              <span className="text-[#22c55f] mr-2">💡</span>
              <span className="font-medium text-[#22c55f]">Quick Guide</span>
            </div>
            <svg 
              className={`w-5 h-5 text-[#22c55f] transform transition-transform ${showQuickGuide ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showQuickGuide && (
            <div className="mt-2 p-4 bg-[#22c55f]/5 border border-[#22c55f]/20 rounded-lg">
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <li className="flex items-start">
                  <span className="text-[#22c55f] mr-2 mt-0.5">•</span>
                  <span><strong>Click event names</strong> to rename them for better recognition</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#22c55f] mr-2 mt-0.5">•</span>
                  <span><strong>Toggle switches</strong> control which events appear in timeline</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#22c55f] mr-2 mt-0.5">•</span>
                  <span><strong>Image mode</strong> shows camera screenshots when available</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#22c55f] mr-2 mt-0.5">•</span>
                  <span><strong>Icon mode</strong> uses custom icons for faster loading and data savings</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#22c55f] mr-2 mt-0.5">•</span>
                  <span><strong>Global &quot;Show All&quot;</strong> overrides individual settings when enabled</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#22c55f] mr-2 mt-0.5">•</span>
                  <span><strong>Custom names &amp; settings</strong> are saved locally to your browser</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Icon Picker Modal - Updated colors */}
      {showIconPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Choose Icon
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
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
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