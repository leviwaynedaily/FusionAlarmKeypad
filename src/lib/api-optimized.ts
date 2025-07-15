import { 
  Location, 
  Space, 
  Device, 
  Event, 
  apiFetch, 
  ApiResponse, 
  getSpaces, 
  getDevices, 
  getLocations 
} from './api';

// Cache configuration
const CACHE_DURATION = {
  LOCATIONS: 5 * 60 * 1000,      // 5 minutes (rarely change)
  SPACES: 60 * 1000,              // 60 seconds (increased from 30)
  DEVICES: 45 * 1000,             // 45 seconds (can change state frequently)
  EVENTS: 15 * 1000,              // 15 seconds (most dynamic)
};

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>();

// Cache storage
const cache = new Map<string, { data: any; timestamp: number }>();

// Rate limiting - MUCH more conservative
let requestCount = 0;
let requestResetTime = Date.now() + 60000; // Reset every minute
const MAX_REQUESTS_PER_MINUTE = 20; // Reduced from 60 to 20

// Global poller management to prevent duplicate pollers
const activePollers = new Map<string, SmartPoller>();

// Check if cached data is still valid
const isCacheValid = (key: string, duration: number): boolean => {
  const cached = cache.get(key);
  if (!cached) return false;
  return Date.now() - cached.timestamp < duration;
};

// Get cached data
const getCached = <T>(key: string): T | null => {
  const cached = cache.get(key);
  return cached ? cached.data : null;
};

// Set cache
const setCache = (key: string, data: any): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Clear cache for a pattern
export const clearCache = (pattern?: string): void => {
  if (!pattern) {
    cache.clear();
    return;
  }
  
  Array.from(cache.keys())
    .filter(key => key.includes(pattern))
    .forEach(key => cache.delete(key));
};

// Rate limit check
const checkRateLimit = (): boolean => {
  const now = Date.now();
  if (now > requestResetTime) {
    requestCount = 0;
    requestResetTime = now + 60000;
  }
  
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  requestCount++;
  return true;
};

// Optimized API fetch with caching and deduplication
export const optimizedApiFetch = async <T>(
  path: string, 
  options: RequestInit = {},
  cacheKey?: string,
  cacheDuration?: number
): Promise<ApiResponse<T>> => {
  // Check cache first
  if (cacheKey && cacheDuration && options.method === 'GET') {
    if (isCacheValid(cacheKey, cacheDuration)) {
      const cached = getCached<T>(cacheKey);
      if (cached) {
        return { data: cached };
      }
    }
  }

  // Check for pending request (deduplication)
  const requestKey = `${options.method || 'GET'}-${path}`;
  if (pendingRequests.has(requestKey) && options.method === 'GET') {
    return pendingRequests.get(requestKey);
  }

  // Check rate limit
  if (!checkRateLimit()) {
    return {
      data: null as T,
      error: 'Rate limit exceeded. Please wait before making more requests.',
    };
  }

  // Import the original apiFetch
  const { apiFetch } = await import('./api');
  
  // Create promise for deduplication
  const requestPromise = apiFetch<T>(path, options);
  
  if (options.method === 'GET') {
    pendingRequests.set(requestKey, requestPromise);
  }

  try {
    const result = await requestPromise;
    
    // Cache successful GET requests
    if (!result.error && cacheKey && cacheDuration && options.method === 'GET') {
      setCache(cacheKey, result.data);
    }
    
    return result;
  } finally {
    pendingRequests.delete(requestKey);
  }
};

// Batch operations
export class BatchOperations {
  private operations: Array<() => Promise<any>> = [];
  private results: any[] = [];

  add(operation: () => Promise<any>): BatchOperations {
    this.operations.push(operation);
    return this;
  }

