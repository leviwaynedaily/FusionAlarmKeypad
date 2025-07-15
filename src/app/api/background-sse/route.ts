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
    
    switch (action) {
      case 'start':
        serverDebugLog(`🚀 POST Request ${requestId} - Starting background SSE service...`, {
          organizationId,
          apiKeyProvided: !!apiKey,
          apiKeyLength: apiKey?.length
        });
        
        await startBackgroundSSE();
        
        const startStatus = getBackgroundSSEStatus();
        const startDuration = Date.now() - startTime;
        
        serverDebugLog(`✅ POST Request ${requestId} - Background SSE service started`, {
          status: startStatus,
          duration: `${startDuration}ms`,
          wasSuccessful: startStatus?.isRunning || false
        });
        
        const startResponse = {
          success: true,
          message: 'Background SSE service started',
          status: startStatus,
          debug: {
            requestId,
            action: 'start',
            timestamp: new Date().toISOString(),
            duration: `${startDuration}ms`,
            clientTimestamp,
            organizationId,
            apiKeyLength: apiKey?.length
          }
        };
        
        return NextResponse.json(startResponse);
        
      case 'stop':
        serverDebugLog(`🛑 POST Request ${requestId} - Stopping background SSE service...`);
        
        stopBackgroundSSE();
        
        const stopStatus = getBackgroundSSEStatus();
        const stopDuration = Date.now() - startTime;
        
        serverDebugLog(`✅ POST Request ${requestId} - Background SSE service stopped`, {
          status: stopStatus,
          duration: `${stopDuration}ms`,
          wasStopped: !stopStatus?.isRunning
        });
        
        const stopResponse = {
          success: true,
          message: 'Background SSE service stopped',
          status: stopStatus,
          debug: {
            requestId,
            action: 'stop',
            timestamp: new Date().toISOString(),
            duration: `${stopDuration}ms`
          }
        };
        
        return NextResponse.json(stopResponse);
        
      default:
        const invalidDuration = Date.now() - startTime;
        
        serverDebugLog(`❌ POST Request ${requestId} - Invalid action`, {
          action,
          validActions: ['start', 'stop'],
          duration: `${invalidDuration}ms`
        }, 'warn');
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Use "start" or "stop"',
            debug: {
              requestId,
              timestamp: new Date().toISOString(),
              duration: `${invalidDuration}ms`,
              providedAction: action,
              validActions: ['start', 'stop']
            }
          },
          { status: 400 }
        );
    }
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