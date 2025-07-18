# Monitoring Setup Guide

## Overview

This guide explains how to monitor your Railway deployment to ensure the background SSE service is running 24/7 and capturing events continuously, even when no one is using the web app.

## 🎯 Built-in Monitoring Features

### 1. System Health Dashboard
Visit `/monitoring` on your deployed app to see real-time system status:
- Background SSE service status
- Database connectivity
- Recent event activity
- System uptime and performance metrics

### 2. Background Service Management
Visit `/background-service` to:
- Start/stop the background service manually
- View service status and statistics
- Monitor reconnection attempts

### 3. Health Check Endpoints

#### Detailed Health Check
```
GET https://your-app.railway.app/api/health
```
Returns comprehensive system status including:
- Background service status
- Database connectivity
- Event processing metrics
- System uptime

#### Simple Monitor Endpoint
```
GET https://your-app.railway.app/api/monitor
```
Returns simplified status perfect for external monitoring:
```json
{
  "ok": true,
  "backgroundService": "running",
  "lastEvent": "2025-01-16T10:30:00Z",
  "minutesSinceLastEvent": 5,
  "timestamp": "2025-01-16T10:35:00Z"
}
```

## 🔔 External Monitoring Setup

### 1. UptimeRobot (Recommended - Free)

1. **Sign up** at [uptimerobot.com](https://uptimerobot.com)
2. **Create a new monitor**:
   - Monitor Type: `HTTP(s)`
   - URL: `https://your-app.railway.app/api/monitor`
   - Monitoring Interval: `5 minutes`
   - Keyword Monitoring: `"ok":true`
3. **Set up alerts**:
   - Email notifications when service goes down
   - Optional: SMS alerts (paid feature)

### 2. StatusCake (Free Tier Available)

1. **Sign up** at [statuscake.com](https://statuscake.com)
2. **Create uptime test**:
   - Test Type: `HTTP`
   - Website URL: `https://your-app.railway.app/api/monitor`
   - Check Rate: `5 minutes`
   - Confirmation: `2 confirmations`
3. **Add contact groups** for notifications

### 3. Pingdom (14-day free trial)

1. **Sign up** at [pingdom.com](https://pingdom.com)
2. **Create new check**:
   - Check Type: `HTTP`
   - URL: `https://your-app.railway.app/api/health`
   - Check Interval: `5 minutes`
3. **Configure alerting** via email/SMS

### 4. Railway Built-in Monitoring

Railway provides deployment monitoring in your dashboard:

1. **View deployment logs**:
   - Go to your Railway project
   - Click on your service
   - Select "Deployments" tab
   - View real-time logs

2. **Set up log alerts** (if available in your plan):
   - Monitor for error patterns
   - Track service restarts

## 📱 Mobile Monitoring

### 1. UptimeRobot Mobile App
- Download the UptimeRobot app
- Get push notifications on your phone
- View status dashboard on mobile

### 2. Custom Status Page
Create a simple status page using the monitoring endpoints:
```html
<!DOCTYPE html>
<html>
<head>
    <title>System Status</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div id="status">Loading...</div>
    <script>
        fetch('/api/monitor')
            .then(r => r.json())
            .then(data => {
                document.getElementById('status').innerHTML = 
                    data.ok ? '✅ System Online' : '❌ System Offline';
            });
    </script>
</body>
</html>
```

## 🚨 Alert Thresholds

### Critical Alerts (Immediate Action Required)
- Background service stopped
- Database connection failed
- Health check endpoint returns 5xx errors
- No events received in last 30 minutes (during expected activity)

### Warning Alerts (Monitor Closely)
- High reconnection attempts (>3 in 10 minutes)
- Slow response times (>5 seconds)
- No events received in last 2 hours

### Info Alerts (Good to Know)
- Service restarted successfully
- Daily uptime report
- Weekly event processing summary

## 📊 Key Metrics to Monitor

### 1. Service Availability
- Background SSE service uptime: Target 99.9%
- API endpoint availability: Target 99.5%
- Database connectivity: Target 99.9%

### 2. Event Processing
- Events processed per hour
- Time since last event
- Event processing errors

### 3. Performance
- API response times
- Memory usage (via Railway dashboard)
- CPU usage (via Railway dashboard)

## 🔧 Troubleshooting Common Issues

### Background Service Not Running
1. Visit `/background-service` and manually start it
2. Check Railway deployment logs for errors
3. Verify environment variables are set correctly
4. Restart the Railway deployment if needed

### No Events Being Processed
1. Check if Fusion API is accessible
2. Verify API key is valid and has correct permissions
3. Check organization ID is correct
4. Review error logs in Railway dashboard

### Database Connection Issues
1. Verify Supabase connection string is correct
2. Check Supabase service status
3. Confirm database tables exist
4. Test database connection from Railway logs

## 📝 Monitoring Checklist

### Daily
- [ ] Check system status dashboard
- [ ] Verify recent events are being processed
- [ ] Review any alert notifications

### Weekly
- [ ] Review uptime statistics
- [ ] Check error logs for patterns
- [ ] Verify backup/monitoring services are working

### Monthly
- [ ] Review monitoring service costs/limits
- [ ] Update monitoring thresholds if needed
- [ ] Test failover procedures

## 🔗 Quick Links

Once deployed, bookmark these URLs (replace `your-app.railway.app`):

- **System Dashboard**: https://your-app.railway.app/monitoring
- **Background Service**: https://your-app.railway.app/background-service
- **Health Check**: https://your-app.railway.app/api/health
- **Simple Monitor**: https://your-app.railway.app/api/monitor
- **Railway Dashboard**: https://railway.app/dashboard

## 💡 Pro Tips

1. **Set up multiple monitoring services** for redundancy
2. **Use different alert channels** (email + SMS + push notifications)
3. **Monitor during known busy periods** to establish baseline metrics
4. **Test your monitoring** by intentionally stopping the service
5. **Document your alert procedures** for quick response
6. **Set up calendar reminders** for monthly monitoring reviews

With this monitoring setup, you'll have complete visibility into your system's health and can be confident that events are being captured 24/7, even when you're not actively using the application. 