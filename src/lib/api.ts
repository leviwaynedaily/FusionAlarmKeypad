export const API_BASE_URL = 'https://fusion-bridge-production.up.railway.app';

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

export interface Area {
  id: string;
  name: string;
  armedState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
  locationId: string;
  locationName: string;
  lastArmedStateChangeReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  online?: boolean;  // Made optional since it doesn't exist in API
  lastStateUpdate?: string;  // Made optional
  status: string | null;
  displayState: string | null;
  areaId: string | null;
  locationId: string | null;
  deviceTypeInfo?: {
    type: string;
    subtype?: string;
  };
  model?: string;
  vendor?: string;
  connectorName?: string;
  connectorCategory?: string;
}

export interface Event {
  id: number;
  eventUuid: string;
  deviceId: string;
  deviceName: string;
  connectorId: string;
  connectorName: string;
  connectorCategory: string;
  areaId: string;
  areaName: string;
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
  // Use the Fusion API key from the environment variable
  const key = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
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

export const getAreas = async (locationId: string): Promise<ApiResponse<Area[]>> => {
  const response = await apiFetch<{ success: boolean; data: Area[] }>(`/api/areas?locationId=${locationId}`);
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data.data };
};

export const updateAreaState = async (areaId: string, armedState: Area['armedState']): Promise<ApiResponse<void>> => {
  return apiFetch<void>(`/api/areas/${areaId}/arm-state`, {
    method: 'PUT',
    body: JSON.stringify({ armedState }),
  });
};

export const getDevices = async (): Promise<ApiResponse<Device[]>> => {
  const response = await apiFetch<{ success: boolean; data: Device[] }>('/api/devices');
  if (response.error) {
    return { data: [], error: response.error };
  }
  return { data: response.data.data };
};



 