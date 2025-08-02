# Changelog

All notable changes to the Fusion Alarm Keypad project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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