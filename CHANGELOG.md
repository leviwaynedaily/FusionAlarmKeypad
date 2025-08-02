# Changelog

All notable changes to the Fusion Alarm Keypad project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.1] - 2025-01-08

### 🔧 Enhanced
- **Clean Dashboard View**: Removed live events thumbnails from main authenticated dashboard
  - Eliminates event thumbnail carousel from top of dashboard when logged in
  - Improves focus on core alarm zone controls
  - Event thumbnails still accessible via dedicated Events page and mobile view
  - Creates cleaner, less cluttered main interface

## [1.6.0] - 2025-01-08

### ✨ Added
- **Responsive Event Details Modal**: Complete redesign of event details interface
  - Two-column grid layout on desktop (2/3 details, 1/3 image/actions)
  - Dedicated lightbox modal for full-size image viewing
  - Separate tabbed modal for raw data exploration (Event Type, Complete Event, Raw Data)
  - InfoRow component for consistent key-value pair display throughout

### 🎨 UI/UX Improvements
- **Compact Single-Screen Design**: All event details now fit on one screen without scrolling
- **Enhanced Content Organization**: Logical groupings for better information hierarchy
  - Event Details (action, state, battery, object type, confidence)
  - Location & Device (device, space, location, device ID, system)
  - Technical Details (track ID, resource ID, analytics engine, category/type IDs)
- **Improved Dark Mode**: Consistent Tailwind color scheme with proper contrast ratios
- **Better Visual Hierarchy**: Modern button styling, hover states, and typography
- **Mobile-First Responsive**: Seamless experience across all device sizes

### 🔧 Enhanced
- **Image Viewing Experience**: Thumbnail with click-to-expand functionality
- **Raw Data Access**: Clean, organized modal with tabbed interface
- **Performance Optimization**: Reduced DOM complexity and improved rendering
- **Accessibility**: Better focus management and keyboard navigation

## [1.5.0] - 2025-01-08

### ✨ Added
- **Automatic Weather Refresh**: Weather now updates every 10 minutes in the background
  - No more stale weather data during long sessions
  - Automatic refresh starts when location is available with postal code
  - Proper interval cleanup prevents memory leaks
  - Console logging for debugging auto-refresh cycles

### 🐛 Fixed
- **Weather Loading Timing Issue**: Fixed weather not loading on initial page load
  - Added dedicated useEffect to watch for location availability
  - Weather now loads immediately when `alarmKeypad.selectedLocation` becomes available
  - Eliminated timing race condition between location loading and weather API calls

### 🔧 Enhanced
- **Weather Display Cleanup**: Removed duplicate weather displays
  - Weather now appears ONLY in header across all layouts
  - Removed redundant weather widgets from main content areas
  - Cleaner, less cluttered interface

## [1.4.0] - 2025-01-08

### ✨ Added
- **Comprehensive weather system enhancement across all views**
  - Weather display now appears in header across ALL layouts (mobile, tablet, desktop, VisionPro)
  - Temperature unit toggle (Celsius/Fahrenheit) in settings with visual toggle switch
  - Immediate weather loading with postal code detection
  - Persistent temperature unit preferences stored in database
  - Smart temperature conversion utilities in useWeather hook

### 🔧 Enhanced
- **Header component** - Now displays weather consistently across all device types
- **WeatherWidget component** - Added temperature unit support with responsive design
- **Settings modal** - Added temperature unit toggle with clear UI indicators
- **All layout components** - Enhanced to pass weather data to header component
- **User preferences API** - Extended to store temperature unit preference

### 📦 Database Changes
- Added `temperature_unit` column to `user_preferences` table
- Created migration `006_add_temperature_unit.sql` for database schema update

### 🎨 UI/UX Improvements
- Compact weather display in header with weather icon and temperature
- Responsive design across all device sizes
- Seamless integration with existing design system
- Real-time temperature conversion between units

## [Previous Versions]

Previous changelog entries to be added when available.