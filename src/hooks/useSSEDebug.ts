"use client";

import { useState } from 'react';

export function useSSEDebug() {
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log('🔍 SSE Debug:', logMessage);
    setDebugLogs(prev => [logMessage, ...prev].slice(0, 20)); // Keep last 20 logs
  };

  const clearLogs = () => {
    setDebugLogs([]);
  };

  const testSSEConnection = async (organizationId: string, apiKey: string) => {
    addLog('Starting SSE connection test...');
    
    if (!apiKey) {
      addLog('❌ ERROR: No API key provided');
      return;
    }

    addLog(`✅ API Key: ${apiKey.substring(0, 10)}...`);
    addLog('ℹ️  Organization is implicit in API key scope');

    // Test 1: Check if the base API works
    try {
      addLog('🔍 TEST 1: Testing base API endpoint...');
      const baseUrl = process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io';
      const testResponse = await fetch(`${baseUrl}/api/admin/api-keys/test`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      addLog(`🔍 Base API Status: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.ok) {
        addLog('✅ Base API connection works');
        const data = await testResponse.text();
        addLog(`📋 API Response: ${data.substring(0, 200)}...`);
      } else {
        addLog(`❌ Base API failed: ${testResponse.status}`);
        return;
      }
    } catch (error) {
      addLog(`❌ Base API error: ${error instanceof Error ? error.message : error}`);
      return;
    }

    // Test 2: Try different SSE endpoint paths
    const sseEndpoints = [
      '/api/events/stream',
      '/api/events/sse',
      '/api/sse/events',
      '/events/stream',
      '/stream',
      '/sse'
    ];

    for (const endpoint of sseEndpoints) {
      try {
        addLog(`🔍 TEST 2: Trying SSE endpoint: ${endpoint}`);
        
        const url = new URL(endpoint, process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io');
        // No organizationId needed - it's implicit in the API key scope
        
        addLog(`🔗 Full URL: ${url.toString()}`);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'x-api-key': apiKey,
            'Cache-Control': 'no-cache'
          }
        });

        addLog(`📊 ${endpoint} - Status: ${response.status} ${response.statusText}`);
        addLog(`📊 Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

        if (response.ok) {
          addLog(`✅ FOUND WORKING SSE ENDPOINT: ${endpoint}`);
          
          // Try to read a bit of the stream
          const reader = response.body?.getReader();
          if (reader) {
            try {
              const { value } = await reader.read();
              const text = new TextDecoder().decode(value);
              addLog(`📋 SSE Stream Sample: ${text.substring(0, 200)}...`);
              reader.releaseLock();
            } catch (readError) {
              addLog(`📋 SSE Stream read error: ${readError}`);
            }
          }
          
          return endpoint; // Return the working endpoint
        } else if (response.status === 404) {
          addLog(`❌ ${endpoint} - 404 Not Found`);
        } else {
          addLog(`❌ ${endpoint} - Error: ${response.status}`);
          const errorText = await response.text();
          addLog(`📋 Error response: ${errorText.substring(0, 200)}...`);
        }
      } catch (error) {
        addLog(`❌ ${endpoint} - Exception: ${error instanceof Error ? error.message : error}`);
      }
    }

    addLog('❌ No working SSE endpoints found');
    return null;
  };

  const testWebSocketConnection = async (organizationId: string, apiKey: string) => {
    addLog('🔍 Testing WebSocket connection as SSE alternative...');
    
    const wsEndpoints = [
      `wss://${(process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io').replace('https://', '')}/ws`,
      `wss://${(process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io').replace('https://', '')}/websocket`,
      `wss://${(process.env.NEXT_PUBLIC_FUSION_BASE_URL || 'https://app.getfusion.io').replace('https://', '')}/events/ws`
    ];

    for (const wsUrl of wsEndpoints) {
      try {
        addLog(`🔍 Trying WebSocket: ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          addLog(`✅ WebSocket connected: ${wsUrl}`);
          ws.send(JSON.stringify({ 
            type: 'auth', 
            apiKey
          }));
        };

        ws.onmessage = (event) => {
          addLog(`📨 WebSocket message: ${event.data.substring(0, 200)}...`);
        };

        ws.onerror = (error) => {
          addLog(`❌ WebSocket error: ${error}`);
        };

        // Close after 5 seconds
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            addLog(`✅ WebSocket ${wsUrl} is working!`);
          }
          ws.close();
        }, 5000);

      } catch (error) {
        addLog(`❌ WebSocket ${wsUrl} failed: ${error}`);
      }
    }
  };

  return {
    debugLogs,
    addLog,
    clearLogs,
    testSSEConnection,
    testWebSocketConnection
  };
} 