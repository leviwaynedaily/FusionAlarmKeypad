# 🚀 Supabase Events Database Setup

Simple multi-tenant events storage for Fusion Alarm Keypad.

## Quick Setup (5 minutes)

### 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for setup to complete (~2 minutes)

### 2. Setup Database Schema
1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the entire contents of `migrations/supabase_schema.sql`
3. Click **Run**

### 3. Get Your Keys
1. In Supabase dashboard, go to **Settings** > **API**
2. Copy your:
   - **Project URL** 
   - **anon/public API key**

### 4. Add Environment Variables

#### For Local Development (.env.local):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

#### For Railway Deployment:
Add these variables in your Railway dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Install Dependencies
```bash
npm install @supabase/supabase-js
```

## 🏗️ Database Structure

The database automatically organizes events by:
```
Organization ID → Location ID → Events
```

### Example API Usage:

**Store Event:**
```typescript
POST /api/events
{
  "organizationId": "org-123",
  "locationId": "loc-456", 
  "type": "door_opened",
  "deviceName": "Front Door",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Get Events:**
```
GET /api/events?organizationId=org-123&locationId=loc-456&sinceHours=24
```

## 🔒 Security Features

- ✅ **Row Level Security** enabled
- ✅ **Multi-tenant isolation** by organization
- ✅ **Rate limiting** (10 events/minute)
- ✅ **Automatic cleanup** of old events
- ✅ **No large payloads** stored (performance optimized)

## 🚀 Performance Features

- ✅ **Optimized indexes** for fast queries
- ✅ **Automatic pagination** support
- ✅ **Time-based partitioning** ready
- ✅ **Memory-efficient** event storage

## 🛠️ Maintenance

The database includes helper functions for cleanup:

```typescript
// Clean up events older than 30 days
await cleanupOldEvents(30);

// Get recent events for an organization
await getRecentEvents('org-123', 'loc-456', 20);
```

## 📊 Dashboard Queries

You can run these queries in Supabase SQL Editor:

```sql
-- See all organizations
SELECT DISTINCT organization_id, COUNT(*) as event_count 
FROM fusion_events 
GROUP BY organization_id;

-- Events by type (last 24 hours)
SELECT event_type, COUNT(*) as count
FROM fusion_events 
WHERE received_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;

-- Most active devices
SELECT device_name, organization_id, COUNT(*) as event_count
FROM fusion_events 
WHERE received_at >= NOW() - INTERVAL '7 days'
GROUP BY device_name, organization_id
ORDER BY event_count DESC
LIMIT 10;
```

That's it! Your events database is ready. 🎉 