import React, { useState } from 'react';
import { Area, Device } from '@/lib/api';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface AlarmZone {
  id: string;
  name: string;
  color: string;
  areas: string[];
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  
  // API and system props
  apiKey: string;
  onApiKeyUpdate: (key: string) => void;
  weather: WeatherData | null;
  selectedLocation: any;
  organization: any;
  
  // Display options
  showZonesPreview: boolean;
  onShowZonesPreviewChange: (value: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (value: boolean) => void;
  highlightPinButtons: boolean;
  onHighlightPinButtonsChange: (value: boolean) => void;
  
  // SSE and events
  sseEnabled: boolean;
  onSSEEnabledChange: (value: boolean) => void;
  sseConnected: boolean;
  lastSSEEvent: string;
  showLiveEvents: boolean;
  onShowLiveEventsChange: (value: boolean) => void;
  
  // Design options
  useTestDesign: boolean;
  onUseTestDesignChange: (value: boolean) => void;
  useTestDesign2: boolean;
  onUseTestDesign2Change: (value: boolean) => void;
  
  // System status
  systemStatus: 'online' | 'degraded' | 'offline';
  deviceConnectivity: 'all_online' | 'some_offline' | 'all_offline';
  offlineDevices: string[];
  lastHeartbeat: number;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  
  // Alarm zones
  areas: Area[];
  alarmZones: AlarmZone[];
  onAlarmZonesChange: (zones: AlarmZone[]) => void;
  
  // Location change
  onLocationChange: () => void;
  
  // New prop
  requireApiKey?: boolean;
}

export function SettingsModal({ 
  open, 
  onClose,
  apiKey,
  onApiKeyUpdate,
  weather,
  selectedLocation,
  organization,
  showZonesPreview,
  onShowZonesPreviewChange,
  showSeconds,
  onShowSecondsChange,
  highlightPinButtons,
  onHighlightPinButtonsChange,
  sseEnabled,
  onSSEEnabledChange,
  sseConnected,
  lastSSEEvent,
  showLiveEvents,
  onShowLiveEventsChange,
  useTestDesign,
  onUseTestDesignChange,
  useTestDesign2,
  onUseTestDesign2Change,
  systemStatus,
  deviceConnectivity,
  offlineDevices,
  lastHeartbeat,
  theme,
  onThemeChange,
  areas,
  alarmZones,
  onAlarmZonesChange,
  onLocationChange,
  requireApiKey = false
}: SettingsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-[#0f0f0f] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-gray-100 dark:bg-[#0f0f0f] px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 bg-white dark:bg-[#1a1a1a] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Warning for missing API key */}
        {requireApiKey && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded text-center">
            Fusion API key required. Please enter your key to continue.
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">


              {/* Organization Section */}
              {organization && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Organization</h3>
                  <div className="space-y-1">
                    <p className="text-base text-gray-900 dark:text-white font-medium">{organization.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">ID: {organization.id}</p>
                    {organization.slug && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">Slug: {organization.slug}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Location Section */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Current Location</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{selectedLocation?.name || 'No location selected'}</p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-2 space-y-1">
                  {selectedLocation?.addressPostalCode && (
                    <p>Postal Code: {selectedLocation.addressPostalCode}</p>
                  )}
                  {weather && (
                    <p>Weather: {weather.temp}°F</p>
                  )}
                  <p>
                    Timezone: {selectedLocation?.timeZone ? (
                      <span className="text-[#22c55f]">{selectedLocation.timeZone}</span>
                    ) : (
                      <span className="text-amber-500">Not specified</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onLocationChange();
                  }}
                  className="px-4 py-2 bg-[#22c55f]/10 text-[#22c55f] border border-[#22c55f] rounded-md text-sm hover:bg-[#22c55f]/20 transition-all font-medium"
                >
                  Change Location
                </button>
              </div>

              {/* Display Options */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Display Options</h3>
                <div className="space-y-3">
                  {/* Show Zone Status */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Show Zone Status on PIN Screen</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Display current zone status while entering PIN</p>
                    </div>
                    <button
                      onClick={() => onShowZonesPreviewChange(!showZonesPreview)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        showZonesPreview ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showZonesPreview ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Seconds */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Show Seconds on Clock</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Display seconds in the time display</p>
                    </div>
                    <button
                      onClick={() => onShowSecondsChange(!showSeconds)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        showSeconds ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showSeconds ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Highlight PIN Buttons */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Highlight PIN Buttons on Press</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Show green highlight when pressing PIN buttons</p>
                    </div>
                    <button
                      onClick={() => onHighlightPinButtonsChange(!highlightPinButtons)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        highlightPinButtons ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          highlightPinButtons ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Real-time Events (SSE) */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Real-time Updates (SSE)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Use real-time event streaming instead of polling
                        {sseConnected && <span className="text-[#22c55f] ml-1">• Connected</span>}
                        {!sseConnected && sseEnabled && <span className="text-amber-500 ml-1">• Connecting...</span>}
                      </p>
                      {lastSSEEvent && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          Last: {lastSSEEvent}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onSSEEnabledChange(!sseEnabled)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        sseEnabled ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          sseEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Show Live Events on Main Screen */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">Show Live Events on Main Screen</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Display recent activity ticker on alarm screen</p>
                    </div>
                    <button
                      onClick={() => onShowLiveEventsChange(!showLiveEvents)}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        showLiveEvents ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          showLiveEvents ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Timeline Event Settings */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Timeline Event Settings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Control which events appear in the timeline</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Event with Images */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Camera Events</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">Security Camera Events</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Motion detection, person detection, etc.</p>
                      </div>
                      <button
                        onClick={() => {
                          const current = JSON.parse(localStorage.getItem('timeline_events') || '{"camera": true, "lights": true, "doors": true, "motion": true, "security": true}');
                          const updated = { ...current, camera: !current.camera };
                          localStorage.setItem('timeline_events', JSON.stringify(updated));
                          // Force re-render by updating a state or calling a callback
                        }}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                          JSON.parse(localStorage.getItem('timeline_events') || '{"camera": true}').camera ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            JSON.parse(localStorage.getItem('timeline_events') || '{"camera": true}').camera ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Device Events */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">Device Events</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">Light Switches</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Light on/off events</p>
                        </div>
                        <button
                          onClick={() => {
                            const current = JSON.parse(localStorage.getItem('timeline_events') || '{"lights": true}');
                            const updated = { ...current, lights: !current.lights };
                            localStorage.setItem('timeline_events', JSON.stringify(updated));
                          }}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                            JSON.parse(localStorage.getItem('timeline_events') || '{"lights": true}').lights ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              JSON.parse(localStorage.getItem('timeline_events') || '{"lights": true}').lights ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">Door Events</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Door open/close, lock/unlock</p>
                        </div>
                        <button
                          onClick={() => {
                            const current = JSON.parse(localStorage.getItem('timeline_events') || '{"doors": true}');
                            const updated = { ...current, doors: !current.doors };
                            localStorage.setItem('timeline_events', JSON.stringify(updated));
                          }}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                            JSON.parse(localStorage.getItem('timeline_events') || '{"doors": true}').doors ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              JSON.parse(localStorage.getItem('timeline_events') || '{"doors": true}').doors ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">Motion Sensors</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Motion detected events</p>
                        </div>
                        <button
                          onClick={() => {
                            const current = JSON.parse(localStorage.getItem('timeline_events') || '{"motion": true}');
                            const updated = { ...current, motion: !current.motion };
                            localStorage.setItem('timeline_events', JSON.stringify(updated));
                          }}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                            JSON.parse(localStorage.getItem('timeline_events') || '{"motion": true}').motion ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              JSON.parse(localStorage.getItem('timeline_events') || '{"motion": true}').motion ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">Security Events</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Arm/disarm, alarms, etc.</p>
                        </div>
                        <button
                          onClick={() => {
                            const current = JSON.parse(localStorage.getItem('timeline_events') || '{"security": true}');
                            const updated = { ...current, security: !current.security };
                            localStorage.setItem('timeline_events', JSON.stringify(updated));
                          }}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                            JSON.parse(localStorage.getItem('timeline_events') || '{"security": true}').security ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              JSON.parse(localStorage.getItem('timeline_events') || '{"security": true}').security ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">📌 Timeline Tips</p>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                    <li>• Events without images will show icons instead</li>
                    <li>• Most recent events appear first (left side)</li>
                    <li>• Scroll horizontally to see older events</li>
                    <li>• Click any event to see details</li>
                  </ul>
                </div>
              </div>

              {/* Display Options Continued */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Advanced Display Options</h3>
                <div className="space-y-3">
                  {/* Test Design Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">🧪 Test Design (New Layout)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Try the new layout with centered clock, iPhone weather, and alarm zones</p>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !useTestDesign;
                        onUseTestDesignChange(newValue);
                        // Disable Test Design 2.0 if enabling regular Test Design
                        if (newValue && useTestDesign2) {
                          onUseTestDesign2Change(false);
                        }
                      }}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        useTestDesign ? 'bg-[#22c55f]' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          useTestDesign ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Test Design 2.0 Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">✨ Test Design 2.0 (Apple Vision Pro)</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Ultra-modern glass morphism design inspired by Apple Vision Pro</p>
                    </div>
                    <button
                      onClick={() => {
                        const newValue = !useTestDesign2;
                        onUseTestDesign2Change(newValue);
                        // Disable regular Test Design if enabling Test Design 2.0
                        if (newValue && useTestDesign) {
                          onUseTestDesignChange(false);
                        }
                      }}
                      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                        useTestDesign2 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-lg ${
                          useTestDesign2 ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* SYSTEM STATUS MONITOR - Enhanced */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                      🖥️ System Status Monitor
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        systemStatus === 'online' ? 'bg-[#22c55f]' :
                        systemStatus === 'degraded' ? 'bg-amber-500' :
                        'bg-red-500'
                      }`}></div>
                    </h4>
                    <div className="space-y-2">
                      {/* Overall Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Overall Status:</span>
                        <span className={`text-xs font-semibold ${
                          systemStatus === 'online' ? 'text-[#22c55f]' :
                          systemStatus === 'degraded' ? 'text-amber-500' :
                          'text-red-500'
                        }`}>
                          {systemStatus === 'online' ? '✅ ONLINE' :
                           systemStatus === 'degraded' ? '⚠️ DEGRADED' :
                           '❌ OFFLINE'}
                        </span>
                      </div>

                      {/* SSE Connection */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Real-time Events:</span>
                        <span className={`text-xs ${sseConnected ? 'text-[#22c55f]' : 'text-amber-500'}`}>
                          {sseEnabled ? (sseConnected ? '✅ Connected' : '⏳ Connecting...') : '⚠️ Disabled (Polling)'}
                        </span>
                      </div>

                      {/* Device Connectivity */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Device Connectivity:</span>
                        <span className={`text-xs ${
                          deviceConnectivity === 'all_online' ? 'text-[#22c55f]' :
                          deviceConnectivity === 'some_offline' ? 'text-amber-500' :
                          'text-red-500'
                        }`}>
                          {deviceConnectivity === 'all_online' ? '✅ All Online' :
                           deviceConnectivity === 'some_offline' ? `⚠️ ${offlineDevices.length} Offline` :
                           '❌ All Offline'}
                        </span>
                      </div>

                      {/* Organization */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Organization:</span>
                        <span className={`text-xs ${organization?.id ? 'text-[#22c55f]' : 'text-red-500'}`}>
                          {organization?.id ? `✅ ${organization.name}` : '❌ Not loaded'}
                        </span>
                      </div>

                      {/* Last Heartbeat */}
                      {sseConnected && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600 dark:text-gray-400">Last Heartbeat:</span>
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            {Math.round((Date.now() - lastHeartbeat) / 1000)}s ago
                          </span>
                        </div>
                      )}

                      {/* Offline Devices List */}
                      {offlineDevices.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                            📱 Offline Devices:
                          </p>
                          <div className="space-y-1">
                            {offlineDevices.slice(0, 3).map((deviceName, idx) => (
                              <p key={idx} className="text-xs text-amber-600 dark:text-amber-400">
                                • {deviceName}
                              </p>
                            ))}
                            {offlineDevices.length > 3 && (
                              <p className="text-xs text-amber-500 dark:text-amber-500">
                                ... and {offlineDevices.length - 3} more
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Last Event */}
                      {lastSSEEvent && (
                        <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            🔔 Last Event:
                          </p>
                          <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                            {lastSSEEvent}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        💡 Monitor system health and device connectivity in real-time
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme Section */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Appearance</h3>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`p-3 rounded-md border transition-all ${
                      theme === 'light' 
                        ? 'bg-[#22c55f]/10 border-[#22c55f] text-[#22c55f]' 
                        : 'bg-gray-100 dark:bg-[#0f0f0f] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-xs">Light</span>
                  </button>
                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`p-3 rounded-md border transition-all ${
                      theme === 'dark' 
                        ? 'bg-[#22c55f]/10 border-[#22c55f] text-[#22c55f]' 
                        : 'bg-gray-100 dark:bg-[#0f0f0f] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span className="text-xs">Dark</span>
                  </button>
                  <button
                    onClick={() => onThemeChange('system')}
                    className={`p-3 rounded-md border transition-all ${
                      theme === 'system' 
                        ? 'bg-[#22c55f]/10 border-[#22c55f] text-[#22c55f]' 
                        : 'bg-gray-100 dark:bg-[#0f0f0f] border-gray-300 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">System</span>
                  </button>
                </div>
              </div>

              {/* Alarm Zones Configuration */}
              {useTestDesign && areas.length > 0 && (
                <div className="bg-white dark:bg-[#1a1a1a] rounded-lg p-4 border border-gray-200 dark:border-gray-800 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🏠 Alarm Zones Configuration</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Organize your areas into security zones for easier management.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const newZone: AlarmZone = {
                          id: `zone-${alarmZones.length + 1}-${new Date().getTime()}`,
                          name: `Zone ${alarmZones.length + 1}`,
                          color: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#f97316'][alarmZones.length % 6],
                          areas: []
                        };
                        const updatedZones = [...alarmZones, newZone];
                        onAlarmZonesChange(updatedZones);
                      }}
                      className="px-3 py-2 bg-[#22c55f]/10 text-[#22c55f] border border-[#22c55f] rounded-md text-sm hover:bg-[#22c55f]/20 transition-all font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Zone
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {alarmZones.map((zone, zoneIndex) => (
                      <div key={zone.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          {/* Color Picker */}
                          <div className="relative">
                            <input
                              type="color"
                              value={zone.color}
                              onChange={(e) => {
                                const updatedZones = [...alarmZones];
                                updatedZones[zoneIndex].color = e.target.value;
                                onAlarmZonesChange(updatedZones);
                              }}
                              className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                              style={{ backgroundColor: zone.color }}
                            />
                          </div>
                          
                          {/* Editable Zone Name */}
                          <input
                            type="text"
                            value={zone.name}
                            onChange={(e) => {
                              const updatedZones = [...alarmZones];
                              updatedZones[zoneIndex].name = e.target.value;
                              onAlarmZonesChange(updatedZones);
                            }}
                            className="text-base font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-[#22c55f] rounded px-2 py-1"
                            placeholder="Zone Name"
                          />
                          
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({areas.filter(area => zone.areas.includes(area.id)).length} areas)
                          </span>
                          
                          {/* Delete Zone Button */}
                          {alarmZones.length > 1 && (
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${zone.name}"? Areas in this zone will be unassigned.`)) {
                                  const updatedZones = alarmZones.filter((_, index) => index !== zoneIndex);
                                  onAlarmZonesChange(updatedZones);
                                }
                              }}
                              className="ml-auto p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete Zone"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {areas.map((area) => (
                            <label key={area.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={zone.areas.includes(area.id)}
                                onChange={(e) => {
                                  const updatedZones = [...alarmZones];
                                  if (e.target.checked) {
                                    // Remove from other zones first
                                    updatedZones.forEach(z => {
                                      z.areas = z.areas.filter(id => id !== area.id);
                                    });
                                    // Add to current zone
                                    updatedZones[zoneIndex].areas.push(area.id);
                                  } else {
                                    // Remove from current zone
                                    updatedZones[zoneIndex].areas = updatedZones[zoneIndex].areas.filter(id => id !== area.id);
                                  }
                                  onAlarmZonesChange(updatedZones);
                                }}
                                className="rounded border-gray-300 dark:border-gray-600 text-[#22c55f] focus:ring-[#22c55f]"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{area.name}</span>
                              <div className={`ml-auto w-2 h-2 rounded-full ${area.armedState !== 'DISARMED' ? 'bg-rose-500' : 'bg-green-500'}`} />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 