import { NextResponse } from 'next/server';
import { insertEvent, listEvents } from '@/lib/db';

// 🔥 FIX: Rate limiting to prevent memory bloat
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_EVENTS_PER_MINUTE = 10; // Reduced from unlimited

function isRateLimited(clientId: string): boolean {
  const now = Date.now();
  const clientData = rateLimitMap.get(clientId);
  
  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (clientData.count >= MAX_EVENTS_PER_MINUTE) {
    return true;
  }
  
  clientData.count++;
  return false;
}

// 🔥 FIX: Cleanup old rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW);

export async function POST(req: Request) {
  try {
    // 🔥 FIX: Rate limiting based on IP
    const clientId = req.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(clientId)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const data = await req.json();
    
    // 🔥 FIX: Validate and sanitize data to prevent memory bloat
    if (!data.type || !data.timestamp) {
      return NextResponse.json({ error: 'Invalid event data' }, { status: 400 });
    }

    // 🔥 Multi-tenant: Ensure organizationId is provided
    if (!data.organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    await insertEvent(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Event storage error:', err);
    return NextResponse.json({ error: 'Failed to insert event' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  
  // 🔥 Multi-tenant: organizationId is required
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId parameter is required' }, { status: 400 });
  }

  const locationId = searchParams.get('locationId') || undefined;
  const sinceHours = Math.min(Number(searchParams.get('sinceHours') || '24'), 72); // 🔥 FIX: Cap at 72 hours
  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const device = searchParams.get('device') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 100); // 🔥 FIX: Cap at 100 events
  const offset = Number(searchParams.get('offset') || '0');

  try {
    const rows = await listEvents({ 
      organizationId,
      locationId,
      sinceHours, 
      type, 
      category, 
      device, 
      limit, 
      offset 
    });
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Event retrieval error:', err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
} 