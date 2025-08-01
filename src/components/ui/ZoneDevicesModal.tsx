import React from 'react';
import { ZoneWithDevices, Device, Space } from '@/lib/api';

interface ZoneDevicesModalProps {
  zone: ZoneWithDevices | null;
  spaces: Space[];
  isOpen: boolean;
  onClose: () => void;
}

export function ZoneDevicesModal({ zone, spaces, isOpen, onClose }: ZoneDevicesModalProps) {
  if (!isOpen || !zone) return null;

  console.log('🔍 [ZoneDevicesModal] Modal opened with zone:', {
    zoneName: zone.name,
    zoneId: zone.id,
    deviceCount: zone.devices?.length || 0,
    totalCount: zone.totalCount,
    armedCount: zone.armedCount,
    devices: zone.devices,
    spacesCount: spaces.length
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true" 
      />
      
      {/* Modal Panel */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 z-10 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${zone.armedCount > 0 ? 'bg-red-500' : 'bg-green-500'}`}
            />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {zone.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Zone Status Summary */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Zone Status</span>
            <span className={`font-medium ${zone.armedCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {zone.armedState !== 'DISARMED' ? 'Armed' : 'Disarmed'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600 dark:text-gray-400">Total Devices</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {zone.totalCount}
            </span>
          </div>
        </div>

        {/* Devices List */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Devices in Zone
          </h3>
          
          {zone.devices && zone.devices.length > 0 ? (
            zone.devices.map((device: Device) => {
              const deviceSpace = spaces.find(s => s.id === device.spaceId);
              const isArmed = device.armedState !== 'DISARMED';
              
              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isArmed ? 'bg-red-500' : 'bg-green-500'}`} />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {device.name}
                      </span>

                    </div>
                    
                    {deviceSpace && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Location: {deviceSpace.name}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Type: {device.type || 'Security Device'}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-xs font-medium ${isArmed ? 'text-red-500' : 'text-green-500'}`}>
                      {device.armedState !== 'DISARMED' ? 'Armed' : 'Disarmed'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p className="text-sm">No devices found in this zone</p>
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}