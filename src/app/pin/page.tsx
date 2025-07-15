'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { validatePin, getAlarmZones, updateAlarmZone, armDevices, AlarmZone } from '@/lib/api';

type ArmingAction = 'DISARMED' | 'ARMED_STAY' | 'ARMED_AWAY';

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [alarmZones, setAlarmZones] = useState<AlarmZone[]>([]);
  const [processing, setProcessing] = useState(false);
  const [highlightPinButtons, setHighlightPinButtons] = useState(true);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a location selected
    const location = localStorage.getItem('selected_location');
    if (!location) {
      router.push('/location');
      return;
    }

    const parsedLocation = JSON.parse(location);
    setSelectedLocation(parsedLocation);
    
    // Load highlight PIN buttons setting
    const savedHighlightPinButtons = localStorage.getItem('highlight_pin_buttons');
    if (savedHighlightPinButtons !== null) {
      setHighlightPinButtons(savedHighlightPinButtons === 'true');
    }
  }, [router]);

  // Auto-submit when PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === 6 && !authenticated) {
      handlePinSubmit();
    }
  }, [pin, authenticated]);

  const loadAlarmZones = async () => {
    if (!selectedLocation) return;
    
    try {
      const response = await getAlarmZones(selectedLocation.id);
      if (response.error) {
        console.error('Failed to load alarm zones:', response.error);
        setAlarmZones([]);
      } else {
        setAlarmZones(response.data);
      }
    } catch (error) {
      console.error('Failed to load alarm zones:', error);
      setAlarmZones([]);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;

    setError('');
    setLoading(true);

    try {
      const response = await validatePin(pin);
      
      if (response.error || !response.data.valid) {
        setError('Invalid PIN');
        setPin('');
        return;
      }

      localStorage.setItem('user_id', response.data.userId);
      localStorage.setItem('user_name', response.data.userName);
      
      // Instead of redirecting, show arm/disarm controls
      setAuthenticated(true);
      await loadAlarmZones();
    } catch (err) {
      setError('An error occurred while validating the PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (key: string) => {
    if (pin.length < 6 && !loading && !authenticated) {
      setPin(prev => prev + key);
    }
  };

  const handleBackspace = () => {
    if (!loading && !authenticated) {
      setPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (!loading && !authenticated) {
      setPin('');
    }
  };

  const handleZoneAction = async (zone: AlarmZone, action: ArmingAction) => {
    setProcessing(true);
    try {
      if (action === 'DISARMED') {
        // Update the zone to disarmed state
        await updateAlarmZone(zone.id, { armedState: 'DISARMED' });
      } else {
        // Get device IDs to arm
        const deviceIdsToArm = zone.devices?.map(device => device.id) || [];
        
        if (deviceIdsToArm.length > 0) {
          await armDevices(deviceIdsToArm, action);
        }
        
        // Update the zone state
        await updateAlarmZone(zone.id, { armedState: action });
      }

      // Reload zones to get updated status
      await loadAlarmZones();
    } catch (error) {
      console.error('Failed to update zone state:', error);
      setError('Failed to update zone state');
    } finally {
      setProcessing(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    setAuthenticated(false);
    setPin('');
    setError('');
  };

  const getZoneStatusIcon = (zone: AlarmZone) => {
    const armedDevices = zone.devices?.filter(device => device.armedState !== 'DISARMED') || [];
    const totalDevices = zone.devices?.length || 0;
    
    if (zone.armedState === 'DISARMED' || armedDevices.length === 0) {
      return { icon: '🟢', status: 'DISARMED', color: 'text-green-500' };
    } else if (zone.armedState === 'ARMED_AWAY' || armedDevices.length === totalDevices) {
      return { icon: '🔴', status: 'ARMED', color: 'text-red-500' };
    } else {
      return { icon: '🟡', status: 'PARTIAL', color: 'text-yellow-500' };
    }
  };

  const getActionButtonClass = (action: ArmingAction, zone: AlarmZone) => {
    const baseClass = "flex-1 py-4 px-3 rounded-xl font-semibold text-sm transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
    const isActive = zone.armedState === action;
    
    switch (action) {
      case 'DISARMED':
        return `${baseClass} ${isActive ? 'bg-green-600 text-white' : 'bg-green-100 hover:bg-green-200 text-green-700'}`;
      case 'ARMED_STAY':
        return `${baseClass} ${isActive ? 'bg-yellow-600 text-white' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'}`;
      case 'ARMED_AWAY':
        return `${baseClass} ${isActive ? 'bg-red-600 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'}`;
      default:
        return baseClass;
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg relative">
        {/* Loading overlay */}
        {(loading || processing) && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-gray-700">
                {loading ? 'Authorizing...' : 'Updating...'}
              </p>
            </div>
          </div>
        )}

        {!authenticated ? (
          /* PIN Entry Interface */
          <>
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Enter PIN
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Enter your 6-digit PIN to continue
              </p>
            </div>

            <div className="flex justify-center">
              <div className="w-48 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl tracking-widest">
                  {pin.padEnd(6, '•').split('').join(' ')}
                </span>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num.toString())}
                  onMouseDown={() => highlightPinButtons && setPressedButton(num.toString())}
                  onMouseUp={() => setPressedButton(null)}
                  onMouseLeave={() => setPressedButton(null)}
                  onTouchStart={() => highlightPinButtons && setPressedButton(num.toString())}
                  onTouchEnd={() => setPressedButton(null)}
                  disabled={loading}
                  className={`p-4 text-2xl font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                    highlightPinButtons && pressedButton === num.toString()
                      ? 'bg-green-500 text-white transform scale-95'
                      : 'bg-gray-100 hover:bg-gray-200'
                  } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                onMouseDown={() => highlightPinButtons && setPressedButton('clear')}
                onMouseUp={() => setPressedButton(null)}
                onMouseLeave={() => setPressedButton(null)}
                onTouchStart={() => highlightPinButtons && setPressedButton('clear')}
                onTouchEnd={() => setPressedButton(null)}
                disabled={loading}
                className={`p-4 text-lg font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                  highlightPinButtons && pressedButton === 'clear'
                    ? 'bg-green-500 text-white transform scale-95'
                    : 'bg-gray-100 hover:bg-gray-200'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                Clear
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                onMouseDown={() => highlightPinButtons && setPressedButton('0')}
                onMouseUp={() => setPressedButton(null)}
                onMouseLeave={() => setPressedButton(null)}
                onTouchStart={() => highlightPinButtons && setPressedButton('0')}
                onTouchEnd={() => setPressedButton(null)}
                disabled={loading}
                className={`p-4 text-2xl font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                  highlightPinButtons && pressedButton === '0'
                    ? 'bg-green-500 text-white transform scale-95'
                    : 'bg-gray-100 hover:bg-gray-200'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                onMouseDown={() => highlightPinButtons && setPressedButton('backspace')}
                onMouseUp={() => setPressedButton(null)}
                onMouseLeave={() => setPressedButton(null)}
                onTouchStart={() => highlightPinButtons && setPressedButton('backspace')}
                onTouchEnd={() => setPressedButton(null)}
                disabled={loading}
                className={`p-4 text-lg font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                  highlightPinButtons && pressedButton === 'backspace'
                    ? 'bg-green-500 text-white transform scale-95'
                    : 'bg-gray-100 hover:bg-gray-200'
                } ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                ←
              </button>
            </div>
          </>
        ) : (
          /* Arm/Disarm Controls Interface */
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Security Control
              </h2>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign Out
              </button>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            {alarmZones.length === 0 ? (
              <div className="text-center text-gray-500">
                <p>No alarm zones configured</p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {alarmZones.map((zone) => {
                  const status = getZoneStatusIcon(zone);
                  return (
                    <div
                      key={zone.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      {/* Zone Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: zone.color || '#6b7280' }}
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                            <p className="text-xs text-gray-600">
                              {zone.devices?.length || 0} device{(zone.devices?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg">{status.icon}</div>
                          <div className={`text-xs font-medium ${status.color}`}>
                            {status.status}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleZoneAction(zone, 'DISARMED')}
                          disabled={processing}
                          className={getActionButtonClass('DISARMED', zone)}
                        >
                          <div className="text-xs">🟢</div>
                          <div>DISARM</div>
                        </button>
                        
                        <button
                          onClick={() => handleZoneAction(zone, 'ARMED_STAY')}
                          disabled={processing}
                          className={getActionButtonClass('ARMED_STAY', zone)}
                        >
                          <div className="text-xs">🟡</div>
                          <div>STAY</div>
                        </button>
                        
                        <button
                          onClick={() => handleZoneAction(zone, 'ARMED_AWAY')}
                          disabled={processing}
                          className={getActionButtonClass('ARMED_AWAY', zone)}
                        >
                          <div className="text-xs">🔴</div>
                          <div>AWAY</div>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                View Full Dashboard →
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
} 