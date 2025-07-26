import { NextResponse } from 'next/server';
import { startBackgroundSSE, stopBackgroundSSE, getBackgroundSSEStatus } from '@/lib/background-sse';

// 🔍 Enhanced server-side debugging utility
const serverDebugLog = (message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = '🚀 [Background-SSE-API]';
  
  // Always log server-side for debugging purposes
  const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (data) {
    logMethod(`${prefix} [${timestamp}] ${message}`, data);
  } else {
    logMethod(`${prefix} [${timestamp}] ${message}`);
  }
};

export async function GET(req: Request) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  try {
    // 🔇 QUIET MODE: Only log status changes, not every request
    const status = getBackgroundSSEStatus();
    const duration = Date.now() - startTime;
    
    // Only log if there's an error or significant status change
    const isSignificant = !status?.isRunning || (duration > 100);
    if (isSignificant) {
      serverDebugLog(`📊 Background SSE Status Check`, {
        isRunning: status?.isRunning || false,
        duration: `${duration}ms`,
        requestId
      });
    }

    const response = {
      success: true,
      status,
      debug: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        serverTime: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    
    serverDebugLog(`❌ GET Request ${requestId} failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`
    }, 'error');
    
    console.error('❌ Background SSE Status Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get background SSE status',
        debug: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { action, organizationId, apiKey, timestamp: clientTimestamp, clientInfo } = body;
    
    serverDebugLog(`📡 POST Request ${requestId} started`, {
      url: req.url,
      action,
      organizationId,
      apiKeyLength: apiKey?.length,
      clientTimestamp,
      clientInfo,
      headers: Object.fromEntries(new URLSearchParams(req.headers as any)),
      serverTimestamp: new Date().toISOString()
    });
    
    // Handle manual start/stop actions (service also auto-starts with server)
    const duration = Date.now() - startTime;
    let result;
    let status;

    if (action === 'start') {
      try {
        await startBackgroundSSE({ 
          apiKey: apiKey || process.env.FUSION_API_KEY,
          organizationId: organizationId || process.env.NEXT_PUBLIC_FUSION_ORGANIZATION_ID,
        });
        status = getBackgroundSSEStatus();
        result = {
          success: true,
          message: 'Background SSE service started successfully',
          status: status
        };
        serverDebugLog(`✅ Background SSE service started manually`, { requestId, action });
      } catch (error) {
        status = getBackgroundSSEStatus();
        result = {
          success: false,
          message: `Failed to start service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: status
        };
        serverDebugLog(`❌ Failed to start Background SSE service`, { requestId, action, error }, 'error');
      }
    } else if (action === 'stop') {
      try {
        stopBackgroundSSE();
        status = getBackgroundSSEStatus();
        result = {
          success: true,
          message: 'Background SSE service stopped successfully',
          status: status
        };
        serverDebugLog(`✅ Background SSE service stopped manually`, { requestId, action });
      } catch (error) {
        status = getBackgroundSSEStatus();
        result = {
          success: false,
          message: `Failed to stop service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          status: status
        };
        serverDebugLog(`❌ Failed to stop Background SSE service`, { requestId, action, error }, 'error');
      }
    } else {
      // Unknown action - just return status
      status = getBackgroundSSEStatus();
      result = {
        success: true,
        message: 'Background SSE service status retrieved',
        status: status,
        info: 'Service auto-starts with server and can be manually controlled'
      };
    }
    
    return NextResponse.json({
      ...result,
      debug: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        action,
        currentStatus: status?.isRunning ? 'running' : 'stopped'
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    serverDebugLog(`❌ POST Request ${requestId} failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    }, 'error');
    
    console.error('❌ Background SSE Control Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to control background SSE service',
        debug: {
          requestId,
          timestamp: new Date().toISOString(),
          duration: `${duration}ms`,
          errorType: error instanceof Error ? error.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
} 