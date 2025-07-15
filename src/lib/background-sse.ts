import { insertEvent } from './db';

interface BackgroundSSEConfig {
  apiKey: string;
  organizationId: string;
  endpoint: string;
}

class BackgroundSSEService {
  private eventSource: any = null;
  private config: BackgroundSSEConfig | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds
  
  // 🔥 ADD: Event deduplication cache
  private processedEvents = new Set<string>();
  private readonly EVENT_CACHE_SIZE = 1000; // Max events to track
  private readonly EVENT_CACHE_TTL = 30000; // 30 seconds
  private eventCacheCleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🔧 Background SSE Service initialized');
    
    // Start cleanup timer for event cache
    this.eventCacheCleanupTimer = setInterval(() => {
      this.cleanupEventCache();
    }, this.EVENT_CACHE_TTL);
  }

  // 🔥 ADD: Create unique event identifier
  private createEventId(rawEvent: any): string {
    const deviceId = rawEvent.deviceId || rawEvent.deviceName || 'unknown';
    const timestamp = rawEvent.timestamp || new Date().toISOString();
    const eventType = rawEvent.event?.type || rawEvent.eventType || rawEvent.type || 'unknown';
    const eventUuid = rawEvent.eventUuid || '';
    
    return `${deviceId}:${timestamp}:${eventType}:${eventUuid}`;
  }

  // 🔥 ADD: Cleanup old events from cache
  private cleanupEventCache() {
    if (this.processedEvents.size > this.EVENT_CACHE_SIZE) {
      // Keep only the most recent half of events
      const eventsArray = Array.from(this.processedEvents);
      const keepCount = Math.floor(this.EVENT_CACHE_SIZE / 2);
      this.processedEvents = new Set(eventsArray.slice(-keepCount));
      console.log(`🔧 Background SSE: Cleaned event cache, kept ${keepCount} events`);
    }
  }

  async start(config: BackgroundSSEConfig) {
    if (this.isRunning) {
      console.log('🔧 Background SSE Service already running');
      return;
    }

    this.config = config;
    console.log('🔧 Starting Background SSE Service...', {
      endpoint: config.endpoint,
      organizationId: config.organizationId
    });

    await this.connect();
  }

  private async connect() {
    if (!this.config) {
      console.error('❌ Background SSE: No configuration provided');
      return;
    }

    try {
      console.log('🔧 Background SSE: Starting native streaming connection...');
      
      const url = `${this.config.endpoint}?organizationId=${this.config.organizationId}&includeThumbnails=true`;
      console.log('🔧 Background SSE: Connecting to', url);

      // Use native fetch with streaming for better server-side compatibility
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': this.config.apiKey,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'User-Agent': 'FusionAlarmKeypad/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      console.log('✅ Background SSE: Connected successfully');
      this.isRunning = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 5000;

      // Store the response for cleanup
      this.eventSource = response;

      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processStream = async () => {
        try {
          while (this.isRunning) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('🔧 Background SSE: Stream ended');
              break;
            }

            // Decode the chunk and add to buffer
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            let eventData = '';
            let eventType = '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                eventData = line.substring(6);
              } else if (line.startsWith('event: ')) {
                eventType = line.substring(7);
              } else if (line === '') {
                // Empty line indicates end of event
                if (eventData) {
                  try {
                    console.log('🔧 Background SSE: Processing event data...');
                    const parsedData = JSON.parse(eventData);
                    await this.processEvent(parsedData);
                  } catch (parseError) {
                    console.error('❌ Background SSE: Error parsing event data:', parseError);
                  }
                  eventData = '';
                  eventType = '';
                }
              }
            }
          }
        } catch (error) {
          console.error('❌ Background SSE: Stream processing error:', error);
        } finally {
          reader.releaseLock();
        }
      };

      await processStream();
    } catch (error) {
      console.error('❌ Background SSE: Connection error:', error);
      if (this.isRunning && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔧 Background SSE: Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Exponential backoff
      } else {
        console.error('❌ Background SSE: Max reconnection attempts reached');
        this.isRunning = false;
      }
    }
  }

  private async processEvent(rawEvent: any) {
    try {
      // 🔥 ADD: Check for duplicate events
      const eventId = this.createEventId(rawEvent);
      
      if (this.processedEvents.has(eventId)) {
        console.log('🔄 Background SSE: Skipping duplicate event:', {
          device: rawEvent.deviceName || 'Unknown',
          type: rawEvent.event?.type || rawEvent.eventType || rawEvent.type,
          timestamp: rawEvent.timestamp,
          eventId: eventId.substring(0, 50) + '...'
        });
        return; // Skip duplicate event
      }
      
      // Add to processed events cache
      this.processedEvents.add(eventId);
      
      // Process ALL events including system events - let event timeline management handle filtering
      // System events like heartbeats are important for monitoring and should be in database
      if (rawEvent.type === 'connection' || rawEvent.type === 'heartbeat') {
        console.log('🔧 Background SSE: Processing system event:', rawEvent.type);
        // Continue processing instead of skipping
      }
      
      // Process events even without device information - some events may be system-wide
      if (!rawEvent.deviceName && !rawEvent.deviceId) {
        console.log('🔧 Background SSE: Processing event without device information');
        console.log('🔍 Raw SSE Event Data:', JSON.stringify(rawEvent, null, 2));
        // Continue processing instead of skipping
      }
      
      console.log('🔧 Background SSE: Processing event from', rawEvent.deviceName || 'Unknown Device');
      
      // Enhanced image URL extraction - check multiple possible sources
      let imageUrl = null;
      
      // Priority order: thumbnailUri (most common), data, thumbnailData.data, thumbnail, imageUrl
      if (rawEvent.thumbnailUri) {
        imageUrl = rawEvent.thumbnailUri;
        console.log('🖼️ Background SSE: Found base64 image in thumbnailUri field');
      } else if (rawEvent.data) {
        imageUrl = rawEvent.data;
        console.log('🖼️ Background SSE: Found base64 image in rawEvent.data field');
      } else if (rawEvent.thumbnailData?.data) {
        imageUrl = rawEvent.thumbnailData.data;
        console.log('🖼️ Background SSE: Found base64 image in thumbnailData.data field');
      } else if (rawEvent.thumbnail) {
        imageUrl = rawEvent.thumbnail;
        console.log('🖼️ Background SSE: Found image in thumbnail field');
      } else if (rawEvent.imageUrl) {
        imageUrl = rawEvent.imageUrl;
        console.log('🖼️ Background SSE: Found image in imageUrl field');
      }
      
      if (imageUrl) {
        console.log('🖼️ Background SSE: Image data detected:', {
          hasData: !!rawEvent.data,
          hasThumbnailData: !!rawEvent.thumbnailData?.data,
          hasThumbnail: !!rawEvent.thumbnail,
          hasImageUrl: !!rawEvent.imageUrl,
          finalImageUrl: imageUrl ? `${imageUrl.substring(0, 50)}...` : null
        });
      }

      const eventData = {
        organizationId: rawEvent.organizationId || 'unknown',
        locationId: rawEvent.locationId,
        spaceId: rawEvent.spaceId,
        deviceId: rawEvent.deviceId,
        deviceName: rawEvent.deviceName,
        spaceName: rawEvent.spaceName,
        connectorId: rawEvent.connectorId,
        connectorName: rawEvent.connectorName,
        connectorCategory: rawEvent.connectorCategory,
        type: rawEvent.event?.type || rawEvent.eventType || rawEvent.type || 'unknown',
        category: rawEvent.event?.category || rawEvent.eventCategory,
        timestamp: rawEvent.timestamp || new Date().toISOString(),
        displayState: rawEvent.displayState,
        eventSubtype: rawEvent.event?.subType || rawEvent.eventSubtype,
        rawEventType: rawEvent.rawEvent?.eventType || rawEvent.rawEventType,
        payload: rawEvent.event || {},
        rawPayload: rawEvent.rawEvent || {},
        deviceTypeInfo: rawEvent.deviceTypeInfo,
        imageUrl: imageUrl,
        // 🔥 ADD: Include caption from the event data for proper detection type display
        caption: rawEvent.event?.caption || rawEvent.caption
      };

      // Store in database with raw event data
      insertEvent(eventData, rawEvent)
        .then(() => {
          console.log('✅ Background SSE: Event saved to database:', {
            device: eventData.deviceName,
            type: eventData.type,
            timestamp: eventData.timestamp
          });
          
          // Check for alarm zone state changes
          const isAlarmZoneEvent = eventData.type?.toLowerCase().includes('armed') || 
                                  eventData.type?.toLowerCase().includes('disarmed') ||
                                  eventData.category?.toLowerCase().includes('alarm') ||
                                  eventData.category?.toLowerCase().includes('security');
          
          if (isAlarmZoneEvent) {
            console.log('🔒 Alarm Zone State Change Detected:', {
              type: eventData.type,
              category: eventData.category,
              device: eventData.deviceName,
              space: eventData.spaceName,
              displayState: eventData.displayState
            });
          }

          // Broadcast to connected frontend clients for real-time updates
          try {
            // Only broadcast if running in Next.js server context
            if (typeof window === 'undefined') {
              // Dynamic import to avoid issues with client-side rendering
              import('@/app/api/events/live/route').then(({ broadcastEvent }) => {
                broadcastEvent({
                  id: eventData.timestamp,
                  type: eventData.type,
                  deviceName: eventData.deviceName,
                  timestamp: eventData.timestamp,
                  imageUrl: eventData.imageUrl,
                  displayState: eventData.displayState,
                  spaceName: eventData.spaceName,
                  category: eventData.category,
                  eventSource: 'live-sse',
                  isAlarmZoneEvent: isAlarmZoneEvent
                });
              }).catch(error => {
                // Silently ignore broadcast errors - not critical
                console.log('📡 Background SSE: Live broadcast unavailable:', error.message);
              });
            }
          } catch (error) {
            // Silently ignore broadcast errors - not critical
            console.log('📡 Background SSE: Live broadcast failed:', error);
          }
        })
        .catch((error) => {
          console.error('❌ Background SSE: Failed to save event:', error);
        });
    } catch (error) {
      console.error('❌ Background SSE: Error saving event to database:', error);
    }
  }

  stop() {
    console.log('🔧 Background SSE: Stopping service...');
    this.isRunning = false;
    
    if (this.eventSource) {
      try {
        this.eventSource = null;
      } catch (error) {
        console.error('❌ Background SSE: Error stopping event source:', error);
      }
    }

    // Clear event cache and cleanup timer
    this.processedEvents.clear();
    if (this.eventCacheCleanupTimer) {
      clearInterval(this.eventCacheCleanupTimer);
      this.eventCacheCleanupTimer = null;
    }
    
    this.reconnectAttempts = 0;
    console.log('✅ Background SSE: Service stopped');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      reconnectAttempts: this.reconnectAttempts,
      processedEventsCount: this.processedEvents.size
    };
  }
}

// Singleton instance
let backgroundSSEService: BackgroundSSEService | null = null;

export async function startBackgroundSSE() {
  if (!backgroundSSEService) {
    backgroundSSEService = new BackgroundSSEService();
  }

  const config = {
    apiKey: process.env.FUSION_API_KEY || 'vjInQXtpHBJWdFUWpCXlPLxkHtMBePTZstbbqgZolRhuDsHDMBbIeWRRhemnZerU',
    organizationId: process.env.FUSION_ORGANIZATION_ID || 'GF1qXccUcdNJbIkUAbYR9SKAEwVonZZK',
    endpoint: process.env.FUSION_ENDPOINT || 'https://fusion-bridge-production.up.railway.app/api/events/stream'
  };

  await backgroundSSEService.start(config);
}

export function stopBackgroundSSE() {
  if (backgroundSSEService) {
    backgroundSSEService.stop();
  }
}

export function getBackgroundSSEStatus() {
  if (!backgroundSSEService) {
    return { isRunning: false, reconnectAttempts: 0, processedEventsCount: 0 };
  }
  return backgroundSSEService.getStatus();
} 