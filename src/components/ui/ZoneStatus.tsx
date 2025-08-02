import React, { useState } from 'react';
import { Area, Space, AlarmZone, ZoneWithDevices } from '@/lib/api';
import { ZoneDevicesModal } from './ZoneDevicesModal';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface ZoneStatusProps {
  spaces: Space[];
  alarmZones: AlarmZone[];
  getZonesWithDevices: () => ZoneWithDevices[];
  weather: WeatherData | null;
  useDesign2: boolean;
  showZonesPreview: boolean;
}

export function ZoneStatus({ 
  spaces, 
  alarmZones,
  getZonesWithDevices,
  weather, 
  useDesign2, 
  showZonesPreview 
}: ZoneStatusProps) {
  // State for modal
  const [selectedZone, setSelectedZone] = useState<ZoneWithDevices | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Always show alarm zones if they exist (ignore showZonesPreview for alarm zones)
  if (!alarmZones || alarmZones.length === 0) {
    return null;
  }

  // Always use alarmZones directly for real-time SSE updates
  // getZonesWithDevices adds device data but we need to ensure we get latest armed states
  const zonesWithDevices = getZonesWithDevices();
  
  // Ensure we always use the latest alarmZones data for armed states (SSE updates)
  const displayZones = alarmZones.map(zone => {
    // Find matching zone from getZonesWithDevices for device data
    const zoneWithDevices = zonesWithDevices.find(z => z.id === zone.id);
    
    return {
      ...zone, // Always use latest zone data from SSE
      devices: zoneWithDevices?.devices || [],
      armedCount: zone.armedState === 'DISARMED' ? 0 : (zoneWithDevices?.armedCount || 1),
      totalCount: zoneWithDevices?.totalCount || zone.deviceIds?.length || 0
    };
  });
  
  console.log('🔍 [ZoneStatus] SSE-reactive render:', {
    alarmZonesCount: alarmZones.length,
    displayZones: displayZones.map(z => ({ name: z.name, armedState: z.armedState, totalCount: z.totalCount }))
  });
  
  const armedZonesCount = displayZones.filter(zone => zone.armedCount > 0).length;

  // Handle zone click
  const handleZoneClick = (zone: ZoneWithDevices) => {
    console.log('🔍 [ZoneStatus] Mobile Zone clicked:', zone.name);
    setSelectedZone(zone);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedZone(null);
  };

  return (
    <div className="flex-shrink-0 px-4 mb-1">
      {/* Weather Header (if enabled) */}
      {weather && (
        <div className="flex items-center gap-2 mb-1">
          <img 
            src={`https://openweathermap.org/img/wn/${weather.icon}.png`} 
            alt={weather.condition}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {weather.temp}°F
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {weather.condition}
          </span>
        </div>
      )}
      
      {/* Micro-Compact Alarm Zones Section */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-md px-2 py-1 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            Alarm Zones
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {displayZones.length}
          </span>
        </div>
        
        {displayZones.map((zone) => (
          <button
            key={zone.id}
            onClick={() => handleZoneClick(zone)}
            className="w-full flex items-center justify-between bg-white dark:bg-gray-800/80 rounded-sm py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors active:bg-gray-100 dark:active:bg-gray-600 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <div 
                className={`w-2 h-2 rounded-full ${zone.armedState !== 'DISARMED' ? 'bg-red-500' : 'bg-green-500'}`}
              />
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {zone.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">{zone.totalCount} devices</span>
              <span className={`font-semibold text-xs ${zone.armedState !== 'DISARMED' ? 'text-red-500' : 'text-green-500'}`}>
                {zone.armedState !== 'DISARMED' ? 'Armed' : 'Disarmed'}
              </span>
            </div>
          </button>
        ))}
      </div>
      
      {/* Zone Devices Modal */}
      <ZoneDevicesModal
        zone={selectedZone}
        spaces={spaces}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </div>
  );
} 