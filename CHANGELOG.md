# Changelog

All notable changes to the Fusion Alarm Keypad project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.3] - 2025-01-08

### 🎛️ Event Display Settings Integration
- **Smart Event Filtering**: Recent events grid now respects Event Display Settings
  - Apply same filtering logic as LiveEventsTicker for consistency
  - Individual event type toggles (highest priority filtering)
  - Alarm zone specific filtering (showOnlyAlarmZoneEvents)
  - Selected alarm zones filtering for precise control
  - Space events filtering (showSpaceEvents toggle)
  - "Show All Events" fallback setting support
- **Real-time Filter Updates**: Events automatically filter when settings change
- **Filtered Event Count**: Dashboard shows filtered count with "(filtered)" indicator
- **Comprehensive Filter Logic**: Handles all event categories and edge cases
- **Maintain Event Intelligence**: Filtered events preserve detailed parsing and smart icons

### 🔧 Technical Enhancements
- **getAlarmZoneForEvent Helper**: Accurately detect events from alarm zone devices
- **useMemo Optimization**: Efficient event filtering with proper dependency tracking
- **Consistent API**: Same filtering behavior across all event displays
- **Legacy Support**: Backward compatibility with existing event type settings

## [1.7.2] - 2025-01-08

### 📊 Complete Event Coverage
- **Show ALL Events**: Grid now displays complete event history, not just camera events
  - Removed image-only filtering to show comprehensive system activity
  - Display total event count instead of "events with images"
  - Include all system events: heartbeat, connection, state changes, etc.

### 🎨 Smart Visual System
- **Intelligent Event Icons**: Color-coded icons for events without camera images
  - 🔒 Red lock icon for intrusion/security events
  - ⚡ Orange lightning for motion detection events
  - 🔄 Blue arrows for device state changes
  - ❤️ Green heart for heartbeat/check-in events
  - 📶 Purple wifi for connection events
  - ✨ Gray sparkles for unknown event types
- **Gradient Placeholder Backgrounds**: Professional backgrounds for non-camera events
- **Unified Grid Experience**: Seamless mix of camera images and smart icons

### 🔧 Enhanced Functionality
- **EventDetailsModal Integration**: Click any event (image or icon) for full details
- **Consistent Information Display**: Same detailed parsing for all event types
- **Responsive Design**: Optimized layout works with mixed content types
- **Improved Empty States**: Updated messaging for comprehensive event coverage

## [1.7.1] - 2025-01-08

### 🔍 Enhanced Event Intelligence
- **Detailed Event Information in Grid**: Events now show precise detection details
  - "Vehicle Detected", "Person Detected", "Animal Detected" labels
  - Extract object detection information from event caption fields
  - Parse JSON event types for comprehensive event analysis
  - Support device-specific information (battery levels, state changes)
  - Intelligent event categorization with fallback logic

### 📊 Improved Data Consistency
- **Unified Event Display**: Grid and thumbnail events show identical information
  - Sophisticated event parsing logic imported from LiveEventsTicker
  - Primary and secondary label system for enhanced information hierarchy
  - Consistent EventDetailsModal data when clicking on any event
  - Proper handling of intrusion detection, state changes, and device check-ins

### 🎨 Enhanced Visual Information
- **Better Information Architecture**: Clear separation of event details
  - Device name prominently displayed
  - Primary label (e.g., "Intrusion Detected") with visual emphasis
  - Secondary label (e.g., "Vehicle Detected") with supporting detail
  - Responsive design maintains clarity across all screen sizes

## [1.7.0] - 2025-01-08

### ✨ Added
- **Carousel Navigation System**: Revolutionary swipe-based interface for events access
  - Horizontal carousel replacing separate page navigation
  - Smooth touch and mouse gesture support with 300ms CSS transitions
  - Swipe threshold recognition (20% swipe distance) for intuitive navigation
  - Two-slide carousel: Main Dashboard → Events Grid
  - Pagination dots with active slide indicator
  - Visual swipe hints with animated arrows and instructional text
  - EventsGridSlide component for embedded events viewing

