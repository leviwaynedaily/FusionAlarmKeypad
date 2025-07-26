import { NextResponse } from 'next/server';
import { stopBackgroundSSE, getBackgroundSSEStatus } from '@/lib/background-sse';

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
    
    // Background service now auto-starts with server - no manual control needed
    const duration = Date.now() - startTime;
    const status = getBackgroundSSEStatus();
    
    serverDebugLog(`Background SSE: Status request for action '${action}'`, {
      action,
      currentStatus: status?.isRunning ? 'running' : 'stopped',
      duration: `${duration}ms`
    });
    
    return NextResponse.json({
      success: true,
      message: 'Background SSE service runs automatically with server',
      status: status,
      info: 'Service auto-starts when server loads and runs continuously',
      debug: {
        requestId,
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        note: 'Manual start/stop no longer supported - service runs automatically'
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