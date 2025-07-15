'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Space } from '@/lib/api';
import { optimizedGetSpaces, SmartPoller, clearCache } from '@/lib/api-optimized';
import SpaceCard from '@/components/SpaceCard';
import Header from '@/components/Header';
import TabNav from '@/components/TabNav';

export default function DashboardPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
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

    const fetchSpaces = async () => {
      try {
        const response = await optimizedGetSpaces(location.id);
        if (response.error) {
          setError('Failed to fetch spaces');
          return { spaces: [], hasChanges: false };
        }
        
        // Only update if there are changes
        const existingIds = new Set(spaces.map(s => s.id));
        const newIds = new Set((response.data || []).map(s => s.id));
        const hasChanges = (response.data || []).length !== spaces.length || 
                          (response.data || []).some(s => !existingIds.has(s.id)) ||
                          spaces.some(s => !newIds.has(s.id)) ||
                          // Also check for content changes
                          (response.data || []).some(newSpace => {
                            const existingSpace = spaces.find(s => s.id === newSpace.id);
                            return existingSpace && (
                              existingSpace.name !== newSpace.name ||
                              existingSpace.description !== newSpace.description ||
                              (existingSpace.deviceIds?.length || 0) !== (newSpace.deviceIds?.length || 0)
                            );
                          });

        if (hasChanges) {
          setSpaces(response.data || []);
        }
        setError(''); // Clear any previous errors
        return { spaces: response.data || [], hasChanges };
      } catch (err) {
        setError('An error occurred while fetching spaces');
        return { spaces: [], hasChanges: false };
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchSpaces();

    // Set up smart polling
    const poller = new SmartPoller(10000, 60000); // Less frequent polling for spaces
    poller.start(async () => {
      const result = await fetchSpaces();
      return result.spaces;
    });
    setSmartPoller(poller);

    // Cleanup on unmount
    return () => {
      poller.stop();
    };
  }, [location]);

  const handleSpaceClick = (space: Space) => {
    // Navigate to space details or device management
    console.log('Space clicked:', space.name);
    // TODO: Implement space details page
    // router.push(`/spaces/${space.id}`);
  };

  const handleRefresh = async () => {
    if (!location) return;
    
    // Clear cache to ensure fresh data
    clearCache(`spaces-${location.id}`);
    
    try {
      const response = await optimizedGetSpaces(location.id);
      if (response.error) {
        setError('Failed to refresh spaces');
        return;
      }
      setSpaces(response.data || []);
    } catch (err) {
      setError('An error occurred while refreshing spaces');
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-16">
          <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
      <main className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-16">
        <div className="max-w-screen-xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spaces</h1>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
              >
                Refresh
              </button>
            </div>
            {error && (
              <div className="mt-2 text-red-500 text-sm">{error}</div>
            )}
          </div>

          {spaces.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m14 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Spaces Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No spaces are configured for this location yet.
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Refresh Spaces
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  onSpaceClick={handleSpaceClick}
                  deviceCount={space.deviceIds?.length || 0}
                />
              ))}
            </div>
          )}
        </div>
        <TabNav />
      </main>
    </>
  );
} 