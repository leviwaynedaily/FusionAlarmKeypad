'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Location } from '@/lib/api';
import { optimizedGetLocations } from '@/lib/api-optimized';

export default function LocationPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await optimizedGetLocations();
        if (response.error) {
          setError('Failed to fetch locations');
          return;
        }
        setLocations(response.data);
      } catch (err) {
        setError('An error occurred while fetching locations');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const handleLocationSelect = (location: Location) => {
    localStorage.setItem('selected_location', JSON.stringify(location));
    router.push('/pin');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading locations...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Select Location
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Choose a location to continue
          </p>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <div className="space-y-4">
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => handleLocationSelect(location)}
              className="w-full flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 dark:focus:ring-gray-100"
            >
              <span className="text-gray-900 dark:text-white">{location.name}</span>
              <svg
                className="h-5 w-5 text-gray-400 dark:text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
} 