import { createClient } from '@supabase/supabase-js';
import { Event } from './api';

// Supabase client for events database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

console.log('🔍 Supabase configuration:', {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` : 'NOT_SET',
  hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

interface StoredEvent {
  id: string;
  organization_id: string;
  location_id: string | null;
  space_id: string | null;
  device_id: string | null;
  event_type: string;
  category: string | null;
  device_name: string | null;
  space_name: string | null;
  event_timestamp: string | null;
  display_state: string | null;
  event_data: Record<string, any> | null;
  raw_event_data: Record<string, any> | null;
  received_at: string;
}

function mapStoredEventToApiEvent(event: StoredEvent): Event {
  return {
    id: parseInt(event.id) || 0,
    eventUuid: `local-${event.id}`,
    deviceId: event.device_id || '',
    deviceName: event.device_name || '',
    connectorId: '',
    connectorName: '',
    connectorCategory: '',
    spaceId: event.space_id || '',
    spaceName: event.space_name || '',
    alarmZoneId: '',
    alarmZoneName: '',
    locationId: event.location_id || '',
    locationName: '',
    timestamp: event.event_timestamp ? new Date(event.event_timestamp).getTime() : Date.now(),
    eventCategory: event.category || '',
    eventType: event.event_type,
    eventSubtype: '',
    payload: event.event_data || {},
    rawPayload: event.raw_event_data || event.event_data || {}, // Use raw event data as rawPayload
    deviceTypeInfo: {
      deviceType: '',
      category: '',
      displayName: '',
      supportedFeatures: []
    },
    displayState: event.display_state ?? undefined,
    rawEventType: event.event_type
  };
}

export interface EventData {
  id?: string;
  organization_id: string;
  location_id?: string;
  space_id?: string;
  device_id?: string;
  event_type: string;
  category?: string;
  device_name?: string;
  space_name?: string;
  event_timestamp?: string;
  display_state?: string;
  event_data?: Record<string, any>;
  raw_event_data?: Record<string, any>;
  caption?: string;
}

export async function insertEvent(event: any, rawEvent?: any) {
  try {
    // 🔥 Multi-tenant structure with organization + location
    const eventData: EventData = {
      organization_id: event.organizationId || 'unknown',
      location_id: event.locationId,
      space_id: event.spaceId,
      device_id: event.deviceId,
      event_type: event.type || 'unknown',
      category: event.category,
      device_name: event.deviceName,
      space_name: event.spaceName,
      event_timestamp: event.timestamp || new Date().toISOString(),
      display_state: event.displayState,
      event_data: {
        ...event,
        // Use the already processed imageUrl (extracted from various possible sources)
        imageUrl: event.imageUrl,
      },
      raw_event_data: rawEvent || null, // Store complete unmodified SSE JSON
      caption: event.caption // Store caption for detection type display
    };

    const { error } = await supabase
      .from('fusion_events')
      .insert([eventData]);

    if (error) {
      console.error('[db] insertEvent error:', error);
    } else {
      console.log('[db] Successfully inserted event:', event.deviceName);
    }
  } catch (err) {
    console.error('[db] insertEvent exception:', err);
  }
}

interface ListOpts {
  organizationId: string; // 🔥 Required for multi-tenancy
  locationId?: string;
  sinceHours?: number;
  type?: string;
  category?: string;
  device?: string;
  limit?: number;
  offset?: number;
}

export async function listEvents(opts: ListOpts) {
  const {
    organizationId,
    locationId,
    sinceHours = 24, // 🔥 Default to 24 hours for performance
    type,
    category,
    device,
    limit = 50, // 🔥 Smaller default limit
    offset = 0,
  } = opts;

  try {
    let query = supabase
      .from('fusion_events')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('received_at', new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString())
      .order('received_at', { ascending: false });

    // Add optional filters
    if (locationId) {
      query = query.eq('location_id', locationId);
    }
    if (type) {
      query = query.eq('event_type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (device) {
      query = query.eq('device_name', device);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('[db] listEvents error:', error);
      return [];
    }

    console.log('[db] Successfully retrieved', (data || []).length, 'events');
    
    // Map database fields to client-expected format and extract image data
    const mappedEvents = (data || []).map(event => ({
      id: event.id,
      deviceName: event.device_name,
      type: event.event_type,
      category: event.category,
      timestamp: event.event_timestamp,
      displayState: event.display_state,
      areaName: event.area_name,
      organizationId: event.organization_id,
      locationId: event.location_id,
      // Extract image data from event_data field
      imageUrl: event.event_data?.imageUrl,
      thumbnailData: event.event_data?.thumbnailData,
      thumbnail: event.event_data?.thumbnail,
      // Include original event_data for additional info
      eventData: event.event_data,
      // Include caption for detection type display
      caption: event.caption,
      // Include raw database fields for compatibility
      ...event
    }));
    
    return mappedEvents;
  } catch (err) {
    console.error('[db] listEvents exception:', err);
    return [];
  }
}

// 🔥 Helper function to get recent events for an organization
export async function getRecentEvents(organizationId: string, locationId?: string, limit: number = 20) {
  return listEvents({
    organizationId,
    locationId,
    sinceHours: 24,
    limit
  });
}

// 🔥 Helper function to get events by type for dashboard
export async function getEventsByType(organizationId: string, eventType: string, sinceHours: number = 24) {
  return listEvents({
    organizationId,
    type: eventType,
    sinceHours,
    limit: 100
  });
}

// 🔥 Helper function to clean up old events (call this periodically)
export async function cleanupOldEvents(olderThanDays: number = 30) {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('fusion_events')
      .delete()
      .lt('received_at', cutoffDate);

    if (error) {
      console.error('[db] cleanupOldEvents error:', error);
    } else {
      console.log(`[db] Cleaned up events older than ${olderThanDays} days`);
    }
  } catch (err) {
    console.error('[db] cleanupOldEvents exception:', err);
  }
} 