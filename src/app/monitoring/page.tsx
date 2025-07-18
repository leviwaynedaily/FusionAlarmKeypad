'use client';

import { useState, useEffect } from 'react';

interface HealthData {
  status: string;
  timestamp: string;
  responseTime: string;
  services: {
    backgroundSSE: {
      status: string;
      isRunning: boolean;
      reconnectAttempts: number;
      processedEventsCount: number;
    };
    database: {
      status: string;
      connected: boolean;
      lastEventTime: string | null;
      recentEventCount: number;
      timeSinceLastEvent: string | null;
      isRecentlyActive: boolean;
    };
  };
  overall: {
    healthy: boolean;
    recentlyActive: boolean;
    uptime: string;
  };
  environment: {
    nodeEnv: string;
    platform: string;
    nodeVersion: string;
  };
}

export default function MonitoringPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthData(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHealthData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'unhealthy':
      case 'stopped':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'running':
      case 'connected':
        return '✅';
      case 'unhealthy':
      case 'stopped':
      case 'error':
        return '❌';
      default:
        return '⚠️';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl">Loading monitoring data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">System Monitoring Dashboard</h1>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
            <button
              onClick={fetchHealthData}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        {lastUpdate && (
          <div className="text-sm text-slate-400 mb-6">
            Last updated: {lastUpdate.toLocaleString()}
          </div>
        )}

        {healthData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overall Status */}
            <div className="bg-slate-800/50 rounded-lg p-6 col-span-full">
              <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <span>{getStatusIcon(healthData.status)}</span>
                <span>Overall System Status</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthData.status)}`}>
                    {healthData.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">System Status</div>
                </div>
                <div className="text-center">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                    healthData.overall.recentlyActive ? 'text-green-600 bg-green-100' : 'text-yellow-600 bg-yellow-100'
                  }`}>
                    {healthData.overall.recentlyActive ? 'ACTIVE' : 'QUIET'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Recent Activity</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-white">{healthData.responseTime}</div>
                  <div className="text-xs text-slate-400">Response Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-white">{healthData.overall.uptime}</div>
                  <div className="text-xs text-slate-400">Uptime</div>
                </div>
              </div>
            </div>

            {/* Background SSE Service */}
            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <span>{getStatusIcon(healthData.services.backgroundSSE.status)}</span>
                <span>Background SSE Service</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(healthData.services.backgroundSSE.status)}`}>
                    {healthData.services.backgroundSSE.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Events Processed:</span>
                  <span className="text-white font-medium">{healthData.services.backgroundSSE.processedEventsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reconnect Attempts:</span>
                  <span className="text-white font-medium">{healthData.services.backgroundSSE.reconnectAttempts}</span>
                </div>
              </div>
            </div>

            {/* Database Service */}
            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <span>{getStatusIcon(healthData.services.database.status)}</span>
                <span>Database Service</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(healthData.services.database.status)}`}>
                    {healthData.services.database.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Recent Events:</span>
                  <span className="text-white font-medium">{healthData.services.database.recentEventCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Event:</span>
                  <span className="text-white font-medium">
                    {healthData.services.database.timeSinceLastEvent || 'Never'}
                  </span>
                </div>
              </div>
            </div>

            {/* Environment Info */}
            <div className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Environment</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="text-white font-medium">{healthData.environment.nodeEnv}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Platform:</span>
                  <span className="text-white font-medium">{healthData.environment.platform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Node Version:</span>
                  <span className="text-white font-medium">{healthData.environment.nodeVersion}</span>
                </div>
              </div>
            </div>

            {/* Monitoring URLs */}
            <div className="bg-slate-800/50 rounded-lg p-6 col-span-full">
              <h3 className="text-lg font-semibold mb-4">External Monitoring URLs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-2">Health Check Endpoint (Detailed):</div>
                  <code className="bg-slate-700 px-3 py-2 rounded text-sm block">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.railway.app'}/api/health
                  </code>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-2">Monitor Endpoint (Simple):</div>
                  <code className="bg-slate-700 px-3 py-2 rounded text-sm block">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.railway.app'}/api/monitor
                  </code>
                </div>
              </div>
              <div className="mt-4 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-300 mb-2">💡 External Monitoring Setup</h4>
                <p className="text-sm text-blue-200">
                  Use these URLs with external monitoring services like:
                </p>
                <ul className="text-sm text-blue-200 mt-2 list-disc list-inside">
                                     <li><strong>UptimeRobot</strong> - Monitor every 5 minutes</li>
                   <li><strong>Pingdom</strong> - Check availability and response time</li>
                   <li><strong>StatusCake</strong> - Free tier includes basic monitoring</li>
                   <li><strong>Railway&apos;s built-in monitoring</strong> - Check deployment logs</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 