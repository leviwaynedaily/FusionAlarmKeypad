import React, { useState } from 'react';
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
  Shield, Lock, Unlock, Eye, EyeOff, Bell, AlertTriangle, Home, Key, Camera, Video, Mic, Thermometer, 
  Zap, Battery, Wifi, Car, Bike, Truck, Plane, Building, Lightbulb, Smartphone, Monitor,
  User, Users, Activity, TrendingUp, CheckCircle, XCircle, AlertCircle, Info, Settings, Power, Play, Pause
} from 'lucide-react';

interface IconPickerProps {
  selectedIcon: string;
  onIconSelect: (icon: string) => void;
  category?: string;
}

interface IconDefinition {
  id: string;
  component?: React.ComponentType<any>;
  emoji?: string;
  name: string;
  keywords: string[];
}

// Professional React Icons organized by category
const PROFESSIONAL_ICONS: Record<string, IconDefinition[]> = {
  security: [
    { id: 'shield', component: Shield, name: 'Shield', keywords: ['security', 'protect', 'safe', 'guard'] },
    { id: 'md-security', component: MdSecurity, name: 'Security', keywords: ['security', 'protect', 'safe', 'guard'] },
    { id: 'hi-shield', component: HiShieldCheck, name: 'Shield Check', keywords: ['security', 'protect', 'safe', 'guard'] },
    { id: 'lock', component: Lock, name: 'Lock', keywords: ['lock', 'secure', 'closed', 'private'] },
    { id: 'md-lock', component: MdLock, name: 'Lock', keywords: ['lock', 'secure', 'closed', 'private'] },
    { id: 'hi-lock', component: HiLockClosed, name: 'Lock Closed', keywords: ['lock', 'secure', 'closed', 'private'] },
    { id: 'unlock', component: Unlock, name: 'Unlock', keywords: ['unlock', 'open', 'accessible'] },
    { id: 'md-unlock', component: MdLockOpen, name: 'Lock Open', keywords: ['unlock', 'open', 'accessible'] },
    { id: 'hi-unlock', component: HiLockOpen, name: 'Lock Open', keywords: ['unlock', 'open', 'accessible'] },
    { id: 'eye', component: Eye, name: 'Eye', keywords: ['watch', 'monitor', 'surveillance', 'observe'] },
    { id: 'md-eye', component: MdVisibility, name: 'Visibility', keywords: ['watch', 'monitor', 'surveillance', 'observe'] },
    { id: 'hi-eye', component: HiEye, name: 'Eye', keywords: ['watch', 'monitor', 'surveillance', 'observe'] },
    { id: 'eye-off', component: EyeOff, name: 'Eye Off', keywords: ['hidden', 'blind', 'disabled'] },
    { id: 'md-eye-off', component: MdVisibilityOff, name: 'Visibility Off', keywords: ['hidden', 'blind', 'disabled'] },
    { id: 'hi-eye-off', component: HiEyeSlash, name: 'Eye Slash', keywords: ['hidden', 'blind', 'disabled'] },
    { id: 'bell', component: Bell, name: 'Bell', keywords: ['alarm', 'notification', 'alert', 'sound'] },
    { id: 'md-alarm', component: MdAlarm, name: 'Alarm', keywords: ['alarm', 'notification', 'alert', 'sound'] },
    { id: 'hi-bell', component: HiBell, name: 'Bell', keywords: ['alarm', 'notification', 'alert', 'sound'] },
    { id: 'warning', component: AlertTriangle, name: 'Alert Triangle', keywords: ['warning', 'caution', 'danger', 'alert'] },
    { id: 'md-warning', component: MdWarning, name: 'Warning', keywords: ['warning', 'caution', 'danger', 'alert'] },
    { id: 'hi-warning', component: HiExclamationTriangle, name: 'Exclamation Triangle', keywords: ['warning', 'caution', 'danger', 'alert'] },
    { id: 'home', component: Home, name: 'Home', keywords: ['home', 'house', 'building', 'residence'] },
    { id: 'md-home', component: MdHome, name: 'Home', keywords: ['home', 'house', 'building', 'residence'] },
    { id: 'hi-home', component: HiHome, name: 'Home', keywords: ['home', 'house', 'building', 'residence'] },
    { id: 'key', component: Key, name: 'Key', keywords: ['key', 'access', 'unlock', 'password'] },
    { id: 'md-key', component: MdKey, name: 'Key', keywords: ['key', 'access', 'unlock', 'password'] },
    { id: 'hi-key', component: HiKey, name: 'Key', keywords: ['key', 'access', 'unlock', 'password'] }
  ],
  devices: [
    { id: 'lightbulb', component: Lightbulb, name: 'Lightbulb', keywords: ['light', 'bulb', 'smart', 'illumination'] },
    { id: 'md-lightbulb', component: MdLightbulb, name: 'Lightbulb', keywords: ['light', 'bulb', 'smart', 'illumination'] },
    { id: 'hi-lightbulb', component: HiLightBulb, name: 'Lightbulb', keywords: ['light', 'bulb', 'smart', 'illumination'] },
    { id: 'smartphone', component: Smartphone, name: 'Smartphone', keywords: ['phone', 'mobile', 'device', 'smart'] },
    { id: 'md-smartphone', component: MdSmartphone, name: 'Smartphone', keywords: ['phone', 'mobile', 'device', 'smart'] },
    { id: 'hi-smartphone', component: HiDevicePhoneMobile, name: 'Device Phone Mobile', keywords: ['phone', 'mobile', 'device', 'smart'] },
    { id: 'monitor', component: Monitor, name: 'Monitor', keywords: ['screen', 'display', 'computer', 'tv'] },
    { id: 'md-computer', component: MdComputer, name: 'Computer', keywords: ['screen', 'display', 'computer', 'tv'] },
    { id: 'hi-desktop', component: HiComputerDesktop, name: 'Computer Desktop', keywords: ['screen', 'display', 'computer', 'tv'] },
    { id: 'power', component: Power, name: 'Power', keywords: ['power', 'on', 'off', 'switch'] },
    { id: 'md-power', component: MdPower, name: 'Power', keywords: ['power', 'on', 'off', 'switch'] },
    { id: 'hi-power', component: HiPower, name: 'Power', keywords: ['power', 'on', 'off', 'switch'] },
    { id: 'settings', component: Settings, name: 'Settings', keywords: ['settings', 'config', 'gear', 'preferences'] },
    { id: 'md-settings', component: MdSettings, name: 'Settings', keywords: ['settings', 'config', 'gear', 'preferences'] },
    { id: 'hi-settings', component: HiCog, name: 'Cog', keywords: ['settings', 'config', 'gear', 'preferences'] },
    { id: 'zap', component: Zap, name: 'Zap', keywords: ['electric', 'power', 'energy', 'bolt'] },
    { id: 'md-flash', component: MdFlashOn, name: 'Flash On', keywords: ['electric', 'power', 'energy', 'bolt'] },
    { id: 'battery', component: Battery, name: 'Battery', keywords: ['battery', 'power', 'charge', 'energy'] },
    { id: 'wifi', component: Wifi, name: 'Wifi', keywords: ['wifi', 'wireless', 'internet', 'connection'] },
    { id: 'md-wifi', component: MdWifi, name: 'Wifi', keywords: ['wifi', 'wireless', 'internet', 'connection'] },
    { id: 'hi-wifi', component: HiWifi, name: 'Wifi', keywords: ['wifi', 'wireless', 'internet', 'connection'] }
  ],
  sensors: [
    { id: 'camera', component: Camera, name: 'Camera', keywords: ['camera', 'photo', 'picture', 'surveillance'] },
    { id: 'md-camera', component: MdPhotoCamera, name: 'Photo Camera', keywords: ['camera', 'photo', 'picture', 'surveillance'] },
    { id: 'hi-camera', component: HiCamera, name: 'Camera', keywords: ['camera', 'photo', 'picture', 'surveillance'] },
    { id: 'video', component: Video, name: 'Video', keywords: ['video', 'recording', 'camera', 'surveillance'] },
    { id: 'md-video', component: MdVideocam, name: 'Videocam', keywords: ['video', 'recording', 'camera', 'surveillance'] },
    { id: 'hi-video', component: HiVideoCamera, name: 'Video Camera', keywords: ['video', 'recording', 'camera', 'surveillance'] },
    { id: 'mic', component: Mic, name: 'Mic', keywords: ['microphone', 'audio', 'sound', 'recording'] },
    { id: 'md-mic', component: MdMic, name: 'Mic', keywords: ['microphone', 'audio', 'sound', 'recording'] },
    { id: 'hi-mic', component: HiMicrophone, name: 'Microphone', keywords: ['microphone', 'audio', 'sound', 'recording'] },
    { id: 'thermometer', component: Thermometer, name: 'Thermometer', keywords: ['temperature', 'heat', 'cold', 'weather'] },
    { id: 'md-thermostat', component: MdThermostat, name: 'Thermostat', keywords: ['temperature', 'heat', 'cold', 'weather'] },
    { id: 'activity', component: Activity, name: 'Activity', keywords: ['activity', 'pulse', 'heartbeat', 'monitor'] },
    { id: 'trending', component: TrendingUp, name: 'Trending Up', keywords: ['trending', 'graph', 'chart', 'analytics'] },
    { id: 'md-trending', component: MdTrendingUp, name: 'Trending Up', keywords: ['trending', 'graph', 'chart', 'analytics'] },
    { id: 'hi-chart', component: HiChartBar, name: 'Chart Bar', keywords: ['trending', 'graph', 'chart', 'analytics'] }
  ],
  motion: [
    { id: 'user', component: User, name: 'User', keywords: ['person', 'human', 'individual', 'profile'] },
    { id: 'md-person', component: MdPerson, name: 'Person', keywords: ['person', 'human', 'individual', 'profile'] },
    { id: 'hi-user', component: HiUser, name: 'User', keywords: ['person', 'human', 'individual', 'profile'] },
    { id: 'users', component: Users, name: 'Users', keywords: ['people', 'group', 'multiple', 'team'] },
    { id: 'md-people', component: MdPeople, name: 'People', keywords: ['people', 'group', 'multiple', 'team'] },
    { id: 'hi-users', component: HiUsers, name: 'Users', keywords: ['people', 'group', 'multiple', 'team'] },
    { id: 'md-walk', component: MdDirectionsWalk, name: 'Directions Walk', keywords: ['walk', 'walking', 'pedestrian', 'movement'] },
    { id: 'md-run', component: MdDirectionsRun, name: 'Directions Run', keywords: ['run', 'running', 'fast', 'movement'] },
    { id: 'md-pets', component: MdPets, name: 'Pets', keywords: ['pet', 'animal', 'dog', 'cat'] },
    { id: 'md-face', component: MdFace, name: 'Face', keywords: ['face', 'recognition', 'person', 'identity'] },
    { id: 'hi-hand', component: HiHandRaised, name: 'Hand Raised', keywords: ['hand', 'raised', 'stop', 'halt'] }
  ],
  status: [
    { id: 'check', component: CheckCircle, name: 'Check Circle', keywords: ['check', 'success', 'ok', 'green'] },
    { id: 'md-check', component: MdCheckCircle, name: 'Check Circle', keywords: ['check', 'success', 'ok', 'green'] },
    { id: 'hi-check', component: HiCheckCircle, name: 'Check Circle', keywords: ['check', 'success', 'ok', 'green'] },
    { id: 'x-circle', component: XCircle, name: 'X Circle', keywords: ['error', 'cancel', 'fail', 'red'] },
    { id: 'md-cancel', component: MdCancel, name: 'Cancel', keywords: ['error', 'cancel', 'fail', 'red'] },
    { id: 'hi-x-circle', component: HiXCircle, name: 'X Circle', keywords: ['error', 'cancel', 'fail', 'red'] },
    { id: 'alert-circle', component: AlertCircle, name: 'Alert Circle', keywords: ['warning', 'alert', 'caution', 'yellow'] },
    { id: 'md-error', component: MdError, name: 'Error', keywords: ['warning', 'alert', 'caution', 'yellow'] },
    { id: 'hi-alert', component: HiExclamationCircle, name: 'Exclamation Circle', keywords: ['warning', 'alert', 'caution', 'yellow'] },
    { id: 'info', component: Info, name: 'Info', keywords: ['info', 'information', 'help', 'blue'] },
    { id: 'md-info', component: MdInfo, name: 'Info', keywords: ['info', 'information', 'help', 'blue'] },
    { id: 'hi-info', component: HiInformationCircle, name: 'Information Circle', keywords: ['info', 'information', 'help', 'blue'] },
    { id: 'play', component: Play, name: 'Play', keywords: ['play', 'start', 'begin', 'run'] },
    { id: 'hi-play', component: HiPlay, name: 'Play', keywords: ['play', 'start', 'begin', 'run'] },
    { id: 'pause', component: Pause, name: 'Pause', keywords: ['pause', 'stop', 'halt', 'break'] },
    { id: 'hi-pause', component: HiPause, name: 'Pause', keywords: ['pause', 'stop', 'halt', 'break'] }
  ],
  vehicles: [
    { id: 'car', component: Car, name: 'Car', keywords: ['car', 'vehicle', 'automobile', 'transport'] },
    { id: 'md-car', component: MdDirectionsCar, name: 'Directions Car', keywords: ['car', 'vehicle', 'automobile', 'transport'] },
    { id: 'bike', component: Bike, name: 'Bike', keywords: ['bike', 'bicycle', 'cycling', 'transport'] },
    { id: 'md-bike', component: MdDirectionsBike, name: 'Directions Bike', keywords: ['bike', 'bicycle', 'cycling', 'transport'] },
    { id: 'truck', component: Truck, name: 'Truck', keywords: ['truck', 'vehicle', 'delivery', 'transport'] },
    { id: 'md-truck', component: MdLocalShipping, name: 'Local Shipping', keywords: ['truck', 'vehicle', 'delivery', 'transport'] },
    { id: 'plane', component: Plane, name: 'Plane', keywords: ['plane', 'airplane', 'aircraft', 'flight'] },
    { id: 'md-plane', component: MdFlight, name: 'Flight', keywords: ['plane', 'airplane', 'aircraft', 'flight'] },
    { id: 'md-train', component: MdTrain, name: 'Train', keywords: ['train', 'railway', 'transport', 'public'] },
    { id: 'md-bus', component: MdDirectionsBus, name: 'Directions Bus', keywords: ['bus', 'public', 'transport', 'vehicle'] }
  ]
};

