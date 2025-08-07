'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SSEEventDisplay } from '@/hooks/useSSE';
import { EventDetailsModal } from './EventDetailsModal';
import { formatRelativeTime } from '@/lib/alarmKeypadUtils';

// Import necessary types
import { Camera, Space, EventFilterSettings, AlarmZone } from '@/lib/api';

// Import React Icons for custom icon support
import { 
  MdSecurity, MdLock, MdLockOpen, MdShield, MdWarning, MdAlarm, MdNotifications, MdHome, MdKey, MdVisibility, MdVisibilityOff,
  MdLightbulb, MdPower, MdSettings, MdSmartphone, MdComputer, MdTv, MdFlashOn, MdWifi, MdVideocam, MdPhotoCamera, MdMic,
  MdThermostat, MdTrendingUp, MdPerson, MdPeople, MdDirectionsWalk, MdDirectionsRun, MdPets, MdFace, MdCheckCircle, MdCancel, 
  MdError, MdInfo, MdDirectionsCar, MdDirectionsBike, MdLocalShipping, MdFlight, MdTrain, MdDirectionsBus
} from 'react-icons/md';

import {
  HiShieldCheck, HiLockClosed, HiLockOpen, HiEye, HiEyeSlash, HiBell, HiExclamationTriangle, HiHome, HiKey,
  HiLightBulb, HiComputerDesktop, HiDevicePhoneMobile, HiTv, HiCog, HiSignal, HiWifi, HiCamera, HiVideoCamera, 
  HiMicrophone, HiChartBar, HiUser, HiUsers, HiUserGroup, HiHandRaised, HiPlay, HiPause, HiStop,
  HiCheckCircle, HiXCircle, HiExclamationCircle, HiInformationCircle, HiPhone, HiPower
} from 'react-icons/hi2';

import {
  Shield, Lock, Unlock, Eye, EyeOff, Bell, AlertTriangle, Home, Key, Camera as CameraIcon, Video, Mic, Thermometer, 
  Zap, Battery, Wifi, Car, Bike, Truck, Plane, Building, Lightbulb, Smartphone, Monitor,
  User, Users, Activity, TrendingUp, CheckCircle, XCircle, AlertCircle, Info, Settings, Power, Play, Pause
} from 'lucide-react';

// React Icon component mapping for custom icons
const REACT_ICON_MAPPING: Record<string, React.ComponentType<any>> = {
  // Security icons
  'shield': Shield,
  'md-security': MdSecurity,
  'hi-shield': HiShieldCheck,
  'lock': Lock,
  'md-lock': MdLock,
  'hi-lock': HiLockClosed,
  'unlock': Unlock,
  'md-unlock': MdLockOpen,
  'hi-unlock': HiLockOpen,
  'eye': Eye,
  'md-eye': MdVisibility,
  'hi-eye': HiEye,
  'eye-off': EyeOff,
  'md-eye-off': MdVisibilityOff,
  'hi-eye-off': HiEyeSlash,
  'bell': Bell,
  'md-alarm': MdAlarm,
  'hi-bell': HiBell,
  'warning': AlertTriangle,
  'md-warning': MdWarning,
  'hi-warning': HiExclamationTriangle,
  'home': Home,
  'md-home': MdHome,
  'hi-home': HiHome,
  'key': Key,
  'md-key': MdKey,
  'hi-key': HiKey,
  
  // Device icons
  'lightbulb': Lightbulb,
  'md-lightbulb': MdLightbulb,
  'hi-lightbulb': HiLightBulb,
  'smartphone': Smartphone,
  'md-smartphone': MdSmartphone,
  'hi-smartphone': HiDevicePhoneMobile,
  'monitor': Monitor,
  'md-computer': MdComputer,
  'hi-desktop': HiComputerDesktop,
  'power': Power,
  'md-power': MdPower,
  'hi-power': HiPower,
  'settings': Settings,
  'md-settings': MdSettings,
  'hi-settings': HiCog,
  'zap': Zap,
  'md-flash': MdFlashOn,
  'battery': Battery,
  'wifi': Wifi,
  'md-wifi': MdWifi,
  'hi-wifi': HiWifi,
  
  // Sensor icons
  'camera': CameraIcon,
  'md-camera': MdPhotoCamera,
  'hi-camera': HiCamera,
  'video': Video,
  'md-video': MdVideocam,
  'hi-video': HiVideoCamera,
  'mic': Mic,
  'md-mic': MdMic,
  'hi-mic': HiMicrophone,
  'thermometer': Thermometer,
  'md-thermostat': MdThermostat,
  'activity': Activity,
  'trending': TrendingUp,
  'md-trending': MdTrendingUp,
  'hi-chart': HiChartBar,
  
  // Motion icons
  'user': User,
  'md-person': MdPerson,
  'hi-user': HiUser,
  'users': Users,
  'md-people': MdPeople,
  'hi-users': HiUsers,
  'md-walk': MdDirectionsWalk,
  'md-run': MdDirectionsRun,
  'md-pets': MdPets,
  'md-face': MdFace,
  'hi-hand': HiHandRaised,
  
  // Status icons
  'check': CheckCircle,
  'md-check': MdCheckCircle,
  'hi-check': HiCheckCircle,
  'x-circle': XCircle,
  'md-cancel': MdCancel,
  'hi-x-circle': HiXCircle,
  'alert-circle': AlertCircle,
  'md-error': MdError,
  'hi-alert': HiExclamationCircle,
  'info': Info,
  'md-info': MdInfo,
  'hi-info': HiInformationCircle,
  'play': Play,
  'hi-play': HiPlay,
  'pause': Pause,
  'hi-pause': HiPause,
  
  // Vehicle icons
  'car': Car,
  'md-car': MdDirectionsCar,
  'bike': Bike,
  'md-bike': MdDirectionsBike,
  'truck': Truck,
  'md-truck': MdLocalShipping,
  'plane': Plane,
  'md-plane': MdFlight,
  'md-train': MdTrain,
  'md-bus': MdDirectionsBus
};

// Function to get React Icon component by ID
const getReactIconComponent = (iconId: string): React.ComponentType<any> | null => {
  return REACT_ICON_MAPPING[iconId] || null;
};

interface LiveEventsTickerProps {
  showLiveEvents: boolean;
  recentEvents: SSEEventDisplay[];
  debugMode?: boolean;
  cameras?: Camera[]; // Added camera data for better integration
  spaces?: Space[]; // Added space data for context
  eventFilterSettings?: EventFilterSettings; // Added event filtering
  alarmZones?: AlarmZone[]; // Added alarm zones for zone-based filtering
}

