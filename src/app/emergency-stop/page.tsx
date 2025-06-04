'use client';

import { useState } from 'react';
import { stopAllPollers, clearCache } from '@/lib/api-optimized';

export default function EmergencyStopPage() {
  const [stopped, setStopped] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmergencyStop = async () => {
    setLoading(true);
    try {
      // Stop all active pollers
      stopAllPollers();
      setStopped(true);
      
      // Clear all caches
      clearCache();
      setCleared(true);
      
      // Clear localStorage polling flags
      localStorage.removeItem('polling_active');
      
      // Emergency stop executed successfully
          } catch (error) {
        // Log error for debugging (keeping console.error for emergency situations)
        console.error('Error during emergency stop:', error);
      } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
      <div className="container mx-auto p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <svg className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-3xl font-bold text-red-800 dark:text-red-400 mb-2">
              Emergency Database Protection
            </h1>
            <p className="text-lg text-red-600 dark:text-red-300">
              Stop all API polling to protect database from overload
            </p>
          </div>

          {/* Status Alert */}
          <div className="mb-6 border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4 rounded-lg flex items-start gap-3">
            <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="text-red-800 dark:text-red-300">
              <strong>Database Overload Detected:</strong> This page will immediately stop all API polling 
              and clear caches to reduce database load. Use this if the application is making excessive API calls.
            </div>
          </div>

          {/* Emergency Actions */}
          <div className="bg-white dark:bg-gray-800 shadow-xl border border-red-200 dark:border-red-800 rounded-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-red-800 dark:text-red-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Emergency Actions
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Click the button below to immediately stop all polling and clear caches.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <button 
                onClick={handleEmergencyStop}
                disabled={loading || stopped}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Stopping All Polling...
                  </>
                ) : stopped ? (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Emergency Stop Executed
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    EMERGENCY STOP - Stop All Polling
                  </>
                )}
              </button>

              {/* Status Indicators */}
              {(stopped || cleared) && (
                <div className="space-y-2 pt-4 border-t border-red-200 dark:border-red-800">
                  <h3 className="font-semibold text-green-800 dark:text-green-400">Actions Completed:</h3>
                  {stopped && (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      All API polling stopped
                    </div>
                  )}
                  {cleared && (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      All caches cleared
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-2 pt-4">
                <a href="/" className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Return to Home
                </a>
                <a href="/debug" className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Debug Page
                </a>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="mt-6 bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold">Technical Details</h2>
            </div>
            <div className="p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p><strong>Previous Issues:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Multiple SmartPollers running simultaneously (5-second intervals)</li>
                  <li>Dashboard, Events, Devices, and Automations each creating separate pollers</li>
                  <li>Rate limiting was insufficient (60 requests/minute)</li>
                  <li>No global poller coordination</li>
                </ul>
                <p><strong>New Improvements:</strong></p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Reduced rate limit to 20 requests/minute</li>
                  <li>Increased minimum polling intervals (30s-120s base)</li>
                  <li>Added global poller management with unique keys</li>
                  <li>Implemented aggressive exponential backoff</li>
                  <li>Added random delays to prevent thundering herd</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 