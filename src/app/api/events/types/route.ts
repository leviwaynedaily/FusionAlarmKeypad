import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  
  // 🔥 Multi-tenant: organizationId is required
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organizationId parameter is required' }, { status: 400 });
  }

  const locationId = searchParams.get('locationId') || undefined;
  const sinceHours = Math.min(Number(searchParams.get('sinceHours') || '168'), 168); // Default to 7 days, max 7 days

  try {
    // Build query to get unique event types with counts
    let query = supabase
      .from('fusion_events')
      .select('event_type, category, device_name')
      .eq('organization_id', organizationId)
      .gte('received_at', new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString())
      .not('event_type', 'is', null)
      .not('event_type', 'eq', '')
      .not('device_name', 'is', null)
      .not('device_name', 'eq', '');

    // Add optional location filter
    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[db] getEventTypes error:', error);
      return NextResponse.json({ error: 'Failed to fetch event types' }, { status: 500 });
    }

    // Group and count event types
    const eventTypeCounts: Record<string, { 
      count: number; 
      category: string | null; 
      sampleDevices: string[];
      displayName: string;
      icon: string;
    }> = {};

    (data || []).forEach((event: any) => {
      const eventType = event.event_type;
      const category = event.category;
      const deviceName = event.device_name;

      if (!eventTypeCounts[eventType]) {
        eventTypeCounts[eventType] = {
          count: 0,
          category: category,
          sampleDevices: [],
          displayName: formatEventTypeDisplayName(eventType),
          icon: getEventTypeIcon(eventType, category)
        };
      }

      eventTypeCounts[eventType].count++;
      
      // Add sample device names (max 3)
      if (deviceName && !eventTypeCounts[eventType].sampleDevices.includes(deviceName)) {
        if (eventTypeCounts[eventType].sampleDevices.length < 3) {
          eventTypeCounts[eventType].sampleDevices.push(deviceName);
        }
      }
    });

    // Convert to array and sort by count
    const eventTypes = Object.entries(eventTypeCounts)
      .map(([eventType, data]) => ({
        eventType,
        ...data
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ eventTypes });

  } catch (err) {
    console.error('Event types retrieval error:', err);
    return NextResponse.json({ error: 'Failed to fetch event types' }, { status: 500 });
  }
}

// Helper function to format event type names for display
function formatEventTypeDisplayName(eventType: string): string {
  // Convert snake_case to Title Case
  return eventType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Helper function to get appropriate icon for event type
function getEventTypeIcon(eventType: string, category: string | null): string {
  const type = eventType.toLowerCase();
  const cat = (category || '').toLowerCase();

  // Security events
  if (type.includes('armed') || type.includes('disarmed') || cat.includes('security')) {
    return '🔒';
  }
  
  // Door events
  if (type.includes('door')) {
    if (type.includes('open')) return '🚪';
    if (type.includes('close')) return '🚪';
    return '🚪';
  }

  // Lock events
  if (type.includes('lock')) {
    if (type.includes('unlock')) return '🔓';
    return '🔒';
  }

  // Light events
  if (type.includes('light') || type.includes('lamp') || type.includes('bulb')) {
    return '💡';
  }

  // Motion events
  if (type.includes('motion') || type.includes('occupancy')) {
    return '🚶';
  }

  // Camera events
  if (type.includes('camera') || cat.includes('camera')) {
    return '📹';
  }

  // Alarm events
  if (type.includes('alarm') || type.includes('triggered')) {
    return '🚨';
  }

  // System events
  if (type.includes('heartbeat') || type.includes('connection') || type.includes('system')) {
    return '⚙️';
  }

  // Sensor events
  if (type.includes('sensor') || type.includes('detect')) {
    return '📡';
  }

  // Default
  return '🔔';
} 