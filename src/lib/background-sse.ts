import { insertEvent } from './db';

interface BackgroundSSEConfig {
  apiKey: string;
  organizationId: string;
  endpoint: string;
}

// Configuration constants - ALL values must come from Railway environment variables
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
const DEFAULT_ORGANIZATION_ID = process.env.NEXT_PUBLIC_FUSION_ORGANIZATION_ID || '';
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_FUSION_BASE_URL || '';

class BackgroundSSEService {
  private eventSource: any = null;
  private config: BackgroundSSEConfig | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private retryInterval = 5000; // 5 seconds
  private static readonly maxRetryInterval = 60000; // 1 minute in milliseconds
  
  // 🔥 ADD: Event deduplication cache
  private processedEvents = new Set<string>();
  private readonly EVENT_CACHE_SIZE = 1000; // Max events to track
  private readonly EVENT_CACHE_TTL = 30000; // 30 seconds
  private eventCacheCleanupTimer: NodeJS.Timeout | null = null;

  // 🆕 ADD: Enhanced status tracking
  private startTime: number | null = null;
  private lastEventTime: number | null = null;
  private totalEventsProcessed = 0;
  private connectionHistory: Array<{ timestamp: number; type: 'connected' | 'disconnected' | 'error'; message?: string }> = [];
  private lastError: string | null = null;

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

    // 🔒 VALIDATION: Ensure all required config values are present
    if (!config.apiKey || !config.organizationId || !config.endpoint) {
      const missingVars = [];
      if (!config.apiKey) missingVars.push('NEXT_PUBLIC_FUSION_API_KEY');
      if (!config.organizationId) missingVars.push('NEXT_PUBLIC_FUSION_ORGANIZATION_ID');
      if (!config.endpoint) missingVars.push('NEXT_PUBLIC_FUSION_BASE_URL');
      
      const errorMsg = `❌ Background SSE: Missing required Railway environment variables: ${missingVars.join(', ')}`;
      console.error(errorMsg);
      this.lastError = errorMsg;
      this.addConnectionEvent('error', errorMsg);
      throw new Error(errorMsg);
    }

    this.config = config;
    this.startTime = Date.now();
    this.lastError = null;
    
    console.log('🔧 Starting Background SSE Service...', {
      endpoint: config.endpoint,
      organizationId: config.organizationId,
      hasApiKey: !!config.apiKey
    });

