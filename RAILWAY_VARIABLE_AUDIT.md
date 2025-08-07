# 🚨 Railway Environment Variables Audit & Fix

## Issue Found: Cross-Contamination Between Deployments

The application was using **hard-coded fallback values** that caused your second Railway deployment to pull events and images from the first platform. This has been **FIXED**.

## ✅ What Was Fixed

### 1. Removed Hard-Coded Fallback Values
**File:** `src/lib/background-sse.ts`
- **Before:** Hard-coded API key and Organization ID fallbacks
- **After:** Only uses Railway environment variables (no fallbacks)
- **Impact:** Prevents cross-contamination between deployments

### 2. Fixed Environment Variable Names
**File:** `src/app/api/background-sse/route.ts`
- **Before:** `process.env.FUSION_API_KEY` (incorrect)
- **After:** `process.env.NEXT_PUBLIC_FUSION_API_KEY` (correct)

### 3. Added Validation
- Background SSE service now **validates** all required environment variables
- Will **fail gracefully** with clear error messages if variables are missing
- Prevents service from starting with incomplete configuration

## 🔧 Required Railway Environment Variables

### For Each Deployment (Building A & Building B)

Set these in Railway Dashboard → Your Project → Variables:

#### **Core Fusion API Variables (REQUIRED)**
```env
NEXT_PUBLIC_FUSION_BASE_URL=https://your-fusion-bridge-url.up.railway.app
NEXT_PUBLIC_FUSION_API_KEY=your_building_specific_api_key
NEXT_PUBLIC_FUSION_ORGANIZATION_ID=your_building_specific_org_id
```

#### **Supabase Variables (REQUIRED for event storage)**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### **Optional Variables**
```env
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_WEATHER_API_KEY=your_openweather_api_key
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_google_analytics_id
NEXT_PUBLIC_MAX_REQUESTS_PER_MINUTE=20
NEXT_PUBLIC_ENABLE_DEBUG_LOGS=false
```

## 🎯 Critical Points for Multiple Buildings

### 1. **Unique API Keys Per Building**
- Each building deployment MUST have its own `NEXT_PUBLIC_FUSION_API_KEY`
- Each building deployment MUST have its own `NEXT_PUBLIC_FUSION_ORGANIZATION_ID`
- These should come from your Fusion API provider

### 2. **Shared vs Separate Supabase**
You have two options:

#### Option A: Shared Supabase (Recommended)
- Use the **same** Supabase URL and key for both buildings
- Events are automatically separated by `organization_id`
- Easier maintenance, single database

#### Option B: Separate Supabase
- Each building has its own Supabase project
- Complete isolation between buildings
- More complex to maintain

### 3. **Base URL Configuration**
- If using the same Fusion Bridge instance: Use same `NEXT_PUBLIC_FUSION_BASE_URL`
- If separate instances: Each building has its own Bridge URL

## 🛠️ How to Verify Your Setup

### 1. Check Railway Variables
In each Railway deployment:
1. Go to Railway Dashboard
2. Select your project 
3. Go to **Variables** tab
4. Verify all required variables are set
5. Ensure variables are **different** between Building A and Building B

### 2. Test Background SSE Service
1. Deploy the updated code
2. Go to `/background-service` page
3. Check the status - should show:
   - ✅ Connected to correct endpoint
   - ✅ Processing events
   - ✅ No errors about missing variables

### 3. Test Event Collection
1. Trigger an event in each building
2. Go to `/events` page 
3. Verify events show correct building-specific content
4. Check images are from the correct cameras

### 4. Debug Page
1. Go to `/sse-debug` page
2. Test SSE connection
3. Should connect to building-specific API endpoint
4. Should receive building-specific events

## 🚨 Migration Steps

### Immediate Actions Required:

1. **Redeploy Both Applications**
   ```bash
   # This will pick up the fixes
   git push origin production
   ```

2. **Verify Environment Variables**
   - Check Railway Dashboard for both deployments
   - Ensure each has unique API keys and Organization IDs
   - Test that variables are actually set

3. **Monitor Event Collection**
   - Watch `/background-service` page for a few minutes
   - Verify events are building-specific
   - Check image thumbnails are correct

4. **Clear Browser Cache** (if needed)
   - Clear localStorage: `localStorage.clear()`
   - Hard refresh pages

## 🔍 Troubleshooting

### If Still Seeing Wrong Events:

1. **Check Railway Logs**
   ```
   Look for: "❌ Background SSE: Missing required Railway environment variables"
   ```

2. **Verify API Key Scope**
   - Ensure API keys are scoped to correct building/organization
   - Test API key manually with Fusion API

3. **Check Supabase Data**
   - Look at `organization_id` field in events table
   - Should match your `NEXT_PUBLIC_FUSION_ORGANIZATION_ID`

4. **Force SSE Restart**
   - Go to `/background-service`
   - Stop and Start the service
   - Should pick up new environment variables

## ✅ Success Indicators

Your setup is working correctly when:

- ✅ Background SSE service shows "Connected" status
- ✅ Events page shows building-specific events only
- ✅ Camera thumbnails are from correct building
- ✅ No "missing variables" errors in console
- ✅ Different alarm zones shown for each building

## 📞 Support

If you still see cross-contamination after these fixes:
1. Check Railway environment variables are actually set
2. Verify API keys are building-specific  
3. Redeploy to ensure code changes are live
4. Monitor application logs for configuration errors