### 🎨 UI/UX Revolution
- **App-Like Navigation**: Seamless horizontal sliding between dashboard and events
  - Replace "View All →" button with "Swipe left →" action card
  - Eliminate page transitions for fluid user experience
  - Maintain all responsive design across mobile, tablet, and desktop
  - Preserve full events grid functionality within carousel context
  - Back navigation from events grid to dashboard via gesture or button
  - Real-time visual feedback during drag/swipe operations

### 🔧 Technical Excellence
- **Advanced Gesture Recognition**: Support both touch and mouse interactions
  - Touch events (touchstart, touchmove, touchend) for mobile devices
  - Mouse events (mousedown, mousemove, mouseup) for desktop
  - Carousel state management with translateX positioning
  - Proper event cleanup on mouse leave to prevent stuck states
  - Threshold-based slide changes with smooth snap-back animations

### 🚀 Performance Optimizations
- **Efficient Rendering**: Events grid embedded directly in carousel slide
  - Eliminate separate page loads and routing overhead
  - Maintain existing EventDetailsModal integration
  - CSS transform-based animations for 60fps performance
  - Flex-shrink-0 slides for proper carousel width management

## [1.6.3] - 2025-01-08

### ✨ Added
- **Events Grid Page**: Complete responsive events gallery with thumbnail navigation
  - New `/events-grid` route with dedicated events visualization
  - Responsive grid layout: 2-8 columns based on screen size (6-8 events per row on tablet)
  - Events preview section in authenticated dashboard with 4 thumbnail slots
  - Elegant "swipe to view" navigation card with visual indicators
  - Event count display and smooth hover transitions
  - Direct integration with EventDetailsModal for full event viewing

### 🎨 UI/UX Improvements
- **Dashboard Navigation Enhancement**: New events access point in authenticated view
  - Preview thumbnails showing most recent events with images
  - Swipe-style action card with gradient background and animations
  - Smart empty state handling for missing event thumbnails
  - Visual event count indicators
- **Events Grid Features**: Professional gallery experience
  - Hover overlays showing device name and event type
  - Time badges on thumbnails (relative format: "2h ago", "Just now")
  - Proper back navigation with Next.js router
  - Filter to show only events with camera images
  - Sort by timestamp (newest events first)

### 🔧 Enhanced
- **TypeScript Improvements**: Better type safety for event timestamp handling
- **Router Integration**: Proper Next.js navigation throughout the app
- **Responsive Design**: Optimized layout for all device sizes
- **Performance**: Efficient event filtering and sorting

## [1.6.2] - 2025-01-08

### ✨ Added
- **Device Status Checking Before Zone Arming**: Complete pre-arming security validation system
  - Automatically checks all devices in a zone before allowing arming
  - Detects open doors, windows, sensors, and unlocked locks
  - Identifies offline devices, low battery devices, and tamper alerts
  - Displays clear warning modal with device-specific issue descriptions
  - Provides "Arm Anyway" option for user override with confirmation
  - Only validates when arming zones (not when disarming)
  - Smart device type detection (door, window, sensor, lock) for accurate messaging

### 🎨 UI/UX Improvements
- **ZoneWarningModal**: Professional warning interface with amber color scheme
  - Clear categorization of device issues with warning icons
  - Detailed device status descriptions (e.g., "Front Door: Door is open")
  - Informational note about security effectiveness
  - Intuitive Cancel/Arm Anyway button options
- **Enhanced Security Flow**: Users are informed about potential security gaps before arming

### 🔧 Enhanced
- **Device Detection Patterns**: Comprehensive state checking for various device types
  - Open states: 'open', 'opened', 'on'
  - Unlock states: regex pattern matching for 'unlock' variations
  - Motion detection: 'motion', 'detected', 'active' states
  - Offline detection: 'offline' status checking
- **Analytics Integration**: Device warning events tracked for system monitoring

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