const eventTypeIcon: Record<string, React.ReactNode> = {
  lock_locked: <span role="img" aria-label="Locked">🔒</span>,
  lock_unlocked: <span role="img" aria-label="Unlocked">🔓</span>,
  door_opened: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <rect x="4" y="3" width="6" height="18" rx="1" />
      <path d="M10 4l9 2v12l-9 2z" />
      <circle cx="14" cy="12" r="0.8" fill="#fff" />
    </svg>
  ),
  door_closed: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <circle cx="14" cy="12" r="0.8" fill="#fff" />
    </svg>
  ),
  motion_detected: <span role="img" aria-label="Motion">🏃‍♂️</span>,
  intrusion_detected: <span role="img" aria-label="Intrusion">🚨</span>,
  vehicle_detected: <span role="img" aria-label="Vehicle">🚗</span>,
  person_detected: <span role="img" aria-label="Person">🚶‍♂️</span>,
  animal_detected: <span role="img" aria-label="Animal">🐕</span>,
  alarm_triggered: <span role="img" aria-label="Alarm">🚨</span>,
  area_armed: <span role="img" aria-label="Armed">🟩</span>,
  area_disarmed: <span role="img" aria-label="Disarmed">⬜️</span>,
  light_on: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
      <path d="M12 2a7 7 0 00-4 12.83V17a1 1 0 001 1h6a1 1 0 001-1v-2.17A7 7 0 0012 2z" />
      <path d="M9 22h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  light_off: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 10a5 5 0 00-8.9-3" />
      <path d="M9.34 9.34A5 5 0 002 10a5 5 0 008.9 3" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  unknown: (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <line x1="7" y1="21" x2="17" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <path d="M16 7s-1.5-2-4-2-4 2-4 2" />
      <path d="M14 10s-.9-1-2-1-2 1-2 1" />
    </svg>
  ),
  // Add more mappings as needed
  default: <span role="img" aria-label="Event">🔔</span>,
};

// Human-readable labels for event types
const eventTypeLabel: Record<string, string> = {
  lock_locked: 'Locked',
  lock_unlocked: 'Unlocked',
  door_opened: 'Open',
  door_closed: 'Closed',
  motion_detected: 'Motion',
  alarm_triggered: 'Alarm',
  area_armed: 'Armed',
  area_disarmed: 'Disarmed',
  light_on: 'On',
  light_off: 'Off',
};

