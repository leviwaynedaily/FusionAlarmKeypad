import { Suspense } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/lib/api';

export const metadata = { title: 'Event Log' };

export default function EventLogPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Log</h1>
          <Link href="/" className="text-blue-600 hover:underline">Back to Home</Link>
        </div>
        <Suspense fallback={<p className="text-gray-700 dark:text-gray-300">Loading events…</p>}>
          <EventsTable />
        </Suspense>
      </div>
    </main>
  );
}

async function EventsTable() {
  try {
    // Server-safe fetch using only environment variables (no localStorage)
    const apiKey = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
    const baseUrl = API_BASE_URL;
    
    const queryParams = new URLSearchParams();
    queryParams.append('limit', '100');
    queryParams.append('sinceHours', '72'); // Last 3 days
    
    const response = await fetch(`${baseUrl}/api/events?${queryParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const events = data?.data || [];

    if (events.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-700 dark:text-gray-300">No events found.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Events are fetched from the Fusion API.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4">Time</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Device</th>
              <th className="py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e: any) => (
              <tr key={e.id || e.eventUuid || Math.random()} className="border-b last:border-0">
                <td className="py-2 pr-4 whitespace-nowrap">
                  {e.timestamp ? new Date(e.timestamp).toLocaleString() : 
                   'N/A'}
                </td>
                <td className="py-2 pr-4 whitespace-nowrap">{e.eventType || e.rawEventType || 'Unknown'}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{e.eventCategory || 'N/A'}</td>
                <td className="py-2 pr-4 whitespace-nowrap">{e.deviceName || 'N/A'}</td>
                <td className="py-2">
                  <details>
                    <summary className="cursor-pointer text-blue-600">payload</summary>
                    <pre className="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded">
                      {e.payload ? 
                        JSON.stringify(e.payload, null, 2) :
                        JSON.stringify(e, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Showing {events.length} events from Fusion API
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching events:', error);
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <h3 className="font-bold">Error loading events</h3>
        <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        <p className="text-sm mt-2">
          Make sure your API key is configured in environment variables.
        </p>
      </div>
    );
  }
} 