    this.addConnectionEvent('connected', 'Service started');
    await this.connect();
  }

  private async connect() {
    if (!this.config) {
      console.error('❌ Background SSE: No configuration provided');
      return;
    }

    try {
      const url = `${this.config.endpoint}?includeThumbnails=true`;
      console.log(`Background SSE: Connecting to ${this.config.endpoint} (attempt ${this.reconnectAttempts + 1})`);

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

      console.log('Background SSE: Connected successfully');
      this.isRunning = true;
      this.reconnectAttempts = 0;
      this.retryInterval = 5000;
      this.lastError = null;

      this.addConnectionEvent('connected', 'Successfully connected to SSE stream');

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
              console.log('Background SSE: Stream ended');
              this.addConnectionEvent('disconnected', 'Stream ended normally');
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
          this.lastError = error instanceof Error ? error.message : 'Stream processing error';
          this.addConnectionEvent('error', this.lastError);
        } finally {
          reader.releaseLock();
        }
      };

      await processStream();
      
              // Stream ended normally, trigger reconnection
        if (this.isRunning) {
          this.reconnectAttempts++;
          console.log(`Background SSE: Stream ended, retrying in ${Math.round(this.retryInterval / 1000)}s`);
          setTimeout(() => this.connect(), this.retryInterval);
          this.retryInterval = Math.min(this.retryInterval * 2, BackgroundSSEService.maxRetryInterval);
        }
    } catch (error: any) {
      this.lastError = error instanceof Error ? error.message : 'Connection error';
      const errorCode = error.cause?.code || error.code;
      
      console.error(`Background SSE: Connection failed${errorCode ? ` (${errorCode})` : ''}:`, error.message);
      this.addConnectionEvent('error', this.lastError);
      
              if (this.isRunning) {
          this.reconnectAttempts++;
          console.log(`Background SSE: Retrying in ${Math.round(this.retryInterval / 1000)}s (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), this.retryInterval);
          this.retryInterval = Math.min(this.retryInterval * 2, BackgroundSSEService.maxRetryInterval); // Exponential backoff, cap at 1 minute
        }
    }
  }

  private async processEvent(rawEvent: any) {
    try {
      // Update last event time
      this.lastEventTime = Date.now();
      
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
      
      // Increment total events processed
      this.totalEventsProcessed++;
      
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
        organizationId: this.config?.organizationId || rawEvent.organizationId || 'unknown',
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
            timestamp: eventData.timestamp,
            hasRawData: !!rawEvent,
            rawDataSize: rawEvent ? JSON.stringify(rawEvent).length : 0
          });
          
          // Check for alarm zone state changes - support both device events and direct alarm zone events
          const isAlarmZoneEvent = eventData.type?.toLowerCase().includes('armed') || 
                                  eventData.type?.toLowerCase().includes('disarmed') ||
                                  eventData.type?.toLowerCase().includes('arm') ||
                                  eventData.type?.toLowerCase().includes('disarm') ||
                                  eventData.type?.toLowerCase().includes('trigger') ||
                                  eventData.type?.toLowerCase().includes('arming') || // ← Real Fusion alarm zone events
                                  eventData.category?.toLowerCase().includes('alarm') ||
                                  eventData.category?.toLowerCase().includes('security') ||
                                  eventData.category?.toLowerCase().includes('zone') ||
                                  (eventData.displayState?.toLowerCase().includes('arm') && 
                                   !eventData.displayState?.toLowerCase().includes('alarm')) ||
                                  rawEvent.alarmZone; // ← Direct alarm zone events from Fusion
          
          if (isAlarmZoneEvent) {
            console.log('🔒 Alarm Zone State Change Detected:', {
              type: eventData.type,
              category: eventData.category,
              device: eventData.deviceName,
              space: eventData.spaceName,
              displayState: eventData.displayState,
              alarmZone: rawEvent.alarmZone // ← Log alarm zone data if present
            });
          }

          // Broadcast to connected frontend clients for real-time updates (ALL events)
          try {
            // Only broadcast if running in Next.js server context
            if (typeof window === 'undefined') {
              // Dynamic import to avoid issues with client-side rendering
              import('@/lib/event-broadcast').then(({ broadcastEvent }) => {
              
                // Handle different event types - device events vs alarm zone events
                let broadcastData;
                
                if (rawEvent.alarmZone) {
                  // Real Fusion alarm zone event
                  broadcastData = {
                    id: rawEvent.alarmZone.id,
                    type: eventData.type, // "arming"
                    alarmZoneId: rawEvent.alarmZone.id,
                    alarmZoneName: rawEvent.alarmZone.name,
                    currentState: rawEvent.alarmZone.currentState, // ARMED/DISARMED
                    previousState: rawEvent.alarmZone.previousState,
                    locationId: rawEvent.alarmZone.locationId,
                    locationName: rawEvent.alarmZone.locationName,
                    timestamp: eventData.timestamp,
                    eventSource: 'live-sse',
                    isAlarmZoneEvent: true,
                    isDirectAlarmZoneEvent: true // Flag for direct alarm zone events
                  };
                } else {
                  // Device-based event (original format) - for camera events, etc.
                  broadcastData = {
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
                  };
                }
                
                broadcastEvent(broadcastData);
              }).catch(error => {
                // Silently ignore broadcast errors - not critical
                console.log('📡 Background SSE: Live broadcast unavailable:', error.message);
              });
            }
          } catch (error) {
            // Silently ignore broadcast errors - not critical
            console.log('📡 Background SSE: Broadcast error:', error instanceof Error ? error.message : 'Unknown error');
          }
        })
        .catch((error) => {
          console.error('❌ Background SSE: Failed to save event:', error);
          this.lastError = `Failed to save event: ${error.message}`;
        });
    } catch (error) {
      console.error('❌ Background SSE: Error saving event to database:', error);
      this.lastError = `Event processing error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  // 🆕 ADD: Connection event tracking
  private addConnectionEvent(type: 'connected' | 'disconnected' | 'error', message?: string) {
    this.connectionHistory.push({
      timestamp: Date.now(),
      type,
      message
    });
    
    // Keep only last 20 connection events
    if (this.connectionHistory.length > 20) {
      this.connectionHistory = this.connectionHistory.slice(-20);
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
    this.addConnectionEvent('disconnected', 'Service stopped manually');
    console.log('✅ Background SSE: Service stopped');
  }

  // 🆕 ENHANCED: Better status reporting
  getStatus() {
    const now = Date.now();
    const uptime = this.startTime ? now - this.startTime : 0;
    const timeSinceLastEvent = this.lastEventTime ? now - this.lastEventTime : null;
    
    return {
      isRunning: this.isRunning,
      reconnectAttempts: this.reconnectAttempts,
      processedEventsCount: this.processedEvents.size,
      totalEventsProcessed: this.totalEventsProcessed,
      uptime: Math.round(uptime / 1000), // seconds
      lastEventTime: this.lastEventTime,
      timeSinceLastEvent: timeSinceLastEvent ? Math.round(timeSinceLastEvent / 1000) : null, // seconds
      lastError: this.lastError,
      connectionHistory: this.connectionHistory.slice(-5), // Last 5 connection events
      config: this.config ? {
        endpoint: this.config.endpoint,
        organizationId: this.config.organizationId,
        hasApiKey: !!this.config.apiKey
      } : null
    };
  }
}

// Singleton instance
let backgroundSSEService: BackgroundSSEService | null = null;

// Auto-start the service when this module loads (server-side only)
function initializeBackgroundService() {
  if (typeof window === 'undefined' && !backgroundSSEService) {
    console.log('Background SSE: Auto-starting service with server');
    
    backgroundSSEService = new BackgroundSSEService();
    
    const config = {
      apiKey: DEFAULT_API_KEY,
      organizationId: DEFAULT_ORGANIZATION_ID,
      endpoint: `${DEFAULT_BASE_URL}/api/events/stream`
    };

    backgroundSSEService.start(config).catch(error => {
      console.error('Background SSE: Failed to auto-start:', error.message);
    });
  }
}

// Initialize immediately when module loads
initializeBackgroundService();

// Manual start function
export function startBackgroundSSE(config?: { apiKey?: string; organizationId?: string; endpoint?: string }) {
  if (backgroundSSEService && backgroundSSEService.getStatus().isRunning) {
    console.log('🔧 Background SSE Service already running');
    return Promise.resolve();
  }

  // Create new service if it doesn't exist
  if (!backgroundSSEService) {
    backgroundSSEService = new BackgroundSSEService();
  }

  const defaultConfig = {
    apiKey: DEFAULT_API_KEY,
    organizationId: DEFAULT_ORGANIZATION_ID,
    endpoint: `${DEFAULT_BASE_URL}/api/events/stream`
  };

  const finalConfig = { ...defaultConfig, ...config };
  
  console.log('🔧 Manually starting Background SSE Service...', {
    endpoint: finalConfig.endpoint,
    organizationId: finalConfig.organizationId
  });

  return backgroundSSEService.start(finalConfig);
}

export function stopBackgroundSSE() {
  if (backgroundSSEService) {
    backgroundSSEService.stop();
    console.log('🔧 Background SSE Service manually stopped');
  }
}

export function getBackgroundSSEStatus() {
  if (!backgroundSSEService) {
    return { isRunning: false, reconnectAttempts: 0, processedEventsCount: 0 };
  }
  return backgroundSSEService.getStatus();
} 