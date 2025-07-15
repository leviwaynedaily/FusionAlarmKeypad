import { NextRequest, NextResponse } from 'next/server';
import { analytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';

// Store active connections
const activeConnections = new Set<ReadableStreamDefaultController>();

// Function to broadcast events to all connected clients
export function broadcastEvent(event: any) {
  const eventData = `data: ${JSON.stringify(event)}\n\n`;
  
  // Send to all active connections
  activeConnections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(eventData));
    } catch (error) {
      // Connection closed, remove it
      activeConnections.delete(controller);
    }
  });
}

export async function GET(request: NextRequest) {
  const requestId = `live-sse-${Date.now()}`;
  
  logger.info(`🔴 [Live-SSE] ${requestId} - Client connecting to live events stream`);
  
  try {
    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Add connection to active set
        activeConnections.add(controller);
        
        // Send initial connection message
        const welcomeMessage = `data: ${JSON.stringify({ 
          type: 'connected', 
          message: 'Live events stream connected',
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcomeMessage));
        
        // Send heartbeat every 30 seconds
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({ 
              type: 'heartbeat', 
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(heartbeat));
          } catch (error) {
            clearInterval(heartbeatInterval);
            activeConnections.delete(controller);
          }
        }, 30000);
        
        // Cleanup when connection closes
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval);
          activeConnections.delete(controller);
          logger.info(`🔴 [Live-SSE] ${requestId} - Client disconnected`);
        });
      },
      
      cancel(controller) {
        activeConnections.delete(controller);
        logger.info(`🔴 [Live-SSE] ${requestId} - Stream cancelled`);
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    logger.error(`❌ [Live-SSE] ${requestId} - Error setting up stream:`, error);
    return NextResponse.json({ error: 'Failed to setup live events stream' }, { status: 500 });
  }
} 