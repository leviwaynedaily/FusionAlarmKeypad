# 🔒 Location Filtering Fix - Cross-Location Event Display

## Issue Identified
Events from other locations were briefly appearing in the UI before disappearing after page refresh.

## Root Cause
The application had **two different event sources** with **inconsistent location filtering**:

1. **Database Queries** (after refresh): ✅ Properly filtered by `locationId`
2. **Real-time SSE Events** (live): ❌ **NO location filtering**

This caused events from other locations to appear temporarily until the UI refreshed from the database.

## ✅ Fix Applied

### 1. Fixed Database Event Loading (`src/hooks/useSSE.ts`)
**Before:**
```typescript
const response = await fetch(`/api/events?limit=200&sinceHours=72&organizationId=${organizationId}`);
```

**After:**
```typescript
// Get selected location from localStorage
const storedLocation = localStorage.getItem('selected_location') || 
                      localStorage.getItem('fusion_selected_location');
const locationData = JSON.parse(storedLocation);
const locationId = locationData.id || '';

// Include locationId in API call
const apiUrl = `/api/events?limit=200&sinceHours=72&organizationId=${organizationId}${locationId ? `&locationId=${locationId}` : ''}`;
const response = await fetch(apiUrl);
```

### 2. Added Defensive Location Filtering in UI Components

#### `src/components/ui/LiveEventsTicker.tsx`
```typescript
// Added at start of filteredEvents filter
if (event.locationId && selectedLocationId && event.locationId !== selectedLocationId) {
  return false; // Filter out events from different locations
}
```

#### `src/components/ui/EventsGridSlide.tsx`
```typescript
// Added same location filtering logic
if (event.locationId && selectedLocationId && event.locationId !== selectedLocationId) {
  return false; // Filter out events from different locations
}
```

## 🎯 Expected Behavior After Fix

### ✅ Correct Behavior:
- **Only events from the selected location** should appear
- **Real-time events** should be filtered by location immediately
- **Database events** should be filtered by location  
- **No cross-location contamination** at any time

### 🚨 If Cross-Location Events Still Appear:
1. Check that `locationId` is properly stored in localStorage
2. Verify events in database have correct `location_id` field
3. Check browser console for location filtering debug logs
4. Ensure the SSE background service is collecting events with proper `locationId`

## 🔍 Debugging

### Console Logs to Watch For:
```
🔍 SSE: Filtering events for location: [Location Name] ID: [Location ID]
🔒 LiveEventsTicker: Filtering out event from different location: {...}
🔒 EventsGridSlide: Filtering out event from different location: {...}
```

### Check Current Location:
```javascript
// In browser console:
localStorage.getItem('selected_location')
localStorage.getItem('fusion_selected_location')
```

### Verify Event Location IDs:
```javascript
// Check recent events in SSE hook
console.log('Recent events with location IDs:', 
  sse.recentEvents.map(e => ({ 
    device: e.deviceName, 
    locationId: e.locationId 
  }))
);
```

## 🛠️ Technical Details

### Multiple Location Storage Keys
The app uses different localStorage keys for compatibility:
- `selected_location` - Main location storage
- `fusion_selected_location` - Alternative storage  
- `selected_location_id` - Just the ID

The fix checks both keys to ensure compatibility.

### Event Sources
1. **Initial Load**: Database query with `locationId` filter
2. **Real-time Updates**: SSE events with UI-level location filtering
3. **Background Service**: Collects all events, UI filters by location

### Database Schema
Events are stored with:
- `organization_id` - Building/organization
- `location_id` - Specific location within building  
- Other event data...

## ✅ Validation Steps

1. **Deploy the fix** to both Railway environments
2. **Select a location** in the UI
3. **Trigger events** in different locations (if possible)
4. **Verify only selected location events** appear in:
   - Live events ticker
   - Events grid page
   - Events timeline
5. **Refresh the page** - should show same events (no change)
6. **Switch locations** - should immediately show different events

The fix ensures **complete location isolation** in the UI, preventing any cross-location event display.
