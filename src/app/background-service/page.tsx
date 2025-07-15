'use client';

import { useState, useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';

export default function BackgroundServicePage() {
  const { 
    backgroundServiceStatus, 
    checkBackgroundService, 
    startBackgroundService, 
    stopBackgroundService,
    isConnected
  } = useSSE();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkBackgroundService();
  }, [checkBackgroundService]);

  const handleStart = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await startBackgroundService();
      setMessage(result.message || 'Service started successfully');
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await stopBackgroundService();
      setMessage(result.message || 'Service stopped successfully');
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    checkBackgroundService();
  };

  const getStatusColor = (isRunning: boolean) => {
    return isRunning ? 'text-green-600' : 'text-red-600';
  };

  const getStatusText = (isRunning: boolean) => {
    return isRunning ? 'Running' : 'Stopped';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Background SSE Service</h1>
        
        <div className="bg-slate-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Service Status</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Status</div>
              <div className={`text-lg font-semibold ${getStatusColor(isConnected)}`}>
                {getStatusText(isConnected)}
              </div>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Configuration</div>
              <div className="text-lg font-semibold">
                {backgroundServiceStatus?.hasConfig ? '✅ Configured' : '❌ Not Configured'}
              </div>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Reconnect Attempts</div>
              <div className="text-lg font-semibold">
                {backgroundServiceStatus?.reconnectAttempts || 0}
              </div>
            </div>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Last Check</div>
              <div className="text-lg font-semibold">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleStart}
              disabled={loading || isConnected}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Starting...' : 'Start Service'}
            </button>
            
            <button
              onClick={handleStop}
              disabled={loading || !isConnected}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors"
            >
              {loading ? 'Stopping...' : 'Stop Service'}
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-md font-medium transition-colors"
            >
              Refresh Status
            </button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-md ${
              message.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'
            }`}>
              {message}
            </div>
          )}
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">About Background Service</h2>
          <div className="text-slate-300 space-y-3">
            <p>
              The background SSE service runs 24/7 on the server to ensure no events are lost, even when no one is using the app.
            </p>
            <p>
              <strong>How it works:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Maintains a persistent connection to the Fusion API</li>
              <li>Automatically saves all incoming events to the Supabase database</li>
              <li>Handles reconnections and error recovery</li>
              <li>Operates independently of browser connections</li>
            </ul>
            <p>
              <strong>Benefits:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>✅ Events captured 24/7, even when app is closed</li>
              <li>✅ Complete event history preserved</li>
              <li>✅ No data loss during downtime</li>
              <li>✅ Improved reliability and performance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 