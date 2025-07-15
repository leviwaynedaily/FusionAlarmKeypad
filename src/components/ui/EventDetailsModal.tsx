'use client';

import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { SSEEventDisplay } from '@/hooks/useSSE';

interface Props {
  event: SSEEventDisplay;
  onClose: () => void;
  debugMode?: boolean;
}

export const EventDetailsModal: React.FC<Props> = ({ event, onClose, debugMode = false }) => {
  const [showDebug, setShowDebug] = useState(false);

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

  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <Dialog.Panel className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 z-10 max-h-[85vh] overflow-y-auto">
        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {deviceName}
        </Dialog.Title>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {eventInfo.category} • {timestamp}
        </div>

        {/* Clean Event Information */}
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Event Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Action:</span>{' '}
                <span className="text-gray-900 dark:text-white">{eventInfo.action}</span>
              </div>
              {eventInfo.description && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{eventInfo.description}</span>
                </div>
              )}
              {eventInfo.details.state && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">State:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{eventInfo.details.state}</span>
                </div>
              )}
              {eventInfo.details.battery && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Battery:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{eventInfo.details.battery}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Device & Location Information */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Device & Location</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Device:</span>{' '}
                <span className="text-gray-900 dark:text-white">{deviceName}</span>
              </div>
              {eventInfo.details.deviceId && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Device ID:</span>{' '}
                  <span className="text-gray-900 dark:text-white font-mono text-xs">{eventInfo.details.deviceId}</span>
                </div>
              )}
              {(eventInfo.details.space || event.spaceName) && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Space:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{eventInfo.details.space || event.spaceName}</span>
                </div>
              )}
              {(eventInfo.details.location || event.locationName) && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>{' '}
                  <span className="text-gray-900 dark:text-white">{eventInfo.details.location || event.locationName}</span>
                </div>
              )}
              {eventInfo.details.resourceId && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Resource ID:</span>{' '}
                  <span className="text-gray-900 dark:text-white font-mono text-xs">{eventInfo.details.resourceId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Event Metadata */}
          {(eventInfo.details.objectType || eventInfo.details.confidence || eventInfo.details.objectTrack || eventInfo.details.analyticsEngineId || eventInfo.details.categoryId || eventInfo.details.typeId) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Detection Details</h3>
              <div className="space-y-2 text-sm">
                {eventInfo.details.objectType && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Object Type:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{eventInfo.details.objectType}</span>
                  </div>
                )}
                {eventInfo.details.confidence && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Confidence:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{eventInfo.details.confidence}%</span>
                  </div>
                )}
                {eventInfo.details.objectTrack && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Track ID:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-mono text-xs">{eventInfo.details.objectTrack}</span>
                  </div>
                )}
                {eventInfo.details.analyticsEngineId && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Analytics Engine:</span>{' '}
                    <span className="text-gray-900 dark:text-white font-mono text-xs">{eventInfo.details.analyticsEngineId}</span>
                  </div>
                )}
                {eventInfo.details.categoryId && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Category ID:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{eventInfo.details.categoryId}</span>
                  </div>
                )}
                {eventInfo.details.typeId && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Type ID:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{eventInfo.details.typeId}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional System Information */}
          {((event as any).connectorName || event.displayState) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">System Information</h3>
              <div className="space-y-2 text-sm">
                {(event as any).connectorName && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">System:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{(event as any).connectorName}</span>
                  </div>
                )}
                {event.displayState && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Current State:</span>{' '}
                    <span className="text-gray-900 dark:text-white">{event.displayState}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Display - Enhanced for better viewing */}
          {event.imageUrl && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Camera Image</h3>
              <div className="relative">
                <img 
                  src={event.imageUrl} 
                  alt={`${deviceName} event`}
                  className="w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                  onClick={(e) => {
                    // Click to view full size
                    const fullSizeModal = document.createElement('div');
                    fullSizeModal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-pointer';
                    fullSizeModal.onclick = () => fullSizeModal.remove();
                    
                    const fullImg = document.createElement('img');
                    fullImg.src = event.imageUrl!;
                    fullImg.className = 'max-w-[90vw] max-h-[90vh] object-contain rounded-lg';
                    fullImg.alt = `${deviceName} full size`;
                    
                    fullSizeModal.appendChild(fullImg);
                    document.body.appendChild(fullSizeModal);
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                  Click to expand
                </div>
              </div>
            </div>
          )}

          {/* Raw Event Data Section - Always show for debugging */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">Raw Event Data</h3>
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                {showDebug ? 'Hide' : 'Show'} Raw Data
              </button>
            </div>
            {showDebug && (
              <div className="space-y-3">
                {/* Show all possible event data sources for debugging */}
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <strong>Help us find object detection data:</strong> Look for fields containing "vehicle", "person", "animal", "object", "caption", "detection", etc.
                </div>
                
                {/* Event Type (parsed if JSON) */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-md p-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type:</div>
                  <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-2 text-xs overflow-x-auto text-gray-800 dark:text-gray-100 max-h-24 overflow-y-auto">
                    {typeof event.type === 'string' && event.type.startsWith('{') 
                      ? JSON.stringify(JSON.parse(event.type), null, 2)
                      : JSON.stringify(event.type, null, 2)
                    }
                  </pre>
                </div>

                {/* Full Event Object */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-md p-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Complete Event Object:</div>
                  <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-2 text-xs overflow-x-auto text-gray-800 dark:text-gray-100 max-h-48 overflow-y-auto">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </div>

                {/* Raw Event Data (if exists) */}
                {(event as any).raw_event_data && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-md p-2">
                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Raw Event Data:</div>
                    <pre className="bg-gray-100 dark:bg-gray-900 rounded-md p-2 text-xs overflow-x-auto text-gray-800 dark:text-gray-100 max-h-48 overflow-y-auto">
                      {JSON.stringify((event as any).raw_event_data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Additional Debug Info */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-md p-2">
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Debug Info:</div>
                  <div className="text-xs space-y-1">
                    <div><strong>Device:</strong> {event.deviceName || 'N/A'}</div>
                    <div><strong>Category:</strong> {event.category || 'N/A'}</div>
                    <div><strong>Display State:</strong> {event.displayState || 'N/A'}</div>
                    <div><strong>Space:</strong> {event.spaceName || 'N/A'}</div>
                    <div><strong>Location:</strong> {event.locationName || 'N/A'}</div>
                    <div><strong>Has Image:</strong> {event.imageUrl ? 'Yes' : 'No'}</div>
                    <div><strong>Event ID:</strong> {event.id || 'N/A'}</div>
                    <div><strong>Timestamp:</strong> {event.timestamp || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Debug Information (if enabled) */}
          {debugMode && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-white">Debug Information</h3>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded"
                >
                  {showDebug ? 'Hide' : 'Show'} Processed Data
                </button>
              </div>
              {showDebug && (
                <pre className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 text-xs overflow-x-auto text-gray-800 dark:text-gray-100 max-h-64">
                  {JSON.stringify(event, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none"
          >
            Close
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};
