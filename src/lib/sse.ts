// Server-Sent Events (SSE) client for real-time event streaming - OPTIMIZED VERSION
import { logger } from './logger';

const isProduction = process.env.NODE_ENV === 'production';
const isDev = !isProduction;

// Reduced monitoring categories for better performance
const MONITORED_CATEGORIES = [
  'alarm',
  'intrusion', 
  'area',
  'device'
];

export interface SSEEvent {
  type: 'connection' | 'event' | 'heartbeat' | 'system';
  organizationId?: string;
  timestamp?: string;
  data?: any;
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
  private maxReconnectAttempts: number = 3; // Reduced from 5
  private reconnectTimer: NodeJS.Timeout | null = null;
  private abortController: AbortController | null = null;
  private isReconnecting: boolean = false;

  constructor(config: FusionSSEConfig) {
    this.config = {
      baseUrl: 'https://fusion-bridge-production.up.railway.app',
      categories: MONITORED_CATEGORIES,
      eventTypes: [],
      ...config
    };
  }

  // Optimized connection with minimal logging
  connect(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Only log in development
        if (isDev) {
          console.log('🔗 SSE: Connecting...');
        }

        // Prevent multiple simultaneous connections
        if (this.connected || this.isReconnecting) {
          resolve();
          return;
        }

        this.disconnect(); // Clean up any existing connection

        const url = new URL('/api/events/stream', this.config.baseUrl);
        
        if (this.config.organizationId) {
          url.searchParams.append('organizationId', this.config.organizationId);
        }
        
        // Only include thumbnails if we need them to reduce payload
        url.searchParams.append('includeThumbnails', 'false');

        const headers = {
          'Accept': 'text/event-stream',
          'x-api-key': this.config.apiKey
        };

        this.abortController = new AbortController();
        this.isReconnecting = true;

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: headers,
          signal: this.abortController.signal,
          cache: 'no-store',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        this.connected = true;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.lastEventTime = Date.now();

        if (isDev) {
          console.log('✅ SSE: Connected successfully');
        }

        this.emit('connected');
        resolve();

        // Start processing the stream
        await this.processStreamingResponse(response);

      } catch (error) {
        this.isReconnecting = false;
        
        if (error instanceof Error && error.name === 'AbortError') {
          this.connected = false;
          resolve();
          return;
        }

        logger.error('SSE connection failed:', error);
        this.emit('error', error);
        this.scheduleReconnect();
        reject(error);
      }
    });
  }

  // Optimized stream processing with minimal logging
  private async processStreamingResponse(response: Response) {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: { event?: string; data?: string; id?: string } = {};

    try {
      while (this.connected && !this.abortController?.signal.aborted) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.connected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine === '') {
            if (currentEvent.event || currentEvent.data) {
              this.handleSSEEvent(currentEvent);
              currentEvent = {};
            }
          } else if (trimmedLine.startsWith('event:')) {
            currentEvent.event = trimmedLine.substring(6).trim();
          } else if (trimmedLine.startsWith('data:')) {
            const data = trimmedLine.substring(5).trim();
            currentEvent.data = (currentEvent.data || '') + data;
          } else if (trimmedLine.startsWith('id:')) {
            currentEvent.id = trimmedLine.substring(3).trim();
          }
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

  // Optimized event handling with minimal logging
  private handleSSEEvent(event: { event?: string; data?: string; id?: string }) {
    try {
      this.lastEventTime = Date.now();
      
      if (!event.data) {
        return;
      }

      let data: any;
      try {
        data = JSON.parse(event.data);
      } catch (parseError) {
        return;
      }

      // Only log important events in development
      if (isDev && data.type !== 'heartbeat') {
        console.log('📨 SSE Event:', data.type, data.deviceName || '');
      }

      // Handle different event types
      if (data.type === 'connection') {
        this.emit('connection_confirmed', data);
      } 
      else if (data.type === 'heartbeat') {
        this.emit('heartbeat', data);
      }
      else if (data.eventUuid) {
        // Handle specific event categories
        if (data.category === 'DEVICE_STATE' && data.type === 'STATE_CHANGED') {
          this.emit('device_state_change', data);
        }
        else if (data.category && data.category.includes('DEVICE')) {
          this.emit('device_state_change', data);
        }
        else if (data.category === 'AREA_STATE' && (data.type === 'ARMED' || data.type === 'DISARMED')) {
          this.emit('area_state_change', data);
        }
        else if (data.category === 'ALARM' || data.category === 'INTRUSION') {
          this.emit('alarm_event', data);
        }
        else if (data.category === 'CHECK_IN') {
          this.emit('device_check_in', data);
        }

        // Emit generic security event for all events
        this.emit('security_event', data);
        
        // Also emit as device_state_change if it has a device name
        if (data.deviceName && !data.category?.includes('AREA')) {
          this.emit('device_state_change', data);
        }
      }
      else {
        this.emit('unknown_event', data);
        
        if (data.deviceName) {
          this.emit('device_state_change', data);
        }
      }

    } catch (error) {
      // Only log critical errors
      if (isDev) {
        console.error('SSE event handling error:', error);
      }
    }
  }

  // Optimized disconnect
  disconnect(): void {
    if (isDev) {
      console.log('🔌 SSE: Disconnecting...');
    }
    
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
  }

  // Optimized reconnection with shorter delays
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max retry attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // Cap at 10s instead of 30s
    
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
          // Silent error handling to prevent console spam
          if (isDev) {
            console.error(`SSE listener error for ${event}:`, error);
          }
        }
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Singleton pattern to prevent multiple connections
let globalSSEClient: SSEClient | null = null;

export function createSSEClient(organizationId: string, apiKey: string): FusionSSEClient {
  // Disconnect existing client if any
  if (globalSSEClient) {
    globalSSEClient.disconnect();
  }
  
  globalSSEClient = new SSEClient({
    organizationId,
    apiKey
  });
  
  return globalSSEClient;
} 