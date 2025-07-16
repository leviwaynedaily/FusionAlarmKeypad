# Database Setup for Event Filter Settings

This document explains how to set up the database table needed for persistent event filter settings.

## Overview

The event filter settings (which event types to display/hide) are now saved to a Supabase database table called `user_preferences`. This ensures your settings persist across:
- ✅ App redeployments on Railway
- ✅ Browser refreshes 
- ✅ Different devices
- ✅ Per-location preferences

## Database Table Structure

The `user_preferences` table stores:
- `organization_id` - Your organization ID
- `location_id` - Specific location (can be null for global settings)
- `user_id` - User identifier (currently "default")
- `event_filter_settings` - JSON object with your toggle preferences
- `custom_event_names` - Custom names for events (future use)

## Setup Instructions

### Option 1: Automatic Setup (Recommended)

If you have Supabase environment variables configured in Railway:

```bash
cd migrations
node setup_user_preferences.js
```

### Option 2: Manual Setup via Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `migrations/003_user_preferences.sql`
5. Click **Run** to execute the migration

### Option 3: Check Current Setup

To verify if the table exists:

```bash
cd migrations
node check_schema.js
```

## Environment Variables Required

Make sure these are set in your Railway environment:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How It Works

1. **When you toggle event settings**: Settings save to both localStorage (backup) and database
2. **When app loads**: Settings load from database first, fallback to localStorage
3. **Per-location**: Each location can have different event filter preferences
4. **Fallback strategy**: If database is unavailable, localStorage is used

## Troubleshooting

### "Missing Supabase credentials" error
- Check that environment variables are set in Railway dashboard
- Verify your Supabase project URL and anon key are correct

### "Cannot create table" error  
- The anonymous key might not have table creation permissions
- Use Option 2 (Manual Setup) via Supabase dashboard

### Settings not persisting
- Check browser console for any database save errors
- Verify the `user_preferences` table exists in Supabase
- Settings will still work via localStorage as fallback

## Migration File

The migration is located at: `migrations/003_user_preferences.sql`

This creates:
- `user_preferences` table with proper indexes
- Row Level Security policies
- Automatic timestamp updates

## Testing

After setup, you can test by:
1. Go to alarm keypad settings
2. Toggle an event type on/off
3. Refresh the page
4. Verify the toggle state persisted

The console will show whether settings loaded from database or localStorage.