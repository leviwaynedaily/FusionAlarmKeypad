# 🎛️ Event Filtering Enhancement - Unknown Events & Image Control

## New Features Added

### 1. 🔍 **Unknown Event Toggle**
- **Purpose**: Filter out unrecognized or unknown event types
- **Default**: `OFF` (unknown events are hidden by default)
- **Logic**: Hides events with:
  - No event type
  - Event type = "unknown"
  - Event type contains "unknown"
  - No category or category = "unknown"

### 2. 📸 **Image-Based Filtering**
Two complementary toggles for controlling event display based on image availability:

#### **Show Only Events With Images**
- **Purpose**: Display only events that have images/thumbnails
- **Default**: `OFF` (shows all events regardless of images)
- **Logic**: Hides events without base64 images, thumbnails, or image URLs

#### **Hide Events Without Images**
- **Purpose**: Alternative way to achieve the same effect
- **Default**: `OFF` (shows events without images)
- **Logic**: Same filtering as above but with different wording

**Note**: These two toggles are mutually exclusive - enabling one disables the other.

## 🎯 Use Cases

### **Cleaning Up Unknown Events**
- Toggle **"Show Unknown Events" OFF** to hide:
  - Unrecognized device events
  - Malformed events from SSE stream
  - Events with missing type information
  - Events categorized as "unknown"

### **Image-Only Timeline**
- Toggle **"Show Only Events With Images" ON** to see:
  - Only camera events with thumbnails
  - Motion detection events with images
  - Security alerts with visual evidence
  - Hide all text-only events (door locks, alarms without cameras)

### **Clean Visual Timeline**
- Toggle **"Hide Events Without Images" ON** for:
  - Cleaner event timeline focused on visual events
  - Better UX when images are available
  - Reduced clutter from non-visual events

## 🔧 Implementation Details

### **Interface Updates**
- `EventFilterSettings` interface enhanced with:
  ```typescript
  showUnknownEvents: boolean;
  showOnlyEventsWithImages: boolean;
  hideEventsWithoutImages: boolean;
  ```

### **UI Components Updated**
- **Event Timeline Management Page**: New toggle controls added
- **LiveEventsTicker**: Filtering logic updated
- **EventsGridSlide**: Filtering logic updated
- **useAlarmKeypad Hook**: Default settings updated

### **Detection Logic**

#### **Unknown Event Detection**
```typescript
const isUnknownEvent = !eventType || 
                       eventType === 'unknown' || 
                       eventType.includes('unknown') || 
                       !event.category || 
                       event.category === 'unknown';
```

#### **Image Detection**
```typescript
const hasImage = !!(event.imageUrl || 
                   event.thumbnail || 
                   event.thumbnailData?.data || 
                   event.event_data?.imageUrl || 
                   event.event_data?.thumbnail);
```

### **Debug Logging**
Added console logs for filtered events:
- `🚫 LiveEventsTicker: Hiding unknown event`
- `🚫 LiveEventsTicker: Hiding event without image`
- `🚫 EventsGridSlide: Hiding unknown event`
- `🚫 EventsGridSlide: Hiding event without image`

## 📍 Location in UI

**Path**: Main Menu → Events → Event Timeline Management  
**Section**: Global Controls (top of page)

New toggles appear under "Show All Events":
1. **Show Unknown Events** - with description "Events with unrecognized types"
2. **Show Only Events With Images** - with description "Hide events without images/thumbnails"  
3. **Hide Events Without Images** - with description "Alternative to above - same effect"

## 🔄 Settings Persistence

- Settings automatically save to localStorage
- Settings sync to Supabase database (if configured)
- Settings restore on page reload/app restart
- Per-location settings supported

## 🎨 User Experience

### **Before Enhancement**:
- All events displayed regardless of type recognition
- Events without images still shown (empty placeholders)
- Timeline cluttered with unknown/unrecognized events

### **After Enhancement**:
- Clean timeline with only recognized events (when "Show Unknown Events" is OFF)
- Visual-only timeline possible (when image filtering is ON)
- User control over event density and content type
- Better focus on actionable security events

## 🚀 Benefits

1. **Cleaner UI**: Hide irrelevant or malformed events
2. **Better Focus**: Show only events that matter to the user
3. **Visual Timeline**: Create image-only event streams for better visual monitoring
4. **Reduced Noise**: Filter out unknown events that may be system artifacts
5. **Flexible Control**: Multiple filtering options to suit different use cases

## 📊 Default Behavior

**New Installations**:
- Show Unknown Events: `OFF` (cleaner by default)
- Show Only Events With Images: `OFF` (show all events)
- Hide Events Without Images: `OFF` (show all events)

This provides a clean experience by default while allowing users to customize based on their needs.
