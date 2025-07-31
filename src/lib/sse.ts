// Server-Sent Events (SSE) client for real-time event streaming - MEMORY OPTIMIZED VERSION
import { logger } from './logger';

// 🔥 FIX: Safe browser-compatible development check
const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
const isDev = !isProduction;

// 🔥 FIX: Expanded categories to capture all device events
const MONITORED_CATEGORIES = [
  'alarm',
  'space', 
  'security',
  'analytics',
  'device',
  'door',
  'motion',
  'light',
  'camera'
];

export interface SSEEvent {
  type: 'connection' | 'event' | 'heartbeat' | 'system';
  organizationId?: string;
  timestamp?: string;
  data?: any;
}

export interface FusionSSEConfig {
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
  private maxReconnectAttempts: number = 2; // 🔥 FIX: Reduced from 3
  private reconnectTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private isReconnecting: boolean = false;
  // 🔥 FIX: Add event rate limiting
  private eventRateLimit: number = 0;
  private lastEventTimestamp: number = 0;

  constructor(config: FusionSSEConfig) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io',
      categories: MONITORED_CATEGORIES,
      eventTypes: [],
      ...config
    };
  }

  // 🔍 DEBUG: Enhanced connection with detailed logging
  connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Prevent multiple simultaneous connections
        if (this.connected || this.isReconnecting) {
          console.log('🔍 SSE: Connection already active, skipping');
          resolve();
          return;
        }

        console.log('🔍 SSE: Starting connection attempt...');
        this.disconnect(); // Clean up any existing connection

        const url = new URL('/api/events/stream', this.config.baseUrl);
        
        // ✅ FIXED: Enable thumbnails to get camera images
        url.searchParams.append('includeThumbnails', 'true');

        const headers = {
          'Accept': 'text/event-stream',
          'x-api-key': this.config.apiKey
        };

        console.log('🔍 SSE: Connecting to:', url.toString());
        // 🔒 SECURITY: Use consistent API key masking
        const maskedKey = this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...${this.config.apiKey.substring(this.config.apiKey.length - 4)}` : 'MISSING';
        console.log('🔍 SSE: Headers:', { 
          'Accept': headers.Accept,
          'x-api-key': maskedKey
        });

        this.abortController = new AbortController();
        this.isReconnecting = true;

        console.log('🔍 SSE: Making fetch request...');
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: headers,
          signal: this.abortController.signal,
          cache: 'no-store',
          credentials: 'omit'
        });

        console.log('🔍 SSE: Response received:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('🔍 SSE: Response not OK:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        // Verify it's actually an SSE stream
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('text/event-stream')) {
          console.error('🔍 SSE: Invalid content type:', contentType);
          throw new Error(`Expected text/event-stream, got: ${contentType}`);
        }

        // ✅ FIXED: Set connected state immediately after successful response
        this.connected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.lastEventTime = Date.now();

        console.log('🔍 SSE: Connection established, emitting connected event');
        this.emit('connected');
        resolve();

        // Start processing the stream
        console.log('🔍 SSE: Starting stream processing...');
        await this.processStreamingResponse(response);

      } catch (error) {
        this.isReconnecting = false;
        this.connected = false;
        
        console.error('🔍 SSE: Connection error details:', {
          error: error instanceof Error ? error.message : error,
          name: error instanceof Error ? error.name : 'Unknown',
          stack: error instanceof Error ? error.stack : 'No stack',
          type: typeof error
        });
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('🔍 SSE: Connection aborted (normal for cleanup)');
          resolve();
          return;
        }

        this.emit('error', error);
        
        // Only schedule reconnect if it's not a permanent failure
        if (!(error instanceof TypeError && error.message.includes('Load failed'))) {
          this.scheduleReconnect();
        } else {
          console.log('🔍 SSE: Skipping reconnect due to load failure');
        }
        
        reject(error);
      }
    });
  }

  // 🔥 FIX: Memory-optimized stream processing
  private async processStreamingResponse(response: Response) {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    console.log('🔍 SSE: Setting up stream reader...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: { event?: string; data?: string; id?: string } = {};

    try {
      console.log('🔍 SSE: Starting stream read loop...');
      while (this.connected && !this.abortController?.signal.aborted) {
        const { done, value } = await reader.read();
        console.log('🔍 SSE: Read chunk:', { done, valueLength: value?.length });
        
        if (done) {
          this.connected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        
        // 🔥 FIX: Improved buffer management for large chunks
        buffer += chunk;
        if (buffer.length > 50000) { // Increased from 10KB to 50KB
          console.log('🔍 SSE: Large buffer detected, trimming...', { bufferLength: buffer.length });
          buffer = buffer.slice(-25000); // Keep last 25KB instead of 5KB
        }

        // 🔍 DEBUG: Log chunk info for large chunks
        if (isDev && chunk.length > 1000) {
          console.log('🔍 SSE: Processing large chunk:', { 
            chunkLength: chunk.length, 
            bufferLength: buffer.length,
            linesInChunk: chunk.split('\n').length,
            firstLines: chunk.split('\n').slice(0, 5),
            lastLines: chunk.split('\n').slice(-5),
            containsEvent: chunk.includes('event:'),
            containsData: chunk.includes('data:')
          });
        }

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        // 🔥 FIX: Process each line with better debugging
        let eventsInChunk = 0;
        let eventLines = 0;
        let dataLines = 0;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '') {
            if (currentEvent.event || currentEvent.data) {
              eventsInChunk++;
              console.log('🔍 SSE: Completing event:', {
                eventType: currentEvent.event,
                dataLength: currentEvent.data?.length,
                hasData: !!currentEvent.data
              });
              this.handleSSEEvent(currentEvent);
              currentEvent = {};
            }
          } else if (trimmedLine.startsWith('event:')) {
            currentEvent.event = trimmedLine.substring(6).trim();
            eventLines++;
          } else if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.substring(5).trim();
            dataLines++;
            // 🔥 FIX: Increased data size limit from 20KB to 100KB for camera thumbnails
            if (data.length < 100000) {
              currentEvent.data = (currentEvent.data || '') + data;
            } else {
              console.log('🔍 SSE: Data too large, truncating:', data.length);
              // 🔥 FIX: Still try to process truncated data rather than skipping completely
              currentEvent.data = (currentEvent.data || '') + data.substring(0, 50000);
            }
          } else if (trimmedLine.startsWith('id:')) {
            currentEvent.id = trimmedLine.substring(3).trim();
          }
        }
        
        // 🔍 DEBUG: Log events processed in large chunks
        if (isDev && (eventsInChunk > 0 || eventLines > 0 || dataLines > 0)) {
          console.log('🔍 SSE: Processed chunk summary:', {
            eventsCompleted: eventsInChunk,
            eventLines: eventLines,
            dataLines: dataLines,
            totalLines: lines.length,
            bufferRemaining: buffer.length
          });
        }
      }
    } catch (error) {
      if (this.abortController?.signal.aborted) {
        return;
      }
      
      this.connected = false;
      this.emit('error', error);
      this.scheduleReconnect();
    } finally {
      try {
        reader.releaseLock();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  // 🔥 FIX: Enhanced event handling for all device types
  private handleSSEEvent(event: { event?: string; data?: string; id?: string }) {
    try {
      const now = Date.now();
      
      // 🔥 FIX: Reduced rate limiting - allow more events through
      if (now - this.lastEventTimestamp < 50) { // Changed from 100ms to 50ms
        this.eventRateLimit++;
        if (this.eventRateLimit > 25) { // Changed from 10 to 25
          console.log('🔍 SSE: Rate limited event dropped', { eventType: event.event, rateLimit: this.eventRateLimit });
          return; // Drop events if too frequent
        }
      } else {
        this.eventRateLimit = 0;
        this.lastEventTimestamp = now;
      }

      this.lastEventTime = now;
      
      // 🔍 DEBUG: Log all incoming events (even empty ones)
      console.log('🔍 SSE: Raw event received:', {
        event: event.event,
        hasData: !!event.data,
        dataLength: event.data?.length || 0,
        id: event.id,
        rateLimit: this.eventRateLimit
      });
      
      if (!event.data) {
        console.log('🔍 SSE: Skipping event with no data');
        return;
      }

      // 🔥 FIX: Add debug for raw data before parsing
      if (isDev && event.data.length > 100) {
        console.log('🔍 SSE: Large data received:', event.data.substring(0, 200) + '...');
      }

      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        console.log('🔍 SSE: JSON parse error:', parseError);
        console.log('🔍 SSE: Raw data:', event.data.substring(0, 500));
        return;
      }

      // 🔍 DEBUG: Log all parsed events
      console.log('🔍 SSE: Parsed event data:', {
        type: data.type,
        event: event.event,
        deviceName: data.deviceName,
        category: data.category,
        eventCategory: data.eventCategory,
        eventType: data.eventType,
        displayState: data.displayState,
        thumbnailData: !!data.thumbnailData,
        fullData: isDev ? data : undefined
      });

      // ✅ FIXED: Handle connection events properly (don't skip them)
      if (data.type === 'connection') {
        console.log('🔍 SSE: Connection event received - connection confirmed');
        this.emit('connection_confirmed', data);
        return;
      }

      // Process heartbeat events normally (don't skip - let timeline management handle filtering)
      if (data.type === 'heartbeat') {
        console.log('🔍 SSE: Heartbeat event received - processing normally');
        this.emit('heartbeat', data);
        // Continue processing as a normal event
      }

      // ✅ FIXED: Process ALL device events, including those with thumbnails
      const eventType = event.event || 'event';
      
      console.log('🔍 SSE: Processing device event type:', eventType);
      
      // Emit based on event type from SSE stream
      if (eventType === 'event') {
        console.log('🔍 SSE: Emitting security_event');
        this.emit('security_event', data);
      } else if (eventType === 'arming') {
        console.log('🔍 SSE: Emitting space_state_change');
        this.emit('space_state_change', data);
      } else if (eventType === 'system') {
        console.log('🔍 SSE: Emitting system_event');
        this.emit('system_event', data);
      } else if (eventType === 'error') {
        console.log('🔍 SSE: Emitting error_event');
        this.emit('error_event', data);
      } else {
        console.log('🔍 SSE: Emitting unknown_event for type:', eventType);
        this.emit('unknown_event', data);
      }

    } catch (error) {
      console.error('🔍 SSE: Event handling error:', error);
    }
  }

  // 🔥 FIX: Immediate disconnect
  disconnect(): void {    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.connected) {
      this.connected = false;
      this.isReconnecting = false;
      this.emit('disconnected');
    }

    // 🔥 FIX: Clear all event listeners to prevent memory leaks
    this.eventListeners.clear();
  }

  // 🔥 FIX: Limited reconnection attempts
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max retry attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(2000 * this.reconnectAttempts, 5000); // 🔥 FIX: Shorter delays
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        // Silent retry
      }
    }, delay);
  }

  // Event emitter methods
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    const listeners = this.eventListeners.get(event)!;
    // 🔥 FIX: Increased listener limit from 5 to 20 to handle React re-mounting
    if (listeners.length < 20) {
      listeners.push(callback);
      console.log(`🔍 SSE: ✅ Registered listener for '${event}', total listeners: ${listeners.length}`);
      console.log(`🔍 SSE: All registered events:`, Array.from(this.eventListeners.keys()));
    } else {
      console.log(`🔍 SSE: ❌ Listener limit reached for '${event}', skipping registration`);
    }
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
    console.log(`🔍 SSE: Emitting '${event}' to ${listeners?.length || 0} listeners`);
    
    if (listeners && listeners.length > 0) {
      // 🔥 FIX: Process listeners synchronously to prevent buildup
      listeners.forEach((callback, index) => {
        try {
          console.log(`🔍 SSE: Calling listener ${index + 1}/${listeners.length} for '${event}'`);
          callback(data);
          console.log(`🔍 SSE: ✅ Listener ${index + 1} completed successfully for '${event}'`);
        } catch (error) {
          console.log(`🔍 SSE: ❌ Error in listener ${index + 1} for '${event}':`, error);
        }
      });
    } else {
      console.log(`🔍 SSE: ❌ No listeners found for '${event}' - this is the problem!`);
      console.log(`🔍 SSE: Available events with listeners:`, Array.from(this.eventListeners.keys()));
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// 🔥 FIX: Singleton with proper cleanup
let globalSSEClient: SSEClient | null = null;
let globalSSEConfig: string | null = null; // Track config to detect changes

export function createSSEClient(apiKey: string, options?: Partial<FusionSSEConfig>): FusionSSEClient {
  // Create a config signature to detect if we can reuse the existing client
  const configSignature = JSON.stringify({ apiKey, ...options });
  
  // 🔥 FIX: Only create new client if config changed or no client exists
  if (globalSSEClient && globalSSEConfig === configSignature) {
    console.log('🔍 SSE: Reusing existing client with same configuration');
    return globalSSEClient;
  }
  
  // 🔥 FIX: Clean up existing client only if config changed
  if (globalSSEClient) {
    console.log('🔍 SSE: Configuration changed, cleaning up existing client');
    globalSSEClient.disconnect();
    globalSSEClient = null;
  }
  
  console.log('🔍 SSE: Creating new client with configuration:', { 
    apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING',
    hasOptions: !!options 
  });
  
  globalSSEClient = new SSEClient({
    apiKey,
    ...options
  });
  
  globalSSEConfig = configSignature;
  
  return globalSSEClient;
} 