import { NextResponse } from 'next/server';
import { insertEvent, listEvents } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await insertEvent(data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to insert event' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sinceHours = Number(searchParams.get('sinceHours') || '72');
  const type = searchParams.get('type') || undefined;
  const category = searchParams.get('category') || undefined;
  const device = searchParams.get('device') || undefined;
  const limit = Number(searchParams.get('limit') || '200');
  const cursor = searchParams.get('cursor') || undefined;

  try {
    const rows = await listEvents({ sinceHours, type, category, device, limit, cursor });
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
} 