// Server-Sent Events (SSE) client for real-time event streaming
import { logger } from './logger';

// Event types that we want to listen for
const MONITORED_CATEGORIES = [
  'door',
  'motion', 
  'alarm',
  'intrusion',
  'contact',
  'entry',
  'lock',
  'area',
  'system'
];

const MONITORED_EVENT_TYPES = [
  'door_opened',
  'door_closed',
  'motion_detected',
  'alarm_triggered',
  'area_armed',
  'area_disarmed',
  'lock_locked',
  'lock_unlocked',
  'contact_opened',
  'contact_closed',
  'intrusion_detected',
  'tamper_detected'
];

export interface SSEEvent {
  type: 'connection' | 'event' | 'heartbeat' | 'system';
  organizationId?: string;
  timestamp?: string;
  data?: any;
}

export interface SSEConfig {
  organizationId: string;
  apiKey: string;
  baseUrl?: string;
  categories?: string[];
  eventTypes?: string[];
  maxRetries?: number;
  retryDelay?: number;
}

export interface FusionSSEConfig {
  organizationId: string;
  apiKey: string;
  baseUrl?: string;
  categories?: string[];
  eventTypes?: string[];
}

export interface FusionSSEClient {
  connect(): Promise<void>;
  disconnect(): void;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
  isConnected(): boolean;
}

class SSEClient implements FusionSSEClient {
  private config: Required<FusionSSEConfig>;
  private eventListeners: Map<string, ((...args: any[]) => void)[]> = new Map();
  private connected: boolean = false;
  private lastEventTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private isReconnecting: boolean = false;

  constructor(config: FusionSSEConfig) {
    this.config = {
      baseUrl: 'https://fusion-bridge-production.up.railway.app',
      categories: MONITORED_CATEGORIES,
      eventTypes: MONITORED_EVENT_TYPES,
      ...config
    };
  }

  // Connect to the SSE stream using fetch with streaming (since EventSource can't send custom headers)
  connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        console.log('🚀 SSE CONNECT: Starting connection process...');
        console.log('🚀 SSE CONNECT: Config:', {
          organizationId: this.config.organizationId,
          apiKeyLength: this.config.apiKey?.length || 0,
          baseUrl: this.config.baseUrl,
          hasApiKey: !!this.config.apiKey
        });

        // Prevent multiple simultaneous connections
        if (this.connected || this.isReconnecting) {
          console.log('🔄 SSE CONNECT: Already connected or connecting, skipping...');
          resolve();
          return;
        }

        this.disconnect(); // Clean up any existing connection

        // Build the URL with query parameters
        const url = new URL('/api/events/stream', this.config.baseUrl);
        
        // Add organization ID filter
        if (this.config.organizationId) {
          url.searchParams.append('organizationId', this.config.organizationId);
        }
        
        // Add category filters
        if (this.config.categories && this.config.categories.length > 0) {
          url.searchParams.append('categories', this.config.categories.join(','));
        }
        
        // Add event type filters
        if (this.config.eventTypes && this.config.eventTypes.length > 0) {
          url.searchParams.append('eventTypes', this.config.eventTypes.join(','));
        }

        console.log('🚀 SSE CONNECT: Final URL:', url.toString());

        // Headers for authentication and SSE
        const headers = {
          'Accept': 'text/event-stream',
          'x-api-key': this.config.apiKey
        };

        console.log('🚀 SSE CONNECT: Headers will be:', {
          'Accept': headers.Accept,
          'x-api-key': `${this.config.apiKey.substring(0, 10)}...${this.config.apiKey.substring(this.config.apiKey.length - 4)}`
        });

        logger.info('Connecting to SSE stream:', url.toString());
        logger.info('Organization ID:', this.config.organizationId);
        logger.info('API Key length:', this.config.apiKey.length);

        console.log('🔄 SSE Connection Attempt:', {
          url: url.toString(),
          organizationId: this.config.organizationId,
          apiKeyLength: this.config.apiKey.length,
          hasApiKey: !!this.config.apiKey
        });

        // Create AbortController for this connection
        this.abortController = new AbortController();
        this.isReconnecting = true;

        console.log('🚀 SSE CONNECT: About to call fetch...');

