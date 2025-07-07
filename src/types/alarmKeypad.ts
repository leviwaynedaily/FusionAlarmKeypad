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
  areas: string[]; // area IDs
}

export interface ZoneWithAreas extends AlarmZone {
  areas: any[]; // Area objects
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

export interface PendingAreaToggle {
  area: any;
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