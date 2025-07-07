import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

export async function insertEvent(event: any) {
  try {
    await client.execute({
      sql: `INSERT OR IGNORE INTO events (id, event_type, category, device_name, area_name, payload)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      args: [
        event.eventUuid || event.id || `ev-${Date.now()}`,
        event.type,
        event.category,
        event.deviceName,
        event.areaName ?? event.areaId,
        JSON.stringify(event),
      ],
    });
  } catch (err) {
    console.error('[db] insertEvent error', err);
  }
}

interface ListOpts {
  sinceHours?: number;
  type?: string;
  category?: string;
  device?: string;
  limit?: number;
  cursor?: string; // ISO timestamp string
}

export async function listEvents(opts: ListOpts = {}) {
  const {
    sinceHours = 72,
    type,
    category,
    device,
    limit = 200,
    cursor,
  } = opts;

  const params: any[] = [];
  let where = 'received_at >= datetime("now", ?1)';
  params.push(`-${sinceHours} hours`);

  if (type) {
    params.push(type);
    where += ` AND event_type = ?${params.length}`;
  }
  if (category) {
    params.push(category);
    where += ` AND category = ?${params.length}`;
  }
  if (device) {
    params.push(device);
    where += ` AND device_name = ?${params.length}`;
  }
  if (cursor) {
    params.push(cursor);
    where += ` AND received_at < ?${params.length}`;
  }

  params.push(limit);

  const { rows } = await client.execute({
    sql: `SELECT * FROM events WHERE ${where} ORDER BY received_at DESC LIMIT ?${params.length}`,
    args: params,
  });

  return rows as any[];
} 