        // Make the fetch request (Service Worker disabled)
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: headers,
          signal: this.abortController.signal,
          cache: 'no-store', // Prevent caching
          credentials: 'omit' // Don't send cookies
        });

        console.log('🔄 SSE CONNECT: Fetch response received:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Mark as connected before starting to process stream
        this.connected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.lastEventTime = Date.now();

        console.log('✅ SSE CONNECT: Connection established, starting stream processing...');

        // Emit connected event
        this.emit('connected');
        resolve();

        // Start processing the stream
        await this.processStreamingResponse(response);

      } catch (error) {
        this.isReconnecting = false;
        console.error('💥 SSE CONNECT: Exception caught:', error);
        
        // Don't log AbortError as an error since it's expected during cleanup
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🔄 SSE CONNECT: Connection aborted (cleanup)');
          this.connected = false;
          resolve(); // Resolve instead of reject for abort
          return;
        }

        logger.error('Failed to create SSE connection:', error);
        this.emit('error', error);
        
        // Schedule reconnection if not at max attempts
        this.scheduleReconnect();
        
        reject(error);
      }
    });
  }

  // Process streaming response from fetch
  private async processStreamingResponse(response: Response) {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: { event?: string; data?: string; id?: string } = {};

    console.log('🔄 SSE STREAM: Starting to process streaming response...');

    try {
      while (this.connected && !this.abortController?.signal.aborted) {
        console.log('🔄 SSE STREAM: Reading next chunk...');
        
        const { done, value } = await reader.read();
        
        if (done) {
          logger.info('SSE stream ended');
          console.log('🔄 SSE STREAM: Stream ended by server');
          this.connected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
          break;
        }

        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        console.log('🔄 SSE STREAM: Received chunk:', chunk.length, 'bytes');
        console.log('🔄 SSE STREAM: Chunk content:', chunk.substring(0, 200) + (chunk.length > 200 ? '...' : ''));

        // Process complete SSE messages (separated by double newline)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '') {
            // Empty line indicates end of event, emit it
            if (currentEvent.event || currentEvent.data) {
              console.log('🔄 SSE STREAM: Complete event received:', currentEvent);
              this.handleSSEEvent(currentEvent);
              currentEvent = {}; // Reset for next event
            }
          } else if (trimmedLine.startsWith('event:')) {
            currentEvent.event = trimmedLine.substring(6).trim();
          } else if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.substring(5).trim();
            currentEvent.data = (currentEvent.data || '') + data;
          } else if (trimmedLine.startsWith('id:')) {
            currentEvent.id = trimmedLine.substring(3).trim();
          }
          // Ignore other fields like retry:
        }
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        console.log('🔄 SSE STREAM: Stream processing aborted (cleanup)');
        return;
      }
      
      // Don't log "Load failed" errors which are usually network issues
      if (!(error instanceof Error && error.message.includes('Load failed'))) {
        console.error('💥 SSE STREAM: Error processing stream:', error);
        logger.error('Error processing SSE stream:', error);
      } else {
        console.log('🔄 SSE STREAM: Connection lost (Load failed), will reconnect...');
      }
      
      this.connected = false;
      this.emit('error', error);
      this.scheduleReconnect();
    } finally {
      // Clean up reader
      try {
        reader.releaseLock();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // Handle individual SSE events
  private handleSSEEvent(event: { event?: string; data?: string; id?: string }) {
    try {
      this.lastEventTime = Date.now();
      
      if (!event.data) {
        console.log('⚠️ SSE EVENT: Received event without data:', event);
        return;
      }

      // Parse the event data
      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        logger.warn('Failed to parse SSE event data:', event.data);
        console.log('⚠️ SSE EVENT: Failed to parse data:', event.data);
        return;
      }

      console.log('📨 SSE Event Received:', data);

      // Handle different event types based on actual API format
      if (data.type === 'connection') {
        logger.info('SSE connection confirmed by server');
        console.log('✅ Connection Event:', data);
        this.emit('connection_confirmed', data);
      } 
      else if (data.type === 'heartbeat') {
        logger.info('SSE heartbeat received');
        console.log('💓 Heartbeat:', data);
        this.emit('heartbeat', data);
      }
      else if (data.eventUuid) {
        // This is a real event with eventUuid
        console.log('🔔 Real Event:', {
          eventUuid: data.eventUuid,
          category: data.category,
          type: data.type,
          deviceName: data.deviceName,
          timestamp: data.timestamp
        });

        // Handle specific event categories
        if (data.category === 'DEVICE_STATE' && data.type === 'STATE_CHANGED') {
          if (data.deviceName && data.payload) {
            console.log('📱 Device State Change:', data.deviceName, data.payload);
            this.emit('device_state_change', data);
          }
        }
        else if (data.category === 'AREA_STATE' && (data.type === 'ARMED' || data.type === 'DISARMED')) {
          console.log('🏠 Area State Change:', data.areaName || data.areaId, data.type);
          this.emit('area_state_change', data);
        }
        else if (data.category === 'ALARM' || data.category === 'INTRUSION') {
          console.log('🚨 Alarm/Intrusion Event:', data.deviceName, data.payload?.caption);
          this.emit('alarm_event', data);
        }
        else if (data.category === 'CHECK_IN') {
          console.log('📋 Device Check-in:', data.deviceName);
          this.emit('device_check_in', data);
        }

        // Emit generic security event for all events
        this.emit('security_event', data);
      }
      else {
        console.log('❓ Unknown Event Type:', data);
        this.emit('unknown_event', data);
      }

    } catch (error) {
      logger.error('Error handling SSE event:', error);
      console.error('💥 SSE EVENT: Error handling event:', error);
    }
  }

  // Disconnect from the SSE stream
  disconnect(): void {
    console.log('🔌 SSE DISCONNECT: Disconnecting...');
    
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Abort any ongoing fetch
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Mark as disconnected
    if (this.connected) {
      this.connected = false;
      this.isReconnecting = false;
      logger.info('SSE connection closed');
      logger.info('SSE disconnected');
      this.emit('disconnected');
    }

    console.log('🔌 SSE DISCONNECT: Complete');
  }

  // Schedule a reconnection attempt with exponential backoff
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max SSE reconnection attempts reached');
      this.emit('error', new Error('Max retry attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000); // Cap at 30s
    
    logger.info(`Scheduling SSE reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error('SSE reconnection failed:', error);
      }
    }, delay);
  }

  // Event emitter methods
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error in SSE event listener for ${event}:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Factory function to create SSE client
export function createSSEClient(organizationId: string, apiKey: string): FusionSSEClient {
  return new SSEClient({
    organizationId,
    apiKey
  });
} 