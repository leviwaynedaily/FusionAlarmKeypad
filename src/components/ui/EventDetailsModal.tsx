'use client';

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { SSEEventDisplay } from '@/hooks/useSSE';

interface Props {
  event: SSEEventDisplay;
  onClose: () => void;
  debugMode?: boolean;
}

// Raw Data Modal Component
const RawDataModal: React.FC<{ event: SSEEventDisplay; onClose: () => void }> = ({ event, onClose }) => {
  const [activeTab, setActiveTab] = useState<'type' | 'full' | 'raw'>('type');

  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
      <Dialog.Panel className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-[95vw] h-[90vh] mx-4 flex flex-col z-10">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
            Raw Event Data
          </Dialog.Title>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          {[
            { key: 'type', label: 'Event Type' },
            { key: 'full', label: 'Complete Event' },
            { key: 'raw', label: 'Raw Data' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full overflow-auto">
            <pre className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-xs text-gray-800 dark:text-gray-100 font-mono leading-relaxed">
              {activeTab === 'type' && (
                typeof event.type === 'string' && event.type.startsWith('{') 
                  ? JSON.stringify(JSON.parse(event.type), null, 2)
                  : JSON.stringify(event.type, null, 2)
              )}
              {activeTab === 'full' && JSON.stringify(event, null, 2)}
              {activeTab === 'raw' && JSON.stringify((event as any).raw_event_data || 'No raw data available', null, 2)}
            </pre>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

// Image Lightbox Modal Component
const ImageLightboxModal: React.FC<{ imageUrl: string; deviceName: string; onClose: () => void }> = ({ imageUrl, deviceName, onClose }) => {
  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/90 cursor-pointer" onClick={onClose} aria-hidden="true" />
      <Dialog.Panel className="relative z-10 max-w-[95vw] max-h-[95vh] flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt={`${deviceName} full size`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </Dialog.Panel>
    </Dialog>
  );
};

export const EventDetailsModal: React.FC<Props> = ({ event, onClose, debugMode = false }) => {
  const [showRawData, setShowRawData] = useState(false);
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  // Parse event type if it's a JSON string
  const parseEventType = (type: any) => {
    if (typeof type === 'string') {
      try {
        const parsed = JSON.parse(type);
        return parsed;
      } catch {
        return { type };
      }
    }
    return type;
  };

  const eventType = parseEventType(event.type);
  const deviceName = event.deviceName || 'Unknown Device';
  const timestamp = event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown Time';

  // Extract meaningful information from the event
  const getEventInfo = () => {
    if (typeof eventType === 'object') {
      // Handle intrusion detected events specially
      let action = eventType.type || eventType.displayState || 'State Change';
      let description = eventType.caption || eventType.description || eventType.message || '';
      
      // Enhanced intrusion detection handling
      if (action === 'Intrusion Detected' || action === 'intrusion detected') {
        action = 'Intrusion Detected';
        
        // Check for caption in multiple locations including direct event caption
        const caption = (event as any).caption || 
                       eventType.caption || 
                       (event as any).event?.caption ||
                       (event as any).rawEvent?.caption ||
                       '';
        
        if (caption) {
          if (caption.includes('Vehicle') || caption.includes('vehicle')) {
            description = `Vehicle detected in monitoring area. ${caption}`;
          } else if (caption.includes('Person') || caption.includes('person')) {
            description = `Person detected in monitoring area. ${caption}`;
          } else if (caption.includes('Animal') || caption.includes('animal')) {
            description = `Animal detected in monitoring area. ${caption}`;
          } else {
            description = `Object detected in monitoring area. ${caption}`;
          }
        }
      }
      
      return {
        category: eventType.category || eventType.categoryId || 'Device Event',
        action: action,
        description: description,
        details: {
          state: eventType.intermediateState || eventType.displayState,
          battery: eventType.batteryPercentage,
          objectTrack: eventType.objectTrackId || (event as any).event?.objectTrackId,
          resourceId: eventType.eventResourceId || (event as any).event?.eventResourceId,
          location: eventType.locationName || event.locationName || (event as any).locationName,
          space: eventType.spaceName || event.spaceName || event.areaName || (event as any).spaceName,
          eventTime: eventType.eventTime || eventType.timestamp,
          deviceId: eventType.deviceId || event.deviceId || (event as any).deviceId,
          confidence: eventType.confidence || eventType.payload?.confidence,
          objectType: eventType.payload?.objectType || eventType.objectType,
          analyticsEngineId: (event as any).event?.analyticsEngineId,
          categoryId: (event as any).event?.categoryId,
          typeId: (event as any).event?.typeId
        }
      };
    }
    
    // Handle string event types that might be intrusion events
    let action = eventType || 'Unknown Action';
    let description = '';
    let category = event.category || 'Event';
    
    if (typeof eventType === 'string' && eventType.toLowerCase().includes('intrusion')) {
      action = 'Intrusion Detected';
      description = 'Security event detected by monitoring system';
      category = 'Security Event';
    }
    
    return {
      category: category,
      action: action,
      description: description,
      details: {
        state: event.displayState,
        location: event.locationName,
        space: event.spaceName || event.areaName,
        deviceId: event.deviceId
      }
    };
  };

  const eventInfo = getEventInfo();

  // Helper component for displaying key-value pairs
  const InfoRow: React.FC<{ label: string; value: string | number; className?: string }> = ({ label, value, className = '' }) => (
    <div className={`flex justify-between items-start gap-3 ${className}`}>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-0 flex-shrink-0">{label}:</span>
      <span className="text-sm text-gray-900 dark:text-white text-right break-words">{value}</span>
    </div>
  );

  return (
    <>
      <Dialog open={true} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50 dark:bg-black/60" aria-hidden="true" />
        <Dialog.Panel className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-4xl w-full mx-4 p-4 sm:p-6 z-10 max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {deviceName}
              </Dialog.Title>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {eventInfo.category} • {timestamp}
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Content - Responsive Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
              {/* Left Column - Event Details (2/3 width on large screens) */}
              <div className="lg:col-span-2 space-y-4">
                {/* Primary Event Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">Event Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Action" value={eventInfo.action} />
                    {eventInfo.details.state && <InfoRow label="State" value={eventInfo.details.state} />}
                    {eventInfo.details.battery && <InfoRow label="Battery" value={`${eventInfo.details.battery}%`} />}
                    {eventInfo.details.objectType && <InfoRow label="Object Type" value={eventInfo.details.objectType} />}
                    {eventInfo.details.confidence && <InfoRow label="Confidence" value={`${eventInfo.details.confidence}%`} />}
                  </div>
                  {eventInfo.description && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-sm text-gray-900 dark:text-white">{eventInfo.description}</p>
                    </div>
                  )}
                </div>

                {/* Location & Device Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">Location & Device</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Device" value={deviceName} />
                    {(eventInfo.details.space || event.spaceName) && (
                      <InfoRow label="Space" value={eventInfo.details.space || event.spaceName} />
                    )}
                    {(eventInfo.details.location || event.locationName) && (
                      <InfoRow label="Location" value={eventInfo.details.location || event.locationName} />
                    )}
                    {eventInfo.details.deviceId && (
                      <InfoRow label="Device ID" value={eventInfo.details.deviceId} className="font-mono text-xs" />
                    )}
                    {(event as any).connectorName && (
                      <InfoRow label="System" value={(event as any).connectorName} />
                    )}
                  </div>
                </div>

                {/* Additional Technical Details */}
                {(eventInfo.details.objectTrack || eventInfo.details.resourceId || eventInfo.details.analyticsEngineId || eventInfo.details.categoryId || eventInfo.details.typeId) && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">Technical Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {eventInfo.details.objectTrack && (
                        <InfoRow label="Track ID" value={eventInfo.details.objectTrack} className="font-mono text-xs" />
                      )}
                      {eventInfo.details.resourceId && (
                        <InfoRow label="Resource ID" value={eventInfo.details.resourceId} className="font-mono text-xs" />
                      )}
                      {eventInfo.details.analyticsEngineId && (
                        <InfoRow label="Analytics Engine" value={eventInfo.details.analyticsEngineId} className="font-mono text-xs" />
                      )}
                      {eventInfo.details.categoryId && (
                        <InfoRow label="Category ID" value={eventInfo.details.categoryId} />
                      )}
                      {eventInfo.details.typeId && (
                        <InfoRow label="Type ID" value={eventInfo.details.typeId} />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Image & Actions (1/3 width on large screens) */}
              <div className="space-y-4">
                {/* Camera Image */}
                {event.imageUrl && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">Camera Image</h3>
                    <div className="relative group">
                      <img 
                        src={event.imageUrl} 
                        alt={`${deviceName} event`}
                        className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-lg cursor-pointer transition-transform duration-200 group-hover:scale-[1.02]"
                        onClick={() => setShowImageLightbox(true)}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                            Click to expand
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowImageLightbox(true)}
                      className="w-full mt-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                    >
                      View Full Image
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-3">Actions</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowRawData(true)}
                      className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    >
                      View Raw Data
                    </button>
                    {debugMode && (
                      <button
                        onClick={() => console.log('Debug Event:', event)}
                        className="w-full px-3 py-2 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors text-sm font-medium"
                      >
                        Log to Console
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Modals */}
      {showRawData && (
        <RawDataModal 
          event={event} 
          onClose={() => setShowRawData(false)} 
        />
      )}
      
      {showImageLightbox && event.imageUrl && (
        <ImageLightboxModal 
          imageUrl={event.imageUrl}
          deviceName={deviceName}
          onClose={() => setShowImageLightbox(false)} 
        />
      )}
    </>
  );
};
