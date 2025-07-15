"use client";

import { useState, useEffect } from 'react';
import { useSSEDebug } from '@/hooks/useSSEDebug';

export default function SSETestPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debug = useSSEDebug();

  // Load from environment variables on mount  
  useEffect(() => {
    const envApiKey = process.env.NEXT_PUBLIC_FUSION_API_KEY || '';
    setApiKey(envApiKey);
    setOrganizationId('env-based'); // Not needed for API, just for display
  }, []);

  const handleTestSSE = async () => {
    setIsLoading(true);
    debug.clearLogs();
    try {
      const workingEndpoint = await debug.testSSEConnection(organizationId, apiKey);
      if (workingEndpoint) {
        debug.addLog(`🎉 SUCCESS: Working SSE endpoint found: ${workingEndpoint}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestWebSocket = async () => {
    setIsLoading(true);
    try {
      await debug.testWebSocketConnection(organizationId, apiKey);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🔍 SSE Connection Debugger
          </h1>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization ID
              </label>
              <input
                type="text"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter organization ID..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter API key..."
              />
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={handleTestSSE}
              disabled={isLoading || !organizationId || !apiKey}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : '🔍 Test SSE Endpoints'}
            </button>
            
            <button
              onClick={handleTestWebSocket}
              disabled={isLoading || !organizationId || !apiKey}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Testing...' : '🌐 Test WebSocket'}
            </button>
            
            <button
              onClick={debug.clearLogs}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              🗑️ Clear Logs
            </button>
          </div>

          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Debug Logs ({debug.debugLogs.length})
            </h2>
            
            <div className="h-96 overflow-y-auto font-mono text-sm">
              {debug.debugLogs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No logs yet. Click &quot;Test SSE Endpoints&quot; to start debugging.
                </p>
              ) : (
                debug.debugLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`mb-1 ${
                      log.includes('✅') ? 'text-green-600 dark:text-green-400' :
                      log.includes('❌') ? 'text-red-600 dark:text-red-400' :
                      log.includes('🔍') ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              💡 About This Test
            </h3>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• This will test various SSE endpoint paths to find the correct one</li>
              <li>• It will also test WebSocket connections as an alternative</li>
              <li>• Check the console for additional debug information</li>
              <li>• If SSE is working, we can implement real-time events properly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 