function formatTime(ts?: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function LiveEventsTicker({ 
  showLiveEvents, 
  recentEvents,
  debugMode = false,
  cameras = [],
  spaces = [],
  eventFilterSettings,
  alarmZones = []
}: LiveEventsTickerProps) {
  const [selected, setSelected] = useState<SSEEventDisplay | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [debugGapSize, setDebugGapSize] = useState(0.25); // In rem units for debug adjustment

  // Debug logging helper
  const debugLog = (message: string, data?: any) => {
    if (debugMode) {
      console.log(message, data);
    }
  };
  const rowRef = useRef<HTMLDivElement>(null);

  const handleClose = () => setSelected(null);

  // Enhanced camera integration for space events
  const getCameraForEvent = (event: SSEEventDisplay): Camera | null => {
    if (!event.spaceId || cameras.length === 0) return null;
    
    // Find camera in the same space as the event
    const spaceCamera = cameras.find(camera => camera.spaceId === event.spaceId && camera.isActive);
    if (spaceCamera) {
      debugLog('📸 Found camera for event:', {
        device: event.deviceName,
        space: event.spaceName,
        camera: spaceCamera.name
      });
      return spaceCamera;
    }
    
    return null;
  };

  // Get space context for an event
  const getSpaceForEvent = (event: SSEEventDisplay): Space | null => {
    if (!event.spaceId || spaces.length === 0) return null;
    return spaces.find(space => space.id === event.spaceId) || null;
  };

  // Check if an event's device belongs to an alarm zone
  const getAlarmZoneForEvent = (event: SSEEventDisplay): AlarmZone | null => {
    if (!event.deviceName || alarmZones.length === 0) return null;
    
    // Find alarm zone that contains this device
    return alarmZones.find(zone => 
      zone.devices?.some(device => 
        device.name === event.deviceName || 
        device.id === event.deviceId
      )
    ) || null;
  };

  // Filter events based on settings
  const filteredEvents = useMemo(() => {
    if (!eventFilterSettings) return recentEvents;
    
    return recentEvents.filter(event => {
      // 🔒 LOCATION FILTERING: Double-check location filtering as defensive measure
      try {
        const storedLocation = localStorage.getItem('selected_location') || 
                              localStorage.getItem('fusion_selected_location');
        if (storedLocation) {
          const locationData = JSON.parse(storedLocation);
          const selectedLocationId = locationData.id;
          
          // If event has locationId and it doesn't match selected location, filter it out
          if (event.locationId && selectedLocationId && event.locationId !== selectedLocationId) {
            debugLog('🔒 LiveEventsTicker: Filtering out event from different location:', {
              eventLocationId: event.locationId,
              selectedLocationId: selectedLocationId,
              eventDevice: event.deviceName
            });
            return false;
          }
        }
      } catch (e) {
        // Continue if we can't parse location data
      }
      
      const eventType = event.type?.toLowerCase();
      
      // 🆕 NEW: Image-based filtering (HIGHEST PRIORITY - runs before "Show All Events")
      const hasImage = !!(event.imageUrl || 
                         (event as any).thumbnail || 
                         (event as any).thumbnailData?.data || 
                         (event as any).event_data?.imageUrl || 
                         (event as any).event_data?.thumbnail);
      
      debugLog('🔍 LiveEventsTicker: Image detection for event:', {
        device: event.deviceName,
        type: eventType,
        hasImage: hasImage,
        imageUrl: !!event.imageUrl,
        thumbnail: !!(event as any).thumbnail,
        thumbnailData: !!(event as any).thumbnailData?.data,
        eventDataImageUrl: !!(event as any).event_data?.imageUrl,
        eventDataThumbnail: !!(event as any).event_data?.thumbnail,
        showOnlyEventsWithImages: eventFilterSettings.showOnlyEventsWithImages
      });
      
      // If "Show Only Events With Images" is enabled, hide events without images
      if (eventFilterSettings.showOnlyEventsWithImages && !hasImage) {
        debugLog('🚫 LiveEventsTicker: Hiding event without image:', {
          device: event.deviceName,
          type: eventType,
          hasImage: hasImage
        });
        return false;
      }
      
      // ✅ FIXED: Check individual event type settings (after image filtering)
      if (eventType && eventFilterSettings.eventTypes.hasOwnProperty(eventType)) {
        const isEnabled = eventFilterSettings.eventTypes[eventType] !== false;
        // If "Show All Events" is enabled, it can override disabled events to show them
        // But if an event is explicitly disabled, "Show All Events" can still enable it
        if (eventFilterSettings.showAllEvents) {
          return true; // Show all events when explicitly requested
        }
        return isEnabled; // Respect individual toggle when "Show All Events" is off
      }
      
      // Check new event type settings format
      if (eventType && eventFilterSettings.eventTypeSettings[eventType]) {
        const isEnabled = eventFilterSettings.eventTypeSettings[eventType].showInTimeline;
        if (eventFilterSettings.showAllEvents) {
          return true; // Show all events when explicitly requested
        }
        return isEnabled;
      }
      
      // NEW: Alarm zone specific filtering
      const eventAlarmZone = getAlarmZoneForEvent(event);
      const isInAlarmZone = !!eventAlarmZone;
      
      // If "Show only alarm zone events" is enabled, filter out non-alarm-zone events
      if (eventFilterSettings.showOnlyAlarmZoneEvents && !isInAlarmZone) {
        return false;
      }
      
      // If specific alarm zones are selected, only show events from those zones
      if (eventFilterSettings.selectedAlarmZones.length > 0 && isInAlarmZone) {
        if (!eventFilterSettings.selectedAlarmZones.includes(eventAlarmZone.id)) {
          return false;
        }
      }
      
      // Check if event is space-related
      const isSpaceEvent = event.spaceId && event.spaceName;
      if (eventFilterSettings.showSpaceEvents && isSpaceEvent) return true;
      
      // Check if event is alarm zone related (legacy logic - device in an alarm zone)
      const isAlarmZoneEvent = event.category?.includes('alarm') || 
                               event.type?.includes('alarm') ||
                               event.displayState?.includes('armed') ||
                               isInAlarmZone; // Also include our new alarm zone detection
      if (eventFilterSettings.showAlarmZoneEvents && isAlarmZoneEvent) return true;
      
      // 🆕 NEW: Unknown event filtering
      const isUnknownEvent = !eventType || 
                             eventType === 'unknown' || 
                             eventType.includes('unknown') || 
                             !event.category || 
                             event.category === 'unknown';
      
      if (isUnknownEvent && !eventFilterSettings.showUnknownEvents) {
        debugLog('🚫 LiveEventsTicker: Hiding unknown event:', {
          type: eventType,
          category: event.category,
          device: event.deviceName
        });
        return false;
      }
      

      // ✅ FIXED: Default fallback - only show if "Show All Events" is enabled
      // This prevents unknown event types from appearing when user wants filtered events
      return eventFilterSettings.showAllEvents;
    });
  }, [recentEvents, eventFilterSettings, alarmZones]);

  // Auto-scroll left to show newest card
  useEffect(() => {
    if (rowRef.current) {
      rowRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, [filteredEvents]);



  // Listen for timeline settings changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'timeline_events') {
        setSettingsVersion(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (!showLiveEvents) {
    debugLog('🔍 Timeline: Hidden - showLiveEvents is false');
    return null;
  }

  // 🔥 FIX: Show timeline even with no filtered events for debugging
  if (!filteredEvents.length) {
    debugLog('🔍 Timeline: No filtered events, showing debug message');
    return (
      <div className="relative w-full bg-white dark:bg-[#0f0f0f] border-t border-gray-200 dark:border-gray-800 pointer-events-none hidden sm:block">
        <div className="relative">
          <div className="pointer-events-auto bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 p-4 text-center border-t border-yellow-200 dark:border-yellow-700">
            <div className="text-sm font-medium">
              Timeline: {recentEvents.length} events available, but {filteredEvents.length} match filters
            </div>
            <div className="text-xs mt-1">
              Check console for filtering details. Recent events: {recentEvents.map(e => e.deviceName || 'Unknown').join(', ')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced image data retrieval with display mode preferences
  const getImageData = (event: SSEEventDisplay) => {
    // Check if this event type should use custom icon instead of thumbnail
    const eventType = event.type?.toLowerCase();
    if (eventFilterSettings?.eventTypeSettings[eventType]) {
      const settings = eventFilterSettings.eventTypeSettings[eventType];
      if (settings.displayMode === 'icon') {
        // Return null to force icon display instead of thumbnail
        debugLog(`🎨 Using custom icon for ${eventType} (displayMode: icon)`);
        return null;
      }
    }

    // First, check if there's an associated camera in the space
    const spaceCamera = getCameraForEvent(event);
    if (spaceCamera && spaceCamera.thumbnailUrl) {
      debugLog('📸 Using space camera thumbnail:', {
        device: event.deviceName,
        space: event.spaceName,
        camera: spaceCamera.name,
        thumbnailUrl: spaceCamera.thumbnailUrl
      });
      return spaceCamera.thumbnailUrl;
    }
    
    // Check standard imageUrl field
    if (event.imageUrl) return event.imageUrl;
    
    // Check thumbnail data from event
    if ((event as any).thumbnail) return (event as any).thumbnail;
    if ((event as any).thumbnailData?.data) return (event as any).thumbnailData.data;
    if ((event as any).rawEvent?.thumbnailData?.data) return (event as any).rawEvent.thumbnailData.data;
    
    // Check event_data for image information  
    if ((event as any).event_data?.imageUrl) return (event as any).event_data.imageUrl;
    if ((event as any).event_data?.thumbnail) return (event as any).event_data.thumbnail;
    if ((event as any).event_data?.image) return (event as any).event_data.image;
    
    // Check if intrusion events might have images in the raw payload
    try {
      if (typeof event.type === 'string' && event.type.startsWith('{')) {
        const parsedType = JSON.parse(event.type);
        if (parsedType.eventResourceId && event.deviceName?.includes('180')) {
          // This is likely a camera event that might have image data
          debugLog('📸 Potential camera event found:', {
            device: event.deviceName,
            resourceId: parsedType.eventResourceId,
            type: parsedType.type,
            space: event.spaceName
          });
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    
    return null;
  };

  // Get the appropriate icon for an event (either custom or default)
  const getEventIcon = (event: SSEEventDisplay) => {
    const eventType = event.type?.toLowerCase();
    
    // DEBUG: Always log what event types we're seeing
    debugLog(`🎯 Processing Event Icon for: ${event.deviceName}`, {
      originalType: event.type,
      lowercaseType: eventType,
      isIntrusionDetected: eventType === 'intrusion detected',
      typeContainsIntrusion: eventType?.includes('intrusion')
    });
    
    // Check for custom icon from settings
    if (eventFilterSettings?.eventTypeSettings[eventType]) {
      const settings = eventFilterSettings.eventTypeSettings[eventType];
      if (settings.customIcon) {
        debugLog(`🎨 Using custom icon for ${eventType}: ${settings.customIcon}`);
        
        // Check if it's a React Icon (prefixed with 'react-')
        if (settings.customIcon.startsWith('react-')) {
          const iconId = settings.customIcon.replace('react-', '');
          const ReactIcon = getReactIconComponent(iconId);
          if (ReactIcon) {
            return <ReactIcon className="w-6 h-6" />;
          }
        }
        
        // Otherwise treat it as an emoji
        return <span className="text-xl">{settings.customIcon}</span>;
      }
    }

    // Special handling for intrusion detection events
    if (eventType === 'intrusion detected' || eventType?.includes('intrusion')) {
      debugLog(`🎨 Intrusion Detection Icon Logic Triggered for: ${event.deviceName}`, {
        eventType: eventType,
        fullEventType: event.type
      });
      
      // Parse event type to get caption
      let parsedEventType: any = event.type;
      try {
        if (typeof event.type === 'string' && event.type.startsWith('{')) {
          parsedEventType = JSON.parse(event.type);
        }
      } catch (e) {
        // Keep original if parsing fails
      }
      
      // Extract object type from caption - now available directly from database
      const caption = (event as any).caption || 
                    parsedEventType.caption || 
                    parsedEventType.payload?.caption || 
                    (event as any).event_data?.payload?.caption ||
                    (event as any).event_data?.caption ||
                    (event as any).event?.caption ||
                    (event as any).rawEvent?.caption ||
                    '';
      
      debugLog(`🎨 Caption Analysis for Icon Selection:`, {
        device: event.deviceName,
        caption: caption,
        eventCaption: (event as any).caption,
        eventData: (event as any).event_data,
        rawEvent: (event as any).rawEvent
      });
      
      if (caption) {
        if (caption.includes('Vehicle') || caption.includes('vehicle')) {
          debugLog(`🚗 Using Vehicle Icon for: ${event.deviceName}`);
          return eventTypeIcon.vehicle_detected;
        } else if (caption.includes('Person') || caption.includes('person') || caption.includes('Human') || caption.includes('human')) {
          debugLog(`🚶‍♂️ Using Person Icon for: ${event.deviceName}`);
          return eventTypeIcon.person_detected;
        } else if (caption.includes('Animal') || caption.includes('animal') || caption.includes('Pet') || caption.includes('pet')) {
          debugLog(`🐕 Using Animal Icon for: ${event.deviceName}`);
          return eventTypeIcon.animal_detected;
        }
      }
      
      // Fallback to general intrusion icon
      debugLog(`🚨 Using General Intrusion Icon for: ${event.deviceName}`);
      return eventTypeIcon.intrusion_detected;
    }

    // Fallback to default icon mapping
    if (eventType && eventTypeIcon[eventType]) {
      return eventTypeIcon[eventType];
    }

    // Use the default icon
    return eventTypeIcon.default;
  };

  // Enhanced event display with space context
  const getEventDisplayInfo = (event: SSEEventDisplay) => {
    const space = getSpaceForEvent(event);
    const camera = getCameraForEvent(event);
    
    return {
      hasSpaceContext: !!space,
      hasCamera: !!camera,
      spaceInfo: space ? `${space.name}` : event.spaceName || 'Unknown Space',
      cameraInfo: camera ? `📹 ${camera.name}` : null,
      shouldShowImage: !!(getImageData(event) || camera),
      deviceLocation: space ? `${event.deviceName} in ${space.name}` : event.deviceName
    };
  };

  return (
    <>
    <div className="relative w-full pointer-events-none hidden sm:block pb-2 lg:pb-4 xl:pb-6">
      <div className="relative">
        {/* Timeline header with quick settings */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/60 dark:from-[#0f0f0f]/60 to-transparent flex items-center justify-between px-4">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-[#0f0f0f]/80 px-3 py-1 rounded-full">
            Timeline • {filteredEvents.length} events
          </div>
          <div className="pointer-events-auto flex gap-2">
            {/* Alarm Zone Only Toggle */}
            {alarmZones.length > 0 && (
              <button
                className={`text-xs px-2 py-1 rounded-full transition-colors ${
                  eventFilterSettings?.showOnlyAlarmZoneEvents
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
                onClick={() => {
                  if (eventFilterSettings) {
                    // Create updated settings - toggle alarm zone only mode
                    const newSettings = {
                      ...eventFilterSettings,
                      showOnlyAlarmZoneEvents: !eventFilterSettings.showOnlyAlarmZoneEvents
                    };
                    // Note: In a real app, you'd want to call a setter function passed as prop
                    setSettingsVersion(prev => prev + 1);
                  }
                }}
                title={eventFilterSettings?.showOnlyAlarmZoneEvents ? "Showing only alarm zone events" : "Show all events"}
              >
                🔒 {eventFilterSettings?.showOnlyAlarmZoneEvents ? 'Zones Only' : 'All Events'}
              </button>
            )}
            
            {/* Settings Button */}
            <button
              className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-full transition-colors"
              onClick={() => setShowSettings(!showSettings)}
              title="Timeline filter settings"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="pointer-events-auto absolute top-10 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-[300px] z-30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Timeline Filters</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            {/* Alarm Zone Filters */}
            {alarmZones.length > 0 && (
              <div className="space-y-3">
                <div className="border-b border-gray-200 dark:border-gray-600 pb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🔒 Alarm Zones</h4>
                  
                  {/* Show Only Alarm Zone Events Toggle */}
                  <label className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={eventFilterSettings?.showOnlyAlarmZoneEvents || false}
                      onChange={(e) => {
                        if (eventFilterSettings) {
                          // Note: In real app, use proper setter
                          console.log('Toggle alarm zone only:', e.target.checked);
                          setSettingsVersion(prev => prev + 1);
                        }
                      }}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Show only alarm zone events</span>
                  </label>
                  
                  {/* Specific Zone Selection */}
                  {eventFilterSettings?.showOnlyAlarmZoneEvents && (
                    <div className="ml-6 space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Select specific zones (empty = all zones):</p>
                      {alarmZones.map(zone => (
                        <label key={zone.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={eventFilterSettings?.selectedAlarmZones?.includes(zone.id) || false}
                            onChange={(e) => {
                              if (eventFilterSettings) {
                                const currentSelected = eventFilterSettings.selectedAlarmZones || [];
                                const newSelected = e.target.checked
                                  ? [...currentSelected, zone.id]
                                  : currentSelected.filter(id => id !== zone.id);
                                // Note: In real app, use proper setter
                                console.log('Toggle zone:', zone.name, e.target.checked);
                                setSettingsVersion(prev => prev + 1);
                              }
                            }}
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: zone.color }}></span>
                            {zone.name} ({zone.devices?.length || 0} devices)
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  💡 Alarm zone filtering helps focus on security-related events from your configured zones.
                </div>
              </div>
            )}
            
            {alarmZones.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <div className="text-2xl mb-2">🔒</div>
                <p className="text-sm">No alarm zones configured</p>
                <p className="text-xs">Set up alarm zones to enable zone-based filtering</p>
              </div>
            )}
            
            {/* Debug Mode Timeline Adjustment */}
            {debugMode && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🔧 Timeline Debug</h4>
                
                <div className="space-y-3">
                  {/* Gap Size Adjustment */}
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Thumbnail Gap: {debugGapSize}rem ({debugGapSize * 16}px)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={debugGapSize}
                      onChange={(e) => setDebugGapSize(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
                      <span>0rem (touching)</span>
                      <span>1rem (normal)</span>
                      <span>2rem (wide)</span>
                    </div>
                  </div>
                  
                  {/* Quick presets */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDebugGapSize(0)}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      Touching
                    </button>
                    <button
                      onClick={() => setDebugGapSize(0.25)}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => setDebugGapSize(0.5)}
                      className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      Default
                    </button>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Adjust the gap between timeline thumbnails to find the perfect spacing.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right fade only - Shows newest events clearly and fades toward older events */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[40rem] bg-gradient-to-l from-white via-white/60 via-white/45 via-white/30 via-white/20 via-white/15 via-white/10 dark:from-[#0f0f0f] dark:via-[#0f0f0f]/60 dark:via-[#0f0f0f]/45 dark:via-[#0f0f0f]/30 dark:via-[#0f0f0f]/20 dark:via-[#0f0f0f]/15 dark:via-[#0f0f0f]/10 to-transparent z-20" />

        {/* Scroll button - Only right arrow to view older events */}
        {filteredEvents.length > 3 && (
          <button
            onClick={() => {
              if (rowRef.current) {
                rowRef.current.scrollBy({ left: 200, behavior: 'smooth' });
              }
            }}
            className="pointer-events-auto absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200 hover:scale-105"
            title="View older events"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Scrollable timeline with fluid responsive behavior */}
        <div
          ref={rowRef}
          className="relative flex py-3 sm:py-4 lg:py-5 xl:py-6 bg-white dark:bg-[#0f0f0f] overflow-x-auto scrollbar-hide scroll-snap-x mandatory pointer-events-auto min-w-0"
          style={{
            gap: debugMode ? `${debugGapSize}rem` : '0rem', // Zero gap - use negative margins for overlapping
            paddingLeft: 'clamp(0.5rem, 2vw, 3rem)',
            paddingRight: 'clamp(0.5rem, 2vw, 3rem)'
          }}
        >
          {/* Timeline connector line - properly centered with image containers, adaptive opacity */}
          <div className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent pointer-events-none" 
            style={{
              top: 'calc(50% - 1.25rem)', // Center with image container middle, accounting for text below
              transform: 'translateY(-50%)',
              opacity: debugMode && debugGapSize < 0.3 ? 0.3 : 0.5 // More subtle when thumbnails are close
            }} 
          />
          {filteredEvents.map((event, idx) => {
            let type = (event.type || '').toLowerCase();
            const baseName = event.deviceName || 'Unknown Device';

            // Parse event type if it's JSON
            let parsedEventType: any = event.type;
            try {
              if (typeof event.type === 'string' && event.type.startsWith('{')) {
                parsedEventType = JSON.parse(event.type);
              }
            } catch (e) {
              // Keep original if parsing fails
            }

            // Enhanced device name with type indication
            const getEnhancedDeviceName = () => {
              // For intrusion/camera events, show camera type
              if (typeof parsedEventType === 'object' && parsedEventType?.type === 'Intrusion Detected') {
                return `${baseName} Camera`;
              }
              
              // For devices with "camera" in the name, ensure it shows
              if (/camera/i.test(baseName) && !/ camera$/i.test(baseName)) {
                return `${baseName} Camera`;
              }
              
              return baseName;
            };
            
            const deviceName = getEnhancedDeviceName();

            // Enhanced function to get meaningful event descriptions
            const getEnhancedEventInfo = () => {
              let primaryLabel = 'Event';
              let secondaryLabel = '';
              
              // DEBUG: Log the complete event structure to see what we're working with
              debugLog(`🔍 Complete Event Structure for Device: ${event.deviceName}`, {
                eventType: event.type,
                parsedEventType: parsedEventType,
                eventData: (event as any).event_data,
                rawEvent: (event as any).rawEvent,
                payload: (event as any).payload,
                fullEvent: event
              });

              // 🔥 NEW: Check for pre-formatted descriptions from database trigger first
              const eventData = (event as any).event_data || (event as any).eventData;
              if (eventData && eventData.formatted_title && eventData.formatted_description) {
                debugLog(`🎯 Using database-formatted description for: ${event.deviceName}`, {
                  title: eventData.formatted_title,
                  description: eventData.formatted_description,
                  deviceType: eventData.device_type
                });
                
                // For database-formatted events, extract the action from the title
                const formattedTitle = eventData.formatted_title;
                const deviceName = event.deviceName || 'Unknown Device';
                
                // Extract the action part (e.g., "turned On", "Opened", etc.)
                if (formattedTitle.includes(' turned ')) {
                  const actionPart = formattedTitle.split(' turned ')[1];
                  primaryLabel = deviceName;
                  secondaryLabel = `turned ${actionPart}`;
                } else if (formattedTitle.includes(' Opened')) {
                  primaryLabel = deviceName;
                  secondaryLabel = 'opened';
                } else if (formattedTitle.includes(' Closed')) {
                  primaryLabel = deviceName;
                  secondaryLabel = 'closed';
                } else if (formattedTitle.includes(' Locked')) {
                  primaryLabel = deviceName;
                  secondaryLabel = 'locked';
                } else if (formattedTitle.includes(' Unlocked')) {
                  primaryLabel = deviceName;
                  secondaryLabel = 'unlocked';
                } else if (formattedTitle.includes(' Adjusted')) {
                  primaryLabel = deviceName;
                  secondaryLabel = 'adjusted';
                } else if (formattedTitle.includes(' Updated')) {
                  primaryLabel = deviceName;
                  secondaryLabel = 'updated';
                } else {
                  // Fallback - use device name as primary and description as secondary
                  primaryLabel = deviceName;
                  secondaryLabel = eventData.formatted_description;
                }
                
                // Update the type for proper icon selection
                if (eventData.device_type === 'light' || eventData.device_type === 'switch') {
                  if (eventData.normalized_state === 'on') {
                    type = 'light_on';
                  } else if (eventData.normalized_state === 'off') {
                    type = 'light_off';
                  }
                } else if (eventData.device_type === 'door') {
                  if (eventData.normalized_state === 'on') {
                    type = 'door_opened';
                  } else if (eventData.normalized_state === 'off') {
                    type = 'door_closed';
                  }
                } else if (eventData.device_type === 'lock') {
                  if (eventData.formatted_description.includes('unlocked')) {
                    type = 'lock_unlocked';
                  } else if (eventData.formatted_description.includes('locked')) {
                    type = 'lock_locked';
                  }
                }
                
                return { primaryLabel, secondaryLabel };
              }

              // Enhanced device type detection
              const detectDeviceType = (deviceName: string): string => {
                const lowerName = deviceName.toLowerCase();
                
                // Light devices (most specific first)
                if (lowerName.includes('light') || lowerName.includes('bulb') || lowerName.includes('lamp')) {
                  return 'light';
                }
                
                // Switch devices
                if (lowerName.includes('switch')) {
                  return 'switch';
                }
                
                // Outlet/plug devices
                if (lowerName.includes('outlet') || lowerName.includes('plug') || lowerName.includes('socket')) {
                  return 'outlet';
                }
                
                // Fan devices
                if (lowerName.includes('fan')) {
                  return 'fan';
                }
                
                // Dimmer devices
                if (lowerName.includes('dimmer')) {
                  return 'dimmer';
                }
                
                // Door devices
                if (lowerName.includes('door') || lowerName.includes('garage')) {
                  return 'door';
                }
                
                // Lock devices
                if (lowerName.includes('lock')) {
                  return 'lock';
                }
                
                // Camera devices
                if (lowerName.includes('camera') || lowerName.includes('cam')) {
                  return 'camera';
                }
                
                // Motion sensors
                if (lowerName.includes('motion') || lowerName.includes('sensor')) {
                  return 'sensor';
                }
                
                return 'unknown';
              };

              // Enhanced state detection
              const normalizeState = (state: string): string => {
                if (!state) return '';
                const lowerState = state.toLowerCase();
                
                // On states
                if (/^(on|open|opened|active|enabled|armed|true|1|yes|up|high)$/i.test(lowerState)) {
                  return 'on';
                }
                
                // Off states  
                if (/^(off|closed|inactive|disabled|disarmed|false|0|no|down|low)$/i.test(lowerState)) {
                  return 'off';
                }
                
                return lowerState;
              };
              
              // If we have a parsed JSON event type
              if (typeof parsedEventType === 'object' && parsedEventType) {
                
                // For intrusion/analytics events - show specific detection type
                if (parsedEventType.type === 'Intrusion Detected' || parsedEventType.type === 'intrusion detected') {
                  primaryLabel = 'Intrusion Detected';
                  
                  // Extract object type from caption - now available directly from database
                  const caption = (event as any).caption || 
                                parsedEventType.caption || 
                                parsedEventType.payload?.caption || 
                                (event as any).event_data?.payload?.caption ||
                                (event as any).event_data?.caption ||
                                (event as any).event?.caption ||
                                (event as any).rawEvent?.caption ||
                                '';
                  
                  debugLog('🔍 Intrusion Event Caption Analysis:', {
                    device: event.deviceName,
                    caption: caption,
                    eventCaption: (event as any).caption,
                    parsedEventType: parsedEventType,
                    eventData: (event as any).event_data,
                    rawEvent: (event as any).rawEvent
                  });
                  
                  if (caption) {
                    if (caption.includes('Vehicle') || caption.includes('vehicle')) {
                      secondaryLabel = 'Vehicle Detected';
                    } else if (caption.includes('Person') || caption.includes('person') || caption.includes('Human') || caption.includes('human')) {
                      secondaryLabel = 'Person Detected';  
                    } else if (caption.includes('Animal') || caption.includes('animal') || caption.includes('Pet') || caption.includes('pet')) {
                      secondaryLabel = 'Animal Detected';
                    } else {
                      secondaryLabel = 'Object Detected';
                      debugLog('🔍 Unknown object type in caption:', caption);
                    }
                  } else {
                    secondaryLabel = 'Motion Detected';
                    debugLog('🔍 No caption found for intrusion event');
                  }
                  
                  return { primaryLabel, secondaryLabel };
                }
                
                // For state changes - show the actual state change with device-specific handling
                if (parsedEventType.type === 'State Changed') {
                  const state = parsedEventType.displayState || parsedEventType.intermediateState;
                  const deviceType = detectDeviceType(deviceName);
                  const normalizedState = normalizeState(state || '');
                  
                  // For controllable devices, use "Device Name turned On/Off" format
                  if (['light', 'switch', 'outlet', 'fan'].includes(deviceType)) {
                    primaryLabel = deviceName;
                    
                    if (normalizedState === 'on') {
                      secondaryLabel = 'turned On';
                      type = 'light_on';
                    } else if (normalizedState === 'off') {
                      secondaryLabel = 'turned Off';
                      type = 'light_off';
                    } else if (state) {
                      secondaryLabel = `changed to ${state.charAt(0).toUpperCase() + state.slice(1)}`;
                    } else {
                      secondaryLabel = 'state changed';
                    }
                  } 
                  // For doors and locks, use action-based descriptions
                  else if (deviceType === 'door') {
                    primaryLabel = deviceName;
                    
                    if (normalizedState === 'on') {
                      secondaryLabel = 'opened';
                      type = 'door_opened';
                    } else if (normalizedState === 'off') {
                      secondaryLabel = 'closed';
                      type = 'door_closed';
                    } else {
                      secondaryLabel = 'state changed';
                    }
                  }
                  else if (deviceType === 'lock') {
                    primaryLabel = deviceName;
                    
                    if (state && /unlock/i.test(state)) {
                      secondaryLabel = 'unlocked';
                      type = 'lock_unlocked';
                    } else if (state && /lock/i.test(state)) {
                      secondaryLabel = 'locked';
                      type = 'lock_locked';
                    } else {
                      secondaryLabel = 'state changed';
                    }
                  }
                  // For other devices, keep generic format
                  else {
                    primaryLabel = 'State Changed';
                    if (state) {
                      secondaryLabel = `${deviceName} changed to ${state.charAt(0).toUpperCase() + state.slice(1)}`;
                    } else {
                      secondaryLabel = `${deviceName} updated`;
                    }
                  }
                  
                  return { primaryLabel, secondaryLabel };
                }
                
                // For device check-ins - show heartbeat/diagnostic info
                if (parsedEventType.type === 'Device Check-in') {
                  primaryLabel = 'Device Check-in';
                  secondaryLabel = 'Status Report';
                  
                  // Add battery info if available
                  if (parsedEventType.batteryPercentage !== undefined) {
                    secondaryLabel = `${parsedEventType.batteryPercentage}% Battery`;
                  }
                  
                  return { primaryLabel, secondaryLabel };
                }
                
                // Use the clean type field as primary
                if (parsedEventType.type && typeof parsedEventType.type === 'string') {
                  primaryLabel = parsedEventType.type;
                  secondaryLabel = 'Event Update';
                  return { primaryLabel, secondaryLabel };
                }
              }

              // Extract state from various possible locations for non-JSON events
              const rawState: string = (event.displayState || event.payload?.displayState || event.payload?.state || '').toString();
              
              // Handle direct event types for common device actions
              if (typeof event.type === 'string') {
                const eventType = event.type.toLowerCase();
                
                // Motion and intrusion detection
                if (eventType.includes('intrusion')) {
                  primaryLabel = 'Intrusion Detected';
                  
                  // Parse event data to get specific detection type
                  let parsedEventType: any = event.type;
                  try {
                    if (typeof event.type === 'string' && event.type.startsWith('{')) {
                      parsedEventType = JSON.parse(event.type);
                    }
                  } catch (e) {
                    // Keep original if parsing fails
                  }
                  
                  // Extract object type from caption - now available directly from database
                  const caption = (event as any).caption || 
                                parsedEventType.caption || 
                                parsedEventType.payload?.caption || 
                                (event as any).event_data?.payload?.caption ||
                                (event as any).event_data?.caption ||
                                (event as any).event?.caption ||
                                (event as any).rawEvent?.caption ||
                                '';
                  
                  debugLog('🔍 String Intrusion Event Caption Analysis:', {
                    device: event.deviceName,
                    caption: caption,
                    eventCaption: (event as any).caption,
                    eventType: eventType,
                    parsedEventType: parsedEventType,
                    eventData: (event as any).event_data,
                    rawEvent: (event as any).rawEvent
                  });
                  
                  if (caption) {
                    if (caption.includes('Vehicle') || caption.includes('vehicle')) {
                      secondaryLabel = 'Vehicle Detected';
                    } else if (caption.includes('Person') || caption.includes('person') || caption.includes('Human') || caption.includes('human')) {
                      secondaryLabel = 'Person Detected';
                    } else if (caption.includes('Animal') || caption.includes('animal') || caption.includes('Pet') || caption.includes('pet')) {
                      secondaryLabel = 'Animal Detected';
                    } else {
                      secondaryLabel = 'Object Detected';
                    }
                  } else {
                    secondaryLabel = 'Security Alert';
                  }
                  
                  return { primaryLabel, secondaryLabel };
                }
                
                if (eventType.includes('motion')) {
                  primaryLabel = 'Motion Detected';
                  secondaryLabel = 'Activity Alert';
                  return { primaryLabel, secondaryLabel };
                }
                
                // Security events
                if (eventType.includes('security')) {
                  primaryLabel = 'Security Event';
                  secondaryLabel = 'Alert Triggered';
                  return { primaryLabel, secondaryLabel };
                }
                
                // Device state changes
                if (eventType.includes('state') || eventType.includes('device_state')) {
                  const deviceType = detectDeviceType(deviceName);
                  const normalizedState = normalizeState(rawState);
                  
                  // For controllable devices, use "Device Name turned On/Off" format
                  if (['light', 'switch', 'outlet', 'fan'].includes(deviceType)) {
                    primaryLabel = deviceName;
                    
                    if (normalizedState === 'on') {
                      secondaryLabel = 'turned On';
                      type = 'light_on';
                    } else if (normalizedState === 'off') {
                      secondaryLabel = 'turned Off';
                      type = 'light_off';
                    } else {
                      secondaryLabel = 'state changed';
                    }
                  } else {
                    primaryLabel = 'Device State';
                    secondaryLabel = `${deviceName} updated`;
                  }
                  
                  return { primaryLabel, secondaryLabel };
                }
                
                // System events
                if (eventType.includes('heartbeat')) {
                  primaryLabel = 'System Status';
                  secondaryLabel = 'Online';
                  return { primaryLabel, secondaryLabel };
                }
                
                if (eventType.includes('connection')) {
                  primaryLabel = 'Connection';
                  secondaryLabel = 'Connected';
                  return { primaryLabel, secondaryLabel };
                }
                
                if (eventType.includes('polling')) {
                  primaryLabel = 'System Check';
                  secondaryLabel = 'Status Check';
                  return { primaryLabel, secondaryLabel };
                }
              }
              
              // Enhanced device-specific logic for fallback cases
              const deviceType = detectDeviceType(deviceName);
              const normalizedState = normalizeState(rawState);

              // Handle controllable devices with improved formatting
              if (['light', 'switch', 'outlet', 'fan'].includes(deviceType)) {
                primaryLabel = deviceName;
                
                if (normalizedState === 'on') {
                  secondaryLabel = 'turned On';
                  type = 'light_on';
                } else if (normalizedState === 'off') {
                  secondaryLabel = 'turned Off';
                  type = 'light_off';
                } else if (rawState) {
                  secondaryLabel = `changed to ${rawState.charAt(0).toUpperCase() + rawState.slice(1)}`;
                } else {
                  secondaryLabel = 'status update';
                }
                
                return { primaryLabel, secondaryLabel };
              }

              // Handle door devices
              if (deviceType === 'door') {
                primaryLabel = deviceName;
                
                if (normalizedState === 'on') {
                  secondaryLabel = 'opened';
                  type = 'door_opened';
                } else if (normalizedState === 'off') {
                  secondaryLabel = 'closed';
                  type = 'door_closed';
                } else {
                  secondaryLabel = 'status update';
                }
                
                return { primaryLabel, secondaryLabel };
              }

              // Handle lock devices
              if (deviceType === 'lock') {
                primaryLabel = deviceName;
                
                if (rawState && /unlock/i.test(rawState)) {
                  secondaryLabel = 'unlocked';
                  type = 'lock_unlocked';
                } else if (rawState && /lock/i.test(rawState)) {
                  secondaryLabel = 'locked';
                  type = 'lock_locked';
                } else {
                  secondaryLabel = 'status update';
                }
                
                return { primaryLabel, secondaryLabel };
              }

              // Handle camera devices
              if (deviceType === 'camera') {
                primaryLabel = deviceName;
                secondaryLabel = 'activity detected';
                return { primaryLabel, secondaryLabel };
              }

              // Fallback - clean generic format
              if (rawState) {
                primaryLabel = deviceName;
                secondaryLabel = `changed to ${rawState.charAt(0).toUpperCase() + rawState.slice(1)}`;
              } else {
                primaryLabel = deviceName;
                secondaryLabel = 'status update';
              }
              
              return { primaryLabel, secondaryLabel };
            };

                         const { primaryLabel, secondaryLabel } = getEnhancedEventInfo();

            return (
              <button
                key={event.id || idx}
                onClick={() => setSelected(event)}
                className="group flex flex-col items-center scroll-snap-start focus:outline-none transition-all duration-200 hover:scale-105 flex-shrink-0 m-0 p-0"
                style={{ 
                  width: 'clamp(100px, 15vw, 240px)',
                  minWidth: 'clamp(100px, 15vw, 240px)',
                  // Responsive negative margins: small screens (no overlap) → medium (iPad Pro perfect) → large (more aggressive)
                  marginLeft: debugMode && debugGapSize === 0 ? 'clamp(-2px, -0.5vw, -4px)' : (debugMode ? '0' : 'clamp(-2px, -1vw, -16px)'),
                  marginRight: debugMode && debugGapSize === 0 ? 'clamp(-2px, -0.5vw, -4px)' : (debugMode ? '0' : 'clamp(-2px, -1vw, -16px)'),
                  // Responsive transforms: gentle on small → perfect on medium → aggressive on large
                  transform: debugMode ? 'none' : (idx > 0 ? `translateX(clamp(-2px, -0.8vw, -12px))` : 'translateX(0)')
                }}
                title={`${deviceName} – ${primaryLabel}: ${secondaryLabel} at ${formatRelativeTime(event.timestamp ? new Date(event.timestamp).getTime() : Date.now())}`}
              >
                {/* Timeline dot indicator */}
                <div className="relative">
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900" />
                  )}
                  
                  {/* Image or Icon Container - Close timeline with rounded corners */}
                  <div className="overflow-hidden border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors duration-200 bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 rounded-lg"
                    style={{
                      width: 'clamp(70px, 12vw, 180px)',
                      height: 'clamp(44px, 8vw, 112px)'
                    }}>
                    {(() => {
                      const { shouldShowImage, hasSpaceContext, hasCamera } = getEventDisplayInfo(event);
                      
                      if (shouldShowImage) {
                        const imageSrc = getImageData(event);
                        if (imageSrc) {
                          debugLog('📸 Timeline: Rendering image for device:', {
                            deviceName: event.deviceName,
                            hasImageUrl: !!event.imageUrl,
                            hasThumbnail: !!(event as any).thumbnail,
                            hasThumbnailData: !!(event as any).thumbnailData?.data,
                            hasEventDataImage: !!(event as any).event_data?.imageUrl,
                            isBase64: imageSrc.includes('base64') || imageSrc.startsWith('data:'),
                            dataLength: imageSrc.length,
                            imagePreview: imageSrc.substring(0, 50) + '...'
                          });
                          
                          // Handle different image formats
                          let src = imageSrc;
                          if (!imageSrc.startsWith('data:') && !imageSrc.startsWith('http')) {
                            // Assume it's base64 data without the data URL prefix
                            src = `data:image/jpeg;base64,${imageSrc}`;
                          }
                          
                          return (
                            <div className="relative w-full h-full">
                              <img 
                                src={src} 
                                alt={`${event.deviceName} - ${primaryLabel}: ${secondaryLabel}`} 
                                className="object-cover w-full h-full rounded-xl transition-transform duration-200 group-hover:scale-105"
                                onError={(e) => {
                                  debugLog('📸 Timeline: Image load error for:', {
                                    device: event.deviceName,
                                    src: src.substring(0, 100) + '...',
                                    error: e
                                  });
                                  // Hide the image and show icon fallback
                                  e.currentTarget.style.display = 'none';
                                  const iconContainer = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (iconContainer) iconContainer.style.display = 'flex';
                                }}
                              />
                              {/* Icon fallback (hidden by default) */}
                              <div 
                                className="absolute inset-0 items-center justify-center w-full h-full text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl"
                                style={{ 
                                  display: 'none',
                                  fontSize: 'clamp(1.5rem, 3vw, 3.5rem)'
                                }}
                              >
                                {getEventIcon(event)}
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      return (
                        <div className="flex items-center justify-center w-full h-full text-gray-600 dark:text-gray-400"
                          style={{ fontSize: 'clamp(1.5rem, 3vw, 3.5rem)' }}>
                          {getEventIcon(event)}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Event details - Ultra compact */}
                <div className="mt-0.5 text-center space-y-0 px-1">
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100 line-clamp-1 leading-tight">
                    {deviceName}
                  </div>
                  {secondaryLabel && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium line-clamp-1">
                      {secondaryLabel}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                    {formatRelativeTime(event.timestamp ? new Date(event.timestamp).getTime() : Date.now())}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    {selected && <EventDetailsModal event={selected} onClose={handleClose} debugMode={debugMode} />}
    </>
  );
} 