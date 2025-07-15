'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SSEEventDisplay } from '@/hooks/useSSE';
import { EventDetailsModal } from './EventDetailsModal';
import { formatRelativeTime } from '@/lib/alarmKeypadUtils';

// Import necessary types
import { Camera, Space, EventFilterSettings } from '@/lib/api';

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
  eventFilterSettings
}: LiveEventsTickerProps) {
  const [selected, setSelected] = useState<SSEEventDisplay | null>(null);
  const [settingsVersion, setSettingsVersion] = useState(0);

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

  // Filter events based on settings
  const filteredEvents = useMemo(() => {
    if (!eventFilterSettings) return recentEvents;
    
    return recentEvents.filter(event => {
      // If showing all events, don't filter
      if (eventFilterSettings.showAllEvents) return true;
      
      // Check individual event type settings first (most specific)
      const eventType = event.type?.toLowerCase();
      if (eventType && eventFilterSettings.eventTypeSettings[eventType]) {
        return eventFilterSettings.eventTypeSettings[eventType].showInTimeline;
      }
      
      // Fallback to legacy event type filtering
      if (eventType && eventFilterSettings.eventTypes.hasOwnProperty(eventType)) {
        return eventFilterSettings.eventTypes[eventType] !== false;
      }
      
      // Fallback to legacy category-based filtering
      
      // Check if event is space-related
      const isSpaceEvent = event.spaceId && event.spaceName;
      if (eventFilterSettings.showSpaceEvents && isSpaceEvent) return true;
      
      // Check if event is alarm zone related (device in an alarm zone)
      const isAlarmZoneEvent = event.category?.includes('alarm') || 
                               event.type?.includes('alarm') ||
                               event.displayState?.includes('armed');
      if (eventFilterSettings.showAlarmZoneEvents && isAlarmZoneEvent) return true;
      
      // If no specific filtering rules match, default to showing the event
      // This ensures backward compatibility and shows events by default
      return true;
    });
  }, [recentEvents, eventFilterSettings]);

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
      <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none">
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
    <div className="fixed bottom-0 left-0 w-full z-40 pointer-events-none">
      <div className="relative">
        {/* Timeline header with quick settings */}
        <div className="pointer-events-none absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/60 dark:from-[#0f0f0f]/60 to-transparent flex items-center justify-between px-4">
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-[#0f0f0f]/80 px-3 py-1 rounded-full">
            Timeline • {filteredEvents.length} events
          </div>
          <button
            className="pointer-events-auto text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-full transition-colors"
            onClick={() => {
              const currentSettings = eventFilterSettings;
              const allHidden = !currentSettings?.showAllEvents && !currentSettings?.showSpaceEvents && !currentSettings?.showAlarmZoneEvents;
              
              // Smart toggle: if most things are hidden, show important events. If most are shown, hide system noise.
              const newSettings = allHidden ? {
                // Show important events
                showAllEvents: true,
                showSpaceEvents: true,
                showAlarmZoneEvents: true
              } : {
                // Hide system noise, keep important events
                showAllEvents: currentSettings?.showAllEvents,
                showSpaceEvents: currentSettings?.showSpaceEvents,
                showAlarmZoneEvents: currentSettings?.showAlarmZoneEvents
              };
              
              // localStorage.setItem('timeline_events', JSON.stringify(newSettings)); // This line is removed as per new_code
              setSettingsVersion(prev => prev + 1); // Force re-render
            }}
          >
            ⚙️
          </button>
        </div>

        {/* Edge fades */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white/90 dark:from-[#0f0f0f]/90 to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/90 dark:from-[#0f0f0f]/90 to-transparent z-10" />

        {/* Scroll buttons */}
        {filteredEvents.length > 3 && (
          <>
            <button
              onClick={() => {
                if (rowRef.current) {
                  rowRef.current.scrollBy({ left: -200, behavior: 'smooth' });
                }
              }}
              className="pointer-events-auto absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200 hover:scale-105"
              title="Scroll left"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (rowRef.current) {
                  rowRef.current.scrollBy({ left: 200, behavior: 'smooth' });
                }
              }}
              className="pointer-events-auto absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 p-2 rounded-full shadow-lg backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-200 hover:scale-105"
              title="Scroll right"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Scrollable timeline */}
        <div
          ref={rowRef}
          className="relative flex gap-4 py-4 px-8 bg-white dark:bg-[#0f0f0f] shadow-2xl rounded-t-3xl overflow-x-auto scrollbar-hide scroll-snap-x mandatory pointer-events-auto border-t border-gray-200/50 dark:border-gray-800/50"
        >
          {/* Timeline connector line - centered */}
          <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent pointer-events-none transform -translate-y-1/2" />
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
                
                // For state changes - show the actual state change
                if (parsedEventType.type === 'State Changed') {
                  const state = parsedEventType.displayState || parsedEventType.intermediateState;
                  if (state) {
                    if (/on|open/i.test(state)) {
                      primaryLabel = 'State Changed';
                      secondaryLabel = 'Turned On';
                      type = 'light_on';
                    } else if (/off|closed/i.test(state)) {
                      primaryLabel = 'State Changed';
                      secondaryLabel = 'Turned Off';
                      type = 'light_off';
                    } else if (/error/i.test(state)) {
                      primaryLabel = 'State Changed';
                      secondaryLabel = 'Error State';
                    } else {
                      primaryLabel = 'State Changed';
                      secondaryLabel = state.charAt(0).toUpperCase() + state.slice(1);
                    }
                  } else {
                    primaryLabel = 'State Changed';
                    secondaryLabel = 'Status Update';
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
                  primaryLabel = 'Device State';
                  if (/on|open/i.test(rawState)) {
                    secondaryLabel = 'Turned On';
                    type = 'light_on';
                  } else if (/off|closed/i.test(rawState)) {
                    secondaryLabel = 'Turned Off';
                    type = 'light_off';
                  } else {
                    secondaryLabel = 'State Changed';
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
              
              // Special-case device-specific logic based on device name patterns
              if (/light|switch/i.test(deviceName)) {
                if (/on/i.test(rawState)) {
                  primaryLabel = 'Light Control';
                  secondaryLabel = 'Turned On';
                  type = 'light_on';
                } else if (/off/i.test(rawState)) {
                  primaryLabel = 'Light Control';
                  secondaryLabel = 'Turned Off';
                  type = 'light_off';
                } else {
                  primaryLabel = 'Light Control';
                  secondaryLabel = 'State Changed';
                }
                return { primaryLabel, secondaryLabel };
              }

              if (/door|garage/i.test(deviceName)) {
                if (/open/i.test(rawState)) {
                  primaryLabel = 'Door Control';
                  secondaryLabel = 'Opened';
                  type = 'door_opened';
                } else if (/close|closed/i.test(rawState)) {
                  primaryLabel = 'Door Control';
                  secondaryLabel = 'Closed';
                  type = 'door_closed';
                } else {
                  primaryLabel = 'Door Control';
                  secondaryLabel = 'State Changed';
                }
                return { primaryLabel, secondaryLabel };
              }
              
              if (/lock/i.test(deviceName)) {
                if (/unlock/i.test(rawState)) {
                  primaryLabel = 'Access Control';
                  secondaryLabel = 'Unlocked';
                  type = 'lock_unlocked';
                } else if (/lock/i.test(rawState)) {
                  primaryLabel = 'Access Control';
                  secondaryLabel = 'Locked';
                  type = 'lock_locked';
                } else {
                  primaryLabel = 'Access Control';
                  secondaryLabel = 'State Changed';
                }
                return { primaryLabel, secondaryLabel };
              }

              if (/camera/i.test(deviceName)) {
                primaryLabel = 'Camera Event';
                secondaryLabel = 'Activity Detected';
                return { primaryLabel, secondaryLabel };
              }

              // Fallback - use formatted event type or state
              if (rawState) {
                primaryLabel = 'Device Update';
                secondaryLabel = rawState.charAt(0).toUpperCase() + rawState.slice(1);
              } else {
                primaryLabel = 'System Event';
                secondaryLabel = 'Status Update';
              }
              
              return { primaryLabel, secondaryLabel };
            };

                         const { primaryLabel, secondaryLabel } = getEnhancedEventInfo();

            return (
              <button
                key={event.id || idx}
                onClick={() => setSelected(event)}
                className="group flex flex-col items-center min-w-[140px] max-w-[140px] sm:min-w-[180px] sm:max-w-[180px] scroll-snap-start focus:outline-none transition-all duration-200 hover:scale-105"
                title={`${deviceName} – ${primaryLabel}: ${secondaryLabel}`}
              >
                {/* Timeline dot indicator */}
                <div className="relative">
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900" />
                  )}
                  
                  {/* Image or Icon Container - Enhanced for 16:9 images */}
                  <div className="w-32 h-20 sm:w-40 sm:h-24 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-600 transition-colors duration-200 bg-gray-50 dark:bg-gray-800">
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
                                className="absolute inset-0 items-center justify-center w-full h-full text-4xl sm:text-5xl text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl"
                                style={{ display: 'none' }}
                              >
                                {getEventIcon(event)}
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      return (
                        <div className="flex items-center justify-center w-full h-full text-4xl sm:text-5xl text-gray-600 dark:text-gray-400">
                          {getEventIcon(event)}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Event details */}
                <div className="mt-2 text-center space-y-1">
                  <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                    {deviceName}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {primaryLabel}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {secondaryLabel}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
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