import { NextResponse } from 'next/server';
import { getBackgroundSSEStatus } from '@/lib/background-sse';
import { supabase } from '@/lib/db';

export async function GET() {
  try {
    // Quick background service check
    const sseStatus = getBackgroundSSEStatus();
    
    // Quick database check - just get the latest event timestamp
    const { data: latestEvent } = await supabase
      .from('events')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    const lastEventTime = latestEvent?.created_at;
    const timeSinceLastEvent = lastEventTime 
      ? Date.now() - new Date(lastEventTime).getTime()
      : null;
    
    // Simple status response
    const status = {
      ok: sseStatus.isRunning,
      backgroundService: sseStatus.isRunning ? 'running' : 'stopped',
      lastEvent: lastEventTime,
      minutesSinceLastEvent: timeSinceLastEvent ? Math.round(timeSinceLastEvent / 1000 / 60) : null,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(status);
    
  } catch (error) {
    return NextResponse.json(
      { 
        ok: false, 
        error: 'Monitor check failed',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
} 