// Curated emoji icon categories for different types of events
const EMOJI_CATEGORIES = {
  security: {
    name: 'Security & Alarms',
    icons: ['🔒', '🔓', '🔐', '🛡️', '🚨', '⚠️', '🔔', '📢', '🚪', '🏠', '🔑', '👮', '🚫', '✅']
  },
  devices: {
    name: 'Smart Devices',
    icons: ['💡', '🔌', '🎛️', '📱', '💻', '📺', '🖥️', '⚙️', '🔧', '🔨', '⚡', '🔋', '📡', '📶']
  },
  sensors: {
    name: 'Sensors & Monitoring',
    icons: ['🌡️', '💨', '💧', '🔥', '👁️', '📹', '📷', '🎥', '📊', '📈', '📉', '🎯', '🔍', '📱']
  },
  motion: {
    name: 'Motion & Presence',
    icons: ['🚶', '🏃', '👤', '👥', '👪', '🤖', '🐕', '🐈', '👻', '🎭', '🕺', '💃', '🤸', '🧘']
  },
  environment: {
    name: 'Environmental',
    icons: ['🌤️', '☀️', '🌙', '⭐', '🌊', '🌿', '🌱', '🍃', '❄️', '🌨️', '🌧️', '⛈️', '🌈', '🔥']
  },
  communication: {
    name: 'Communication & System',
    icons: ['📧', '💬', '📞', '📱', '📡', '📶', '📊', '📈', '🔔', '📢', '📣', '💻', '⚙️', '🔄']
  },
  status: {
    name: 'Status & Health',
    icons: ['✅', '❌', '⚠️', '🟢', '🟡', '🔴', '🔵', '⚪', '⚫', '💚', '💛', '❤️', '💙', '🖤']
  },
  transport: {
    name: 'Vehicles & Transport',
    icons: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏍️', '🚲', '🛴', '🛵', '🚁', '✈️', '🚀', '🛸', '⛵']
  }
};

