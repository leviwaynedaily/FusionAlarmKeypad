export const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://fusion-bridge-production.up.railway.app';

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyInfo {
  keyId: string;
  keyName: string;
  rateLimitEnabled: boolean;
  remaining?: number;
}

export interface ApiKeyTestResponse {
  message: string;
  timestamp: string;
  authMethod: string;
  userId: string;
  organizationInfo: Organization | null;
  sessionInfo?: {
    user: {
      id: string;
      email: string;
      name: string;
    };
    hasSession: boolean;
  };
  apiKeyInfo?: ApiKeyInfo;
}

export interface Location {
  id: string;
  name: string;
  addressPostalCode?: string;
  parentId?: string | null;
  organizationId?: string;
  path?: string;
  timeZone?: string;
  externalId?: string | null;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  notes?: string | null;
  activeArmingScheduleId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Space {
  id: string;
  name: string;
  locationId: string;
  locationName?: string;
  description?: string | null;
  deviceIds?: string[];
  devices?: Device[];
  cameras?: Camera[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  category?: string;
  spaceId?: string | null;
  spaceName?: string;
  locationId?: string | null;
  status?: 'online' | 'offline' | 'error';
  armedState?: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
  capabilities?: string[];
  lastSeen?: string;
  online?: boolean;
  lastStateUpdate?: string;
  displayState?: string | null;
  deviceTypeInfo?: {
    type: string;
    subtype?: string;
    deviceType?: string;
    category?: string;
    displayName?: string;
    supportedFeatures?: string[];
  };
  model?: string;
  connectorName?: string;
  connectorCategory?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Camera {
  id: string;
  name: string;
  spaceId: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  isActive: boolean;
}

export interface AlarmZone {
  id: string;
  name: string;
  locationId: string;
  description: string | null;
  armedState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
  lastArmedStateChangeReason: string | null;
  triggerBehavior: string;
  locationName: string;
  createdAt: string;
  updatedAt: string;
  deviceIds: string[];
  // Legacy fields for backwards compatibility - will be populated from deviceIds
  devices?: Device[];
  color?: string;
  isActive?: boolean;
}

export interface ZoneWithDevices extends AlarmZone {
  devices: Device[];
  armedCount: number;
  totalCount: number;
}

// Display preferences for individual event types
export interface EventTypeDisplaySettings {
  showInTimeline: boolean;
  displayMode: 'thumbnail' | 'icon'; // thumbnail = base64 image, icon = custom icon
  customIcon: string; // emoji or icon identifier
}

export interface EventFilterSettings {
  showSpaceEvents: boolean;
  showAlarmZoneEvents: boolean;
  showAllEvents: boolean;
  // NEW: Alarm zone specific filtering
  showOnlyAlarmZoneEvents: boolean; // Show only events from devices in alarm zones
  selectedAlarmZones: string[]; // Empty array = show all alarm zones, populated = show only selected zones
  // Individual event type toggles (legacy - kept for backward compatibility)
  eventTypes: Record<string, boolean>; // eventType -> enabled
  // Category level toggles for bulk operations
  categories: Record<string, boolean>; // category -> enabled
  // NEW: Comprehensive per-event display settings
  eventTypeSettings: Record<string, EventTypeDisplaySettings>; // eventType -> display settings
}

// Legacy interface for backwards compatibility
export interface Area {
  id: string;
  name: string;
  armedState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
}

export interface Event {
  id: number;
  eventUuid: string;
  deviceId: string;
  deviceName: string;
  connectorId: string;
  connectorName: string;
  connectorCategory: string;
  spaceId: string;
  spaceName: string;
  alarmZoneId: string;
  alarmZoneName: string;
  locationId: string;
  locationName: string;
  timestamp: number;
  eventCategory: string;
  eventType: string;
  eventSubtype: string;
  payload: any;
  rawPayload: any;
  deviceTypeInfo: {
    deviceType: string;
    category: string;
    displayName: string;
    supportedFeatures: string[];
  };
  displayState?: string;
  rawEventType: string;
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  // Use the Fusion API key from localStorage first, then environment variable
  const key = localStorage.getItem('fusion_api_key') || process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
  const baseUrl = localStorage.getItem('fusion_api_url') || API_BASE_URL;
  console.log('[apiFetch] Using API key:', key);
  console.log('[apiFetch] Request URL:', `${baseUrl}${path}`);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        ...(options.headers || {}),
      },
    });
    // DEBUG: Print the response status
    console.log('[apiFetch] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        if (errorText) {
          errorMessage = errorText;
        }
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    // DEBUG: Print the response data
    console.log('[apiFetch] Response data:', data);
    return { data };
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return {
        data: null as T,
        error: 'Network error: Unable to connect to the server. Please check your connection and try again.',
      };
    }
    return {
      data: null as T,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

export const getApiKeyDetails = async (): Promise<ApiResponse<ApiKeyTestResponse>> => {
  const response = await apiFetch<any>('/api/admin/api-keys/test', {
    method: 'GET',
  });
  
  // Debug: Log the actual response structure
  console.log('🔍 API Raw Response from /api/admin/api-keys/test:', response);
  console.log('🔍 API Response data structure:', response.data);
  
  if (response.error) {
    return { data: null as unknown as ApiKeyTestResponse, error: response.error };
  }
  
  // Try to handle different response structures
  if (response.data && typeof response.data === 'object') {
    // If response.data.data exists, use it (nested structure)
    if ((response.data as any).data) {
      console.log('🔍 Using nested data structure:', (response.data as any).data);
      return { data: (response.data as any).data };
    }
    // If response.data has organizationInfo directly, use it (flat structure)
    else if ((response.data as any).organizationInfo !== undefined) {
      console.log('🔍 Using flat data structure:', response.data);
      return { data: response.data as unknown as ApiKeyTestResponse };
    }
  }
  
  console.log('🔍 Fallback: returning original response.data');
  return { data: response.data as unknown as ApiKeyTestResponse };
};

export const validateApiKey = async (key: string): Promise<ApiResponse<boolean>> => {
  const baseUrl = localStorage.getItem('fusion_api_url') || API_BASE_URL;
  try {
    const response = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Store organization info if available
    if (data.data?.organizationInfo) {
      localStorage.setItem('fusion_organization', JSON.stringify(data.data.organizationInfo));
    }
    return { data: true };
  } catch (error) {
    return {
      data: false,
      error: error instanceof Error ? error.message : 'Invalid API key',
    };
  }
};

export const validatePin = async (pin: string): Promise<ApiResponse<{ valid: boolean; userId: string; userName: string }>> => {
  const response = await apiFetch<{ success: boolean; data: { valid: boolean; userId: string; userName: string } }>('/api/alarm/keypad/validate-pin', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  if (response.error) {
    return { data: { valid: false, userId: '', userName: '' }, error: response.error };
  }
  return { data: response.data.data };
};

export const getLocations = async (): Promise<ApiResponse<any[]>> => {
  const response = await apiFetch<{ success: boolean; data: any[] }>('/api/locations');
  // DEBUG: Print the locations response
  console.log('[getLocations] Response:', response);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data.data };
};

export const getSpaces = async (locationId?: string): Promise<ApiResponse<Space[]>> => {
  const url = locationId ? `/api/spaces?locationId=${locationId}` : '/api/spaces';
  const response = await apiFetch<{ success: boolean; data: Space[] }>(url);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Legacy function for backwards compatibility during migration
export const getAreas = async (locationId: string): Promise<ApiResponse<Space[]>> => {
  return getSpaces(locationId);
};

// Note: Armed state functionality has moved to Alarm Zones API
// Use alarm zone endpoints for arming/disarming functionality

export const getDevices = async (): Promise<ApiResponse<Device[]>> => {
  const response = await apiFetch<{ success: boolean; data: Device[] }>('/api/devices');
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Alarm Zone Management
export const getAlarmZones = async (locationId: string): Promise<ApiResponse<AlarmZone[]>> => {
  const response = await apiFetch<{ success: boolean; data: AlarmZone[] }>(`/api/alarm-zones?locationId=${locationId}`);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

export const updateAlarmZone = async (zoneId: string, zoneData: Partial<AlarmZone>): Promise<ApiResponse<AlarmZone>> => {
  const response = await apiFetch<{ success: boolean; data: AlarmZone }>(`/api/alarm/zones/${zoneId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(zoneData)
  });
  if (response.error) {
    return { data: {} as AlarmZone, error: response.error };
  }
  return { data: response.data?.data || {} as AlarmZone };
};

// Device State Management
export const updateDeviceState = async (deviceId: string, state: string): Promise<ApiResponse<{ success: boolean }>> => {
  const response = await apiFetch<{ success: boolean; data: { success: boolean } }>(`/api/devices/${deviceId}/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      state: state,
      timestamp: new Date().toISOString()
    })
  });
  if (response.error) {
    return { data: { success: false }, error: response.error };
  }
  return { data: response.data?.data || { success: true } };
};

// User Preferences Management
export interface UserPreferences {
  eventFilterSettings: EventFilterSettings;
  customEventNames: Record<string, string>;
}

export const saveUserPreferences = async (
  organizationId: string,
  locationId: string | null,
  preferences: UserPreferences,
  userId: string = 'default'
): Promise<ApiResponse<{ success: boolean }>> => {
  const response = await fetch('/api/user-preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationId,
      locationId,
      userId,
      eventFilterSettings: preferences.eventFilterSettings,
      customEventNames: preferences.customEventNames
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { data: { success: false }, error: errorText };
  }

  const data = await response.json();
  return { data: data.data };
};

export const loadUserPreferences = async (
  organizationId: string,
  locationId: string | null,
  userId: string = 'default'
): Promise<ApiResponse<UserPreferences | null>> => {
  const params = new URLSearchParams({
    organizationId,
    userId
  });
  
  if (locationId) {
    params.append('locationId', locationId);
  }

  const response = await fetch(`/api/user-preferences?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    return { data: null, error: errorText };
  }

  const result = await response.json();
  return { data: result.data };
};

export const armDevices = async (deviceIds: string[], armState: 'ARMED_AWAY' | 'ARMED_STAY'): Promise<ApiResponse<{ success: boolean; results: any[] }>> => {
  const response = await apiFetch<{ success: boolean; data: { success: boolean; results: any[] } }>('/api/devices/arm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      deviceIds: deviceIds,
      armState: armState,
      timestamp: new Date().toISOString()
    })
  });
  if (response.error) {
    return { data: { success: false, results: [] }, error: response.error };
  }
  return { data: response.data?.data || { success: true, results: [] } };
};

export const disarmDevices = async (deviceIds: string[]): Promise<ApiResponse<{ success: boolean; results: any[] }>> => {
  const response = await apiFetch<{ success: boolean; data: { success: boolean; results: any[] } }>('/api/devices/disarm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      deviceIds: deviceIds,
      timestamp: new Date().toISOString()
    })
  });
  if (response.error) {
    return { data: { success: false, results: [] }, error: response.error };
  }
  return { data: response.data?.data || { success: true, results: [] } };
};

// Space Device Management
export const getSpaceDevices = async (spaceId: string): Promise<ApiResponse<Device[]>> => {
  const response = await apiFetch<{ success: boolean; data: Device[] }>(`/api/spaces/${spaceId}/devices`);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

// Camera Management
export const getCameras = async (spaceId?: string): Promise<ApiResponse<Camera[]>> => {
  const url = spaceId ? `/api/cameras?spaceId=${spaceId}` : '/api/cameras';
  const response = await apiFetch<{ success: boolean; data: Camera[] }>(url);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};

export const getCameraImage = async (cameraId: string): Promise<ApiResponse<{ imageUrl: string; timestamp: string }>> => {
  const response = await apiFetch<{ success: boolean; data: { imageUrl: string; timestamp: string } }>(`/api/cameras/${cameraId}/image`);
  if (response.error) {
    return { data: { imageUrl: '', timestamp: '' }, error: response.error };
  }
  return { data: response.data?.data || { imageUrl: '', timestamp: '' } };
};

// Get available event types from database
export const getEventTypes = async (organizationId: string, locationId?: string, sinceHours: number = 168): Promise<ApiResponse<{ eventTypes: any[] }>> => {
  const queryParams = new URLSearchParams();
  queryParams.append('organizationId', organizationId);
  if (locationId) queryParams.append('locationId', locationId);
  queryParams.append('sinceHours', sinceHours.toString());

  try {
    // Call local Next.js API route directly
    const response = await fetch(`/api/events/types?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getEventTypes] Error response:', errorText);
      return { data: { eventTypes: [] }, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    console.log('[getEventTypes] Success response:', data);
    return { data: data || { eventTypes: [] } };
  } catch (error) {
    console.error('[getEventTypes] Network error:', error);
    return { data: { eventTypes: [] }, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// Events with Filtering
export const getFilteredEvents = async (filters: Partial<EventFilterSettings> & { limit?: number; sinceHours?: number }): Promise<ApiResponse<Event[]>> => {
  const queryParams = new URLSearchParams();
  
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.sinceHours) queryParams.append('sinceHours', filters.sinceHours.toString());
  if (filters.showSpaceEvents !== undefined) queryParams.append('showSpaceEvents', filters.showSpaceEvents.toString());
  if (filters.showAlarmZoneEvents !== undefined) queryParams.append('showAlarmZoneEvents', filters.showAlarmZoneEvents.toString());
  if (filters.showAllEvents !== undefined) queryParams.append('showAllEvents', filters.showAllEvents.toString());
  
  const response = await apiFetch<{ success: boolean; data: Event[] }>(`/api/events?${queryParams.toString()}`);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data?.data || [] };
};



 