'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Device } from '@/lib/api';
import { optimizedGetDevices, SmartPoller } from '@/lib/api-optimized';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState<{ id: string; name: string; addressPostalCode: string } | null>(null);
  const [organization, setOrganization] = useState<{ name: string } | null>(null);
  const [smartPoller, setSmartPoller] = useState<SmartPoller | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check if we have a user ID
    const userId = localStorage.getItem('user_id');
    if (!userId) {
      router.push('/pin');
      return;
    }

    // Get location from localStorage
    const storedLocation = localStorage.getItem('selected_location');
    if (storedLocation) {
      try {
        setLocation(JSON.parse(storedLocation));
      } catch (e) {
        console.error('Failed to parse location:', e);
      }
    }

    // Get organization from localStorage
    const storedOrganization = localStorage.getItem('fusion_organization');
    if (storedOrganization) {
      try {
        setOrganization(JSON.parse(storedOrganization));
      } catch (e) {
        console.error('Failed to parse organization:', e);
      }
    }

    const fetchDevices = async () => {
      try {
        const response = await optimizedGetDevices();
        if (response.error) {
          if (loading) setError('Failed to fetch devices');
          return { devices: [], hasChanges: false };
        }
        
        // Only update if there are changes
        const existingIds = new Set(devices.map(d => d.id));
        const newIds = new Set((response.data || []).map(d => d.id));
        const hasChanges = (response.data || []).length !== devices.length || 
                          (response.data || []).some(d => !existingIds.has(d.id)) ||
                          devices.some(d => !newIds.has(d.id));

        if (hasChanges) {
          setDevices(response.data || []);
        }
        setError(''); // Clear any previous errors
        return { devices: response.data || [], hasChanges };
      } catch (err) {
        if (loading) setError('An error occurred while fetching devices');
        return { devices: [], hasChanges: false };
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchDevices();

    // Set up smart polling
    const poller = new SmartPoller(5000, 30000);
    poller.start(async () => {
      const result = await fetchDevices();
      return result.devices;
    });
    setSmartPoller(poller);

    // Cleanup on unmount
    return () => {
      poller.stop();
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-100 pb-16">
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          <TabNav />
        </main>
      </>
    );
  }

  return (
    <>
      <Header 
        locationName={location?.name}
        postalCode={location?.addressPostalCode}
        organizationName={organization?.name}
      />
      <main className="min-h-screen bg-gray-100 pb-16">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
            {error && (
              <div className="mt-2 text-red-500 text-sm">{error}</div>
            )}
          </div>

          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {device.name}
                  </h3>
                  <p className="text-sm text-gray-500">{device.type}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div
                    className={`px-3 py-1 rounded-full text-sm ${
                      device.online
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {device.online ? 'Online' : 'Offline'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Last update: {device.lastStateUpdate ? new Date(device.lastStateUpdate).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <TabNav />
      </main>
    </>
  );
} 