  async execute(): Promise<any[]> {
    // Execute in chunks to avoid overwhelming the API
    const chunkSize = 5;
    const chunks = [];
    
    for (let i = 0; i < this.operations.length; i += chunkSize) {
      chunks.push(this.operations.slice(i, i + chunkSize));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(chunk.map(op => op()));
      this.results.push(...chunkResults);
      
      // Small delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return this.results;
  }
}

// Optimized API methods
export const optimizedGetLocations = async (): Promise<ApiResponse<any[]>> => {
  const cacheKey = 'locations';
  const response = await optimizedApiFetch<{ success: boolean; data: any[] }>(
    '/api/locations',
    { method: 'GET' },
    cacheKey,
    CACHE_DURATION.LOCATIONS
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: (response.data?.data as any[]) || [] };
};

export const optimizedGetSpaces = async (locationId: string): Promise<ApiResponse<Space[]>> => {
  const cacheKey = `spaces-${locationId}`;
  const response = await optimizedApiFetch<{ success: boolean; data: Space[] }>(
    `/api/spaces?locationId=${locationId}`,
    {},
    cacheKey,
    CACHE_DURATION.SPACES
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Legacy function for backwards compatibility during migration
export const optimizedGetAreas = async (locationId: string): Promise<ApiResponse<Space[]>> => {
  return optimizedGetSpaces(locationId);
};

export const optimizedGetDevices = async (): Promise<ApiResponse<Device[]>> => {
  const cacheKey = 'devices';
  const response = await optimizedApiFetch<{ success: boolean; data: Device[] }>(
    '/api/devices',
    { method: 'GET' },
    cacheKey,
    CACHE_DURATION.DEVICES
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: (response.data?.data as any[]) || [] };
};

export const optimizedGetEvents = async (params: { limit: number; sinceHours: number }): Promise<ApiResponse<Event[]>> => {
  const cacheKey = `events-${params.limit}-${params.sinceHours}`;
  const response = await optimizedApiFetch<{ success: boolean; data: Event[] }>(
    `/api/events?limit=${params.limit}&sinceHours=${params.sinceHours}`,
    {},
    cacheKey,
    CACHE_DURATION.EVENTS
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Optimized Alarm Zone Management
export const optimizedGetAlarmZones = async (locationId: string): Promise<ApiResponse<any[]>> => {
  const cacheKey = `alarm-zones-${locationId}`;
  const response = await optimizedApiFetch<{ success: boolean; data: any[] }>(
    `/api/alarm-zones?locationId=${locationId}`,
    {},
    cacheKey,
    CACHE_DURATION.SPACES // Use same cache duration as spaces
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Optimized Device State Updates (no caching for state changes)
export const optimizedUpdateDeviceState = async (deviceId: string, state: string): Promise<ApiResponse<{ success: boolean }>> => {
  const response = await optimizedApiFetch<{ success: boolean; data: { success: boolean } }>(
    `/api/devices/${deviceId}/state`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        state: state,
        timestamp: new Date().toISOString()
      })
    }
  );
  
  // Clear devices cache after state update
  clearCache('devices');
  
  if (response.error) {
    return { data: { success: false }, error: response.error };
  }
  return { data: response.data?.data || { success: true } };
};

// Optimized Camera Management
export const optimizedGetCameras = async (spaceId?: string): Promise<ApiResponse<any[]>> => {
  const cacheKey = spaceId ? `cameras-${spaceId}` : 'cameras-all';
  const url = spaceId ? `/api/cameras?spaceId=${spaceId}` : '/api/cameras';
  
  const response = await optimizedApiFetch<{ success: boolean; data: any[] }>(
    url,
    {},
    cacheKey,
    CACHE_DURATION.DEVICES // Cameras change less frequently than events
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Optimized Events with Filtering
export const optimizedGetFilteredEvents = async (filters: any): Promise<ApiResponse<any[]>> => {
  const queryParams = new URLSearchParams();
  
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.sinceHours) queryParams.append('sinceHours', filters.sinceHours.toString());
  if (filters.showSpaceEvents !== undefined) queryParams.append('showSpaceEvents', filters.showSpaceEvents.toString());
  if (filters.showAlarmZoneEvents !== undefined) queryParams.append('showAlarmZoneEvents', filters.showAlarmZoneEvents.toString());
  if (filters.showAllEvents !== undefined) queryParams.append('showAllEvents', filters.showAllEvents.toString());
  
  const cacheKey = `filtered-events-${queryParams.toString()}`;
  const response = await optimizedApiFetch<{ success: boolean; data: any[] }>(
    `/api/events?${queryParams.toString()}`,
    {},
    cacheKey,
    CACHE_DURATION.EVENTS
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Optimized Space Devices
export const optimizedGetSpaceDevices = async (spaceId: string): Promise<ApiResponse<any[]>> => {
  const cacheKey = `space-devices-${spaceId}`;
  const response = await optimizedApiFetch<{ success: boolean; data: any[] }>(
    `/api/spaces/${spaceId}/devices`,
    {},
    cacheKey,
    CACHE_DURATION.DEVICES
  );
  
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

export const optimizedGetDashboardData = async (locationId: string) => {
  const batch = new BatchOperations();
  
  batch.add(() => optimizedGetSpaces(locationId));
  batch.add(() => optimizedGetDevices());
  batch.add(() => optimizedGetAlarmZones(locationId));
  batch.add(() => optimizedGetCameras());
  
  const [spaces, devices, alarmZones, cameras] = await batch.execute();
  
  return {
    spaces: spaces?.data || [],
    devices: devices?.data || [],
    alarmZones: alarmZones?.data || [],
    cameras: cameras?.data || []
  };
};

// Smart polling with exponential backoff and global management
export class SmartPoller {
  private intervalId: NodeJS.Timeout | null = null;
  private baseInterval: number;
  private currentInterval: number;
  private maxInterval: number;
  private lastDataHash: string = '';
  private pollerId: string;
  private isRunning: boolean = false;

  constructor(baseInterval = 30000, maxInterval = 300000) { // Default 30s base, 5min max
    this.baseInterval = Math.max(baseInterval, 15000); // Minimum 15 seconds
    this.currentInterval = this.baseInterval;
    this.maxInterval = maxInterval;
    this.pollerId = `poller_${Date.now()}_${Math.random()}`;
  }

  start(callback: () => Promise<any>, pollerKey?: string) {
    // If a poller key is provided, check for existing pollers
    if (pollerKey && activePollers.has(pollerKey)) {
      return;
    }

    this.stop();
    this.isRunning = true;
    
    if (pollerKey) {
      activePollers.set(pollerKey, this);
    }
    
    const poll = async () => {
      if (!this.isRunning) return;
      
      try {
        // Check rate limiting before polling
        if (!checkRateLimit()) {
          this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
          this.scheduleNext(poll);
          return;
        }

        const data = await callback();
        const dataHash = JSON.stringify(data);
        
        // If data hasn't changed, increase polling interval more aggressively
        if (dataHash === this.lastDataHash) {
          this.currentInterval = Math.min(this.currentInterval * 2, this.maxInterval);
        } else {
          // Data changed, but don't reset to base interval immediately
          this.currentInterval = Math.max(this.baseInterval, this.currentInterval * 0.8);
        }
        
        this.lastDataHash = dataHash;
      } catch (error) {
        // On error, back off more aggressively
        this.currentInterval = Math.min(this.currentInterval * 3, this.maxInterval);
      }
      
      this.scheduleNext(poll);
    };
    
    // Initial poll with delay to prevent thundering herd
    setTimeout(poll, Math.random() * 5000);
  }

  private scheduleNext(poll: () => Promise<void>) {
    if (this.isRunning) {
      this.intervalId = setTimeout(poll, this.currentInterval);
    }
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    
    // Remove from active pollers
    for (const [key, poller] of activePollers.entries()) {
      if (poller === this) {
        activePollers.delete(key);
        break;
      }
    }
  }

  reset() {
    this.currentInterval = this.baseInterval;
    this.lastDataHash = '';
  }

  getCurrentInterval() {
    return this.currentInterval;
  }
}

// Stop all active pollers (emergency function)
export const stopAllPollers = () => {
  activePollers.forEach(poller => poller.stop());
  activePollers.clear();
};

// Event subscription for real-time updates (future WebSocket implementation)
export class EventSubscription {
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }
}

// Export a singleton instance
export const eventBus = new EventSubscription(); 