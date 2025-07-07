'use client';

import React from 'react';
import { Dialog } from '@headlessui/react';
import { SSEEventDisplay } from '@/hooks/useSSE';

interface Props {
  event: SSEEventDisplay;
  onClose: () => void;
}

export const EventDetailsModal: React.FC<Props> = ({ event, onClose }) => {
  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <Dialog.Panel className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 z-10">
        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {event.deviceName || 'Event Details'}
        </Dialog.Title>
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {event.type} • {event.timestamp && new Date(event.timestamp).toLocaleString()}
        </div>
        <pre className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 text-xs overflow-x-auto text-gray-800 dark:text-gray-100 max-h-64">
          {JSON.stringify(event, null, 2)}
        </pre>
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none"
          >
            Close
          </button>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};
