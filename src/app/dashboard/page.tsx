'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Area } from '@/lib/api';
import { optimizedGetAreas, SmartPoller, clearCache } from '@/lib/api-optimized';
import AreaCard from '@/components/AreaCard';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';

export default function DashboardPage() {
  const [areas, setAreas] = useState<Area[]>([]);
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
    if (!storedLocation) {
      router.push('/location');
      return;
    }

    setLocation(JSON.parse(storedLocation));

    // Get organization from localStorage
    const storedOrganization = localStorage.getItem('fusion_organization');
    if (storedOrganization) {
      try {
        setOrganization(JSON.parse(storedOrganization));
      } catch (e) {
        console.error('Failed to parse organization:', e);
      }
    }
  }, [router]);

  useEffect(() => {
    if (!location) return;

    const fetchAreas = async () => {
      try {
        const response = await optimizedGetAreas(location.id);
        if (response.error) {
          setError('Failed to fetch areas');
          return { areas: [], hasChanges: false };
        }
        
        // Only update if there are changes
        const existingIds = new Set(areas.map(a => a.id));
        const newIds = new Set((response.data || []).map(a => a.id));
        const hasChanges = (response.data || []).length !== areas.length || 
                          (response.data || []).some(a => !existingIds.has(a.id)) ||
                          areas.some(a => !newIds.has(a.id)) ||
                          // Also check for state changes
                          (response.data || []).some(newArea => {
                            const existingArea = areas.find(a => a.id === newArea.id);
                            return existingArea && existingArea.armedState !== newArea.armedState;
                          });

        if (hasChanges) {
          setAreas(response.data || []);
        }
        setError(''); // Clear any previous errors
        return { areas: response.data || [], hasChanges };
      } catch (err) {
        setError('An error occurred while fetching areas');
        return { areas: [], hasChanges: false };
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchAreas();

    // Set up smart polling
    const poller = new SmartPoller(5000, 30000);
    poller.start(async () => {
      const result = await fetchAreas();
      return result.areas;
    });
    setSmartPoller(poller);

    // Cleanup on unmount
    return () => {
      poller.stop();
    };
  }, [location]);

  const handleAreaStateChange = async () => {
    if (!location) return;
    
    // Clear cache to ensure fresh data after state change
    clearCache(`areas-${location.id}`);
    
    try {
      const response = await optimizedGetAreas(location.id);
      if (response.error) {
        setError('Failed to refresh areas');
        return;
      }
      setAreas(response.data || []);
    } catch (err) {
      setError('An error occurred while refreshing areas');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-100 pb-16">
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
            <h1 className="text-2xl font-bold text-gray-900">Areas</h1>
            {error && (
              <div className="mt-2 text-red-500 text-sm">{error}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                onStateChange={handleAreaStateChange}
              />
            ))}
          </div>
        </div>
        <TabNav />
      </main>
    </>
  );
} 