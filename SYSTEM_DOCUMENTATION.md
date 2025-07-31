# Fusion Alarm Keypad - System Documentation

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Real-Time Event System](#real-time-event-system)
4. [Authentication Flow](#authentication-flow)
5. [API Integration](#api-integration)
6. [Key Components](#key-components)
7. [Development Setup](#development-setup)
8. [Troubleshooting](#troubleshooting)
9. [Event Types](#event-types)
10. [Deployment](#deployment)

---

## 🎯 System Overview

The Fusion Alarm Keypad is a modern web-based security system interface that provides:

- **Real-time security zone control** (arm/disarm alarm zones)
- **Live event monitoring** (camera events, security alerts)
- **PIN-based authentication** 
- **Multi-location support**
- **Mobile-responsive design**
- **SSE-based real-time updates** (no polling)

### Key Features

- ✅ **Real-time alarm zone status updates** via Server-Sent Events (SSE)
- ✅ **24/7 background event processing** (independent of UI)
- ✅ **Live camera feed previews** with event thumbnails
- ✅ **Multi-zone security management** (perimeter, garage, interior, etc.)
- ✅ **Debug mode** for development and troubleshooting
- ✅ **Progressive Web App (PWA)** capabilities

---

## 🏗️ Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Fusion API    │    │  Background     │    │   Frontend      │
│   (External)    │◄──►│  SSE Service    │◄──►│   React App     │
│                 │    │  (Server-side)  │    │   (Browser)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │               ┌─────────────────┐             │
         │               │   Supabase      │             │
         └──────────────►│   Database      │◄────────────┘
                         │   (Events)      │
                         └─────────────────┘
```

### Data Flow

1. **Fusion API** → sends real-time events via SSE
2. **Background SSE Service** → captures events 24/7, stores in database
3. **Background Service** → broadcasts events to connected frontends
4. **Frontend** → receives events, updates UI immediately
5. **Frontend** → sends commands back to Fusion API (arm/disarm)

---

## 🚀 Real-Time Event System

### Event Flow Architecture

The real-time system uses a **dual-SSE architecture**:

#### 1. Background SSE Service (`src/lib/background-sse.ts`)
- **Runs 24/7 on server** (independent of UI)
- **Connects to Fusion API SSE stream**: `https://fusion-bridge-production.up.railway.app/api/events/stream`
- **Captures all events** (camera, alarm zones, device status)
- **Stores events in Supabase database** for persistence
- **Broadcasts events to frontend** via internal SSE

#### 2. Frontend SSE Connection (`src/hooks/useSSE.ts`)
- **Connects to internal SSE stream**: `/api/events/live`
- **Receives real-time events** from background service
- **Triggers UI updates** immediately (no page refresh)
- **Handles event filtering** based on user preferences

### Event Types Supported

#### Alarm Zone Events
```json
{
  "type": "arming",
  "alarmZone": {
    "id": "39ffed74-7a15-48cf-b7fd-8db6b733e6fc",
    "name": "Garage",
    "currentState": "DISARMED", 
    "previousState": "ARMED",
    "locationId": "e86d5cbc-6923-4e61-a354-2ac4ecef4141",
    "locationName": "Daily House"
  },
  "timestamp": "2025-07-30T18:15:13.265Z"
}
```

#### Camera/Device Events
```json
{
  "type": "intrusion detected",
  "deviceName": "Driveway 180",
  "category": "camera",
  "spaceName": "Driveway",
  "imageUrl": "data:image/jpeg;base64,...",
  "timestamp": "2025-07-30T18:20:45.123Z"
}
```

### Event Detection Logic

**Alarm Zone Event Detection** (`src/lib/background-sse.ts`):
```javascript
const isAlarmZoneEvent = 
  eventData.type?.toLowerCase().includes('arming') ||  // Real Fusion events
  eventData.type?.toLowerCase().includes('armed') ||   // Legacy
  eventData.type?.toLowerCase().includes('disarmed') ||
  rawEvent.alarmZone;  // Direct alarm zone events
```

**Frontend Event Processing** (`src/hooks/useAlarmKeypad.ts`):
```javascript
// Direct alarm zone events (Real Fusion format)
if (eventDetail.isDirectAlarmZoneEvent && eventDetail.alarmZoneId) {
  setAlarmZones(prev => prev.map(zone => {
    if (zone.id === alarmZoneId) {
      return { ...zone, armedState: currentState };
    }
    return zone;
  }));
}
```

---

## 🔐 Authentication Flow

### PIN Authentication Process

1. **User enters 6-digit PIN** on keypad interface
2. **Frontend calls** `validatePin(pin)` → Fusion API
3. **API validates PIN** against user database
4. **Returns user info** if valid (name, permissions)
5. **Frontend stores auth state** and shows dashboard
6. **Session persists** until logout or timeout

### API Integration

**Authentication Endpoint**:
```javascript
const result = await validatePin(pin);
// Returns: { valid: true, userName: "John Doe" }
```

**API Key Management**:
- API key stored in environment: `NEXT_PUBLIC_FUSION_API_KEY`
- Automatically included in all API requests
- Can be updated via Settings modal

---

## 🔧 Key Components

### Core Hooks

#### `useAlarmKeypad.ts`
- **Manages alarm zone state** and operations
- **Handles location/space data** loading
- **Processes real-time alarm zone updates**
- **Manages device state** synchronization

#### `useSSE.ts` 
- **Manages SSE connections** to background service
- **Processes incoming events** and dispatches to handlers
- **Maintains recent events list** for timeline display
- **Handles connection retry logic**

#### `useAuthentication.ts`
- **Manages PIN entry state** and validation
- **Handles user authentication flow**
- **Manages session state** and logout

### Core Components

#### `src/app/page.tsx`
- **Main application entry point**
- **Renders appropriate layout** (mobile/desktop/VisionPro)
- **Handles PIN vs dashboard state**
- **Manages global settings**

#### `src/components/layouts/`
- **DesktopLayout.tsx**: Traditional desktop interface
- **MobileLayout.tsx**: Mobile-optimized keypad
- **VisionProLayout.tsx**: Apple Vision Pro interface
- **TestDesignLayout.tsx**: Experimental designs

#### `src/components/ui/LiveEventsTicker.tsx`
- **Real-time event timeline** display
- **Event filtering** and categorization
- **Camera thumbnail** integration
- **Event type icons** and formatting

### API Layer

#### `src/lib/api.ts`
- **Core API functions** (validatePin, getAlarmZones, etc.)
- **Type definitions** for all data structures
- **Error handling** and response parsing

#### `src/lib/api-optimized.ts`
- **Cached API operations** for performance
- **Batch requests** to reduce API calls
- **Smart caching strategies** with TTL

---

## 🛠️ Development Setup

### Environment Variables

Create `.env.local`:
```bash
NEXT_PUBLIC_FUSION_API_KEY=your_fusion_api_key_here
NEXT_PUBLIC_WEATHER_API_KEY=your_weather_api_key_here
NEXT_PUBLIC_FUSION_ORGANIZATION_ID=your_org_id_here

# Supabase (for event storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

### Debug Mode

**Enable in UI**: Settings → Debug Mode → Toggle On

**What it shows**:
- 📡 SSE connection logs
- 🔒 Alarm zone event processing
- 🔍 Event filtering and formatting
- 📊 Background service status
- ⚡ Performance metrics

### Test Functions (Development)

Available in browser console when debug mode enabled:

```javascript
// Test alarm zone events
testDirectAlarmZoneArmed("Garage", "zone-id")
testDirectAlarmZoneDisarmed("Perimeter")

// Test legacy device events  
testAlarmZoneArmed("Device Name", "Space Name")
testAlarmZoneDisarmed("Device Name", "Space Name")
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Alarm Zones Not Updating Real-Time

**Symptoms**: Manual refresh required to see zone status changes

**Debug Steps**:
1. Enable Debug Mode in Settings
2. Arm/disarm zone in Fusion platform
3. Check console for these logs:
   ```
   📡 SSE: Received live event: {type: "arming", ...}
   🔒 SSE: Alarm zone event detected: {...}
   🔒 Processing direct alarm zone event: {...}
   🔒 Successfully updated alarm zone "Garage" to DISARMED
   ```

**Common Causes**:
- SSE connection broken (no `📡 SSE:` logs)
- Event filtering issues (events received but not processed)
- Alarm zone ID mismatch (wrong zone being updated)

#### 2. No Events in Console

**Symptoms**: No SSE events visible in browser console

**Debug Steps**:
1. Check SSE endpoint: `/api/events/live`
2. Verify background service: `/api/background-sse`
3. Test manual SSE connection:
   ```javascript
   const test = new EventSource('/api/events/live');
   test.onmessage = (e) => console.log('Event:', e.data);
   ```

#### 3. Authentication Issues

**Symptoms**: PIN not working, API errors

**Debug Steps**:
1. Check API key in environment variables
2. Verify Fusion API connectivity
3. Check browser network tab for failed requests
4. Validate PIN format (6 digits)

### API Endpoint Testing

```bash
# Test background SSE service
curl https://alarm.getfusion.io/api/background-sse

# Test live events stream
curl -N -H "Accept: text/event-stream" https://alarm.getfusion.io/api/events/live

# Test alarm zones API
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://fusion-bridge-production.up.railway.app/api/alarm-zones?locationId=LOCATION_ID
```

---

## 📊 Event Types

### Alarm Zone Events

| Event Type | Description | Real-time Update |
|------------|-------------|------------------|
| `arming` | Zone armed/disarmed | ✅ Immediate |
| `triggered` | Zone triggered/alarm | ✅ Immediate |
| `bypass` | Zone bypassed | ✅ Immediate |

### Camera Events

| Event Type | Description | Timeline Display |
|------------|-------------|------------------|
| `intrusion detected` | Motion/person detected | ✅ With thumbnail |
| `vehicle detected` | Vehicle in driveway | ✅ With thumbnail |
| `person detected` | Person detected | ✅ With thumbnail |

### Device Events

| Event Type | Description | System Impact |
|------------|-------------|---------------|
| `offline` | Device disconnected | ⚠️ Health warning |
| `low battery` | Battery level low | ⚠️ Maintenance alert |
| `tamper` | Device tampered | 🚨 Security alert |

---

## 🚀 Deployment

### Railway Deployment

The application is deployed on Railway with automatic deployments from the `production` branch.

**Deployment URL**: https://alarm.getfusion.io

**Deployment Process**:
1. Push to `production` branch
2. Railway automatically builds and deploys
3. Background SSE service starts automatically
4. Frontend connects to live SSE stream

### Environment Configuration

**Production Environment Variables**:
- Set in Railway dashboard
- Include all required API keys
- Supabase configuration for event storage

### Health Monitoring

**Background Service Health**: `/api/background-sse`
```json
{
  "success": true,
  "status": {
    "isRunning": true,
    "uptime": 3600,
    "eventsProcessed": 1250,
    "lastEventTime": 1625097600000,
    "connectionState": "connected"
  }
}
```

**Live Events Debug**: `/sse-debug`
- Real-time event monitoring
- Event structure inspection
- Connection status verification

---

## 🔗 Related Documentation

- [Database Setup](DATABASE_SETUP.md)
- [Performance Optimization](PERFORMANCE_OPTIMIZATION.md)
- [Production Deployment](PRODUCTION.md)
- [Monitoring Setup](MONITORING_SETUP.md)

---

## 📝 Recent Fixes & Improvements

### Real-Time Alarm Zone Updates (July 2025)

**Issue**: Alarm zone status not updating in real-time when changed in Fusion platform

**Root Cause**: Event filtering logic excluded alarm zone events because they have `deviceName: null`

**Solution**: Enhanced event filtering to allow alarm zone events through SSE pipeline

**Key Changes**:
- Updated `background-sse.ts` to detect Fusion `"arming"` events
- Modified `useSSE.ts` to process events without device names
- Enhanced `useAlarmKeypad.ts` to handle direct zone updates by ID

**Result**: ✅ Immediate alarm zone status updates without page refresh

---

*Last Updated: July 30, 2025*
*Version: 2.1.0*