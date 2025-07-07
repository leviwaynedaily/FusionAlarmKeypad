import { Suspense } from 'react';
import Link from 'next/link';

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
  const base = process.env.NEXT_PUBLIC_BASE_URL || '';
  const res = await fetch(`${base}/api/events?limit=500`, { cache: 'no-store' });
  const events = await res.json();

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
            <tr key={e.id} className="border-b last:border-0">
              <td className="py-2 pr-4 whitespace-nowrap">{new Date(e.received_at).toLocaleString()}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{e.event_type}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{e.category}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{e.device_name}</td>
              <td className="py-2">
                <details>
                  <summary className="cursor-pointer text-blue-600">payload</summary>
                  <pre className="whitespace-pre-wrap text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded">
                    {JSON.stringify(JSON.parse(e.payload), null, 2)}
                  </pre>
                </details>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 