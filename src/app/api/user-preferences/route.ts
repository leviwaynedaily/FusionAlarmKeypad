import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const locationId = searchParams.get('locationId');
    const userId = searchParams.get('userId') || 'default';

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('location_id', locationId || null)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error fetching user preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({ 
      data: data ? {
        eventFilterSettings: data.event_filter_settings,
        customEventNames: data.custom_event_names,
        temperatureUnit: data.temperature_unit || 'fahrenheit',
        armingDelaySeconds: data.arming_delay_seconds || 20
      } : null 
    });
  } catch (err) {
    console.error('User preferences fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      organizationId, 
      locationId, 
      userId = 'default',
      eventFilterSettings, 
      customEventNames,
      temperatureUnit = 'fahrenheit',
      armingDelaySeconds = 20
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    if (!eventFilterSettings) {
      return NextResponse.json({ error: 'eventFilterSettings is required' }, { status: 400 });
    }

    const preferenceData = {
      organization_id: organizationId,
      location_id: locationId || null,
      user_id: userId,
      event_filter_settings: eventFilterSettings,
      custom_event_names: customEventNames || {},
      temperature_unit: temperatureUnit,
      arming_delay_seconds: armingDelaySeconds,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(preferenceData, {
        onConflict: 'organization_id,user_id,location_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving user preferences:', error);
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    console.error('User preferences save error:', err);
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 });
  }
} 