// Get all emoji icons as a flat array
const ALL_EMOJI_ICONS = Object.values(EMOJI_CATEGORIES).flatMap(cat => cat.icons);

// Get all professional icons as a flat array
const ALL_PROFESSIONAL_ICONS = Object.values(PROFESSIONAL_ICONS).flatMap(cat => cat);

// Get relevant icons based on category/event type
const getRelevantIcons = (category: string | undefined) => {
  if (!category) return { emojis: ALL_EMOJI_ICONS, professional: ALL_PROFESSIONAL_ICONS };
  
  const categoryKey = category.toLowerCase();
  
  // Map common categories to our icon categories
  const categoryMapping: Record<string, string[]> = {
    'security': ['security', 'devices'],
    'alarm': ['security', 'communication'],
    'device': ['devices', 'sensors'],
    'motion': ['motion', 'sensors'],
    'camera': ['sensors', 'security'],
    'door': ['security', 'devices'],
    'light': ['devices', 'environment'],
    'sensor': ['sensors', 'environment'],
    'system': ['communication', 'status'],
    'heartbeat': ['status', 'communication'],
    'connection': ['communication', 'status']
  };
  
  const relevantCategories = categoryMapping[categoryKey] || ['devices', 'status'];
  
  // Get relevant emoji icons
  const relevantEmojiIcons = relevantCategories.flatMap(cat => 
    EMOJI_CATEGORIES[cat as keyof typeof EMOJI_CATEGORIES]?.icons || []
  );
  
  // Get relevant professional icons
  const relevantProfessionalIcons = relevantCategories.flatMap(cat => 
    PROFESSIONAL_ICONS[cat] || []
  );
  
  return { 
    emojis: [...new Set(relevantEmojiIcons)], 
    professional: relevantProfessionalIcons 
  };
};

export function IconPicker({ selectedIcon, onIconSelect, category }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'relevant' | 'professional' | 'emoji' | 'all'>('relevant');
  
  const relevantIcons = getRelevantIcons(category);
  
  const getIconsToShow = () => {
    switch (activeTab) {
      case 'relevant':
        return {
          professional: relevantIcons.professional.slice(0, 16),
          emojis: relevantIcons.emojis.slice(0, 16)
        };
      case 'professional':
        return {
          professional: ALL_PROFESSIONAL_ICONS,
          emojis: []
        };
      case 'emoji':
        return {
          professional: [],
          emojis: ALL_EMOJI_ICONS
        };
      case 'all':
        return {
          professional: ALL_PROFESSIONAL_ICONS,
          emojis: ALL_EMOJI_ICONS
        };
      default:
        return { professional: [], emojis: [] };
    }
  };

  const handleIconSelect = (icon: string) => {
    onIconSelect(icon);
    setIsOpen(false);
  };

  const iconsToShow = getIconsToShow();

  return (
    <div className="relative">
      {/* Selected Icon Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Click to change icon"
      >
        {selectedIcon || '🔔'}
      </button>

      {/* Icon Picker Dropdown */}
      {isOpen && (
        <div className="absolute top-12 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg w-96 max-h-96 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {[
              { key: 'relevant', label: 'Suggested' },
              { key: 'professional', label: 'Professional' },
              { key: 'emoji', label: 'Emoji' },
              { key: 'all', label: 'All' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[#22c55f] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Icon Grid */}
          <div className="p-3 max-h-64 overflow-y-auto">
            <div className="grid grid-cols-8 gap-2">
              {/* Professional Icons */}
              {iconsToShow.professional.map((iconDef, index) => {
                const IconComponent = iconDef.component;
                const iconValue = `react-${iconDef.id}`;
                return (
                  <button
                    key={`pro-${iconDef.id}-${index}`}
                    onClick={() => handleIconSelect(iconValue)}
                    className={`w-8 h-8 flex items-center justify-center text-lg rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedIcon === iconValue
                        ? 'bg-[#22c55f] text-white' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                    title={iconDef.name}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5" />}
                  </button>
                );
              })}
              
              {/* Emoji Icons */}
              {iconsToShow.emojis.map((emoji, index) => (
                <button
                  key={`emoji-${emoji}-${index}`}
                  onClick={() => handleIconSelect(emoji)}
                  className={`w-8 h-8 flex items-center justify-center text-lg rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedIcon === emoji 
                      ? 'bg-[#22c55f] text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  title={`Select ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Close Button */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 