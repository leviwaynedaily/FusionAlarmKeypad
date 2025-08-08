// Alarm Keypad Types

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

export interface AlarmZone {
  id: string;
  name: string;
  color: string;
  devices: Device[]; // Individual devices instead of space groups
  armedState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
  locationId: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ZoneWithDevices extends AlarmZone {
  devices: Device[]; // Device objects with full details
  armedCount: number;
  totalCount: number;
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
  description?: string;
  locationId: string;
  devices: Device[];
  cameras?: Camera[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  category: string;
  spaceId: string;
  spaceName?: string;
  status: 'online' | 'offline' | 'error';
  armedState?: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
  capabilities: string[];
  lastSeen?: string;
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

export interface PendingSpaceToggle {
  space: any;
  newState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
}

export interface WeatherSaveStatus {
  status: 'idle' | 'saving' | 'success' | 'error';
}

export interface SystemStatus {
  status: 'online' | 'degraded' | 'offline';
  connectivity: 'all_online' | 'some_offline' | 'all_offline';
  lastHeartbeat: number;
  offlineDevices: string[];
}

export interface DesignConfig {
  useDesign2: boolean;
  useTestDesign: boolean;
  useTestDesign2: boolean;
}

export interface UIState {
  showSettings: boolean;
  showLocationSelect: boolean;
  showEvents: boolean;
  showAutomation: boolean;
  showZonesPreview: boolean;
  showSeconds: boolean;
  showLiveEvents: boolean;
  highlightPinButtons: boolean;
  showWarningConfirm: boolean;
  showWarningDetails: string | null;
  pressedButton: string | null;
}

export interface ServiceWorkerState {
  isCheckingForUpdate: boolean;
  lastUpdateCheck: string;
}

// Event type information from database
export interface EventTypeInfo {
  eventType: string;
  displayName: string;
  icon: string;
  category: string | null;
  count: number;
  sampleDevices: string[];
}

// Display preferences for individual event types
export interface EventTypeDisplaySettings {
  showInTimeline: boolean;
  displayMode: 'thumbnail' | 'icon'; // thumbnail = base64 image, icon = custom icon
  customIcon: string; // emoji or icon identifier
}

// NEW: Chime settings for per-event audible notifications
export interface ChimeSettings {
  enabled: boolean;
  volume: number; // 0..1
  onlyWhenVisible: boolean;
  rateLimitMs: number; // Minimum gap between chimes
  quietHours: { enabled: boolean; start: string; end: string }; // 24h format HH:mm
  eventTypeChimes: Record<string, { enabled: boolean; soundId: string; volume?: number }>;
}

// Event filtering options for timeline
export interface EventFilterSettings {
  showSpaceEvents: boolean;
  showAlarmZoneEvents: boolean;
  showAllEvents: boolean;
  // NEW: Alarm zone specific filtering
  showOnlyAlarmZoneEvents: boolean; // Show only events from devices in alarm zones
  selectedAlarmZones: string[]; // Empty array = show all alarm zones, populated = show only selected zones
  // NEW: Unknown event filtering
  showUnknownEvents: boolean; // Show/hide events with unknown or unrecognized types
  // NEW: Image-based filtering
  showOnlyEventsWithImages: boolean; // Show only events that have images/thumbnails
  // Individual event type toggles (legacy - kept for backward compatibility)
  eventTypes: Record<string, boolean>; // eventType -> enabled
  // Category level toggles for bulk operations
  categories: Record<string, boolean>; // category -> enabled
  // NEW: Comprehensive per-event display settings
  eventTypeSettings: Record<string, EventTypeDisplaySettings>; // eventType -> display settings
}

// Legacy interface for backwards compatibility during migration
export interface Area {
  id: string;
  name: string;
  armedState: 'DISARMED' | 'ARMED_AWAY' | 'ARMED_STAY' | 'TRIGGERED';
  // This will be removed after migration
} 