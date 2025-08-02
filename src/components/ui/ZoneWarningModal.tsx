'use client';

import React from 'react';
import { Dialog } from '@headlessui/react';
import { AlarmZone } from '@/lib/api';

interface ZoneWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  zone: AlarmZone | null;
  warnings: string[];
}

export const ZoneWarningModal: React.FC<ZoneWarningModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  zone,
  warnings
}) => {
  if (!zone) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/60" aria-hidden="true" />
      <Dialog.Panel className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-4 p-6 z-10">
        {/* Header */}
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              Device Warning
            </Dialog.Title>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Issues detected before arming &quot;{zone.name}&quot;
            </p>
          </div>
        </div>

        {/* Warning List */}
        <div className="mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            The following devices have issues that may prevent proper security monitoring:
          </p>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
            <ul className="space-y-2">
              {warnings.map((warning, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-amber-800 dark:text-amber-200">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
          >
            Arm Anyway
          </button>
        </div>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Arming with open doors/windows or unlocked devices may reduce security effectiveness. 
                Consider resolving these issues before arming.
              </p>
            </div>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};