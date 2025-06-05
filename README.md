# Fusion Alarm Keypad

A responsive, PIN-authenticated alarm keypad web application built to interface with the Fusion platform. This production-ready app allows users to arm/disarm areas, view device states, and manage security systems through an intuitive touch interface.

## ✨ Features

- 🔐 **API Key and PIN authentication**
- 📍 **Location selection and management** 
- 🏠 **Area control** (arm/disarm/stay/bypass)
- 📱 **Device status monitoring** with real-time updates
- 🌤️ **Weather integration** with OpenWeatherMap
- 📊 **Event history** (coming soon)
- 🔧 **Automation tracking** (coming soon)
- 📱 **Responsive design** optimized for tablets and touch devices
- 🌙 **Dark/Light theme** with system preference detection
- ⚡ **Production-ready** with optimized logging and error handling
- 🛡️ **Error boundaries** for graceful error handling
- 🚀 **PWA support** with offline capabilities

## 🚀 Quick Start

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/levidaily/FusionAlarmKeypad.git
cd FusionAlarmKeypad
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env.local` file in the root directory:
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://fusion-bridge-production.up.railway.app
NEXT_PUBLIC_APP_ENV=production

# Default API Keys (Optional - can be set in UI instead)
NEXT_PUBLIC_FUSION_API_KEY=your_fusion_api_key_here
NEXT_PUBLIC_WEATHER_API_KEY=your_openweathermap_api_key_here

# Performance & Rate Limiting
NEXT_PUBLIC_MAX_REQUESTS_PER_MINUTE=20

# Node Environment (set to production for deployment)
NODE_ENV=production
```

4. **Start development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🚀 Production Deployment

### Pre-Deployment Checklist

1. **Environment Variables**: Ensure all required environment variables are set
2. **API Keys**: Use environment variables instead of hardcoded values
3. **Build Test**: Run `npm run prod:build` to verify production build
4. **Security**: Review and update API keys if needed

### Production Build

```bash
# Clean build with type checking and linting
npm run prod:build

# Start production server
npm run start:prod
```

### Bundle Analysis

```bash
npm run build:analyze
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Fusion API base URL | No | `https://fusion-bridge-production.up.railway.app` |
| `NEXT_PUBLIC_FUSION_API_KEY` | Default Fusion API key | No | Empty (user enters in UI) |
| `NEXT_PUBLIC_WEATHER_API_KEY` | Default OpenWeatherMap API key | No | Empty (user enters in UI) |
| `NEXT_PUBLIC_MAX_REQUESTS_PER_MINUTE` | API rate limiting | No | `20` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN | No | Empty (monitoring disabled) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics measurement ID | No | Empty (analytics disabled) |
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | Custom analytics endpoint | No | Empty (uses GA/Sentry only) |
| `NODE_ENV` | Node environment | No | `development` |

### Monitoring & Analytics Setup

#### Sentry Error Monitoring
1. Create a [Sentry](https://sentry.io) account
2. Create a new project for your app
3. Copy the DSN and set `NEXT_PUBLIC_SENTRY_DSN`
4. Errors and performance data will be automatically tracked

#### Google Analytics
1. Create a [Google Analytics 4](https://analytics.google.com) property
2. Get your Measurement ID (starts with G-)
3. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID`
4. User interactions and page views will be tracked

#### Custom Analytics
- Set `NEXT_PUBLIC_ANALYTICS_ENDPOINT` to send events to your own analytics service
- Events are sent as JSON POST requests with detailed metadata

## 📁 Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── page.tsx           # API key entry page
│   ├── location/          # Location selection
│   ├── pin/              # PIN entry
│   ├── dashboard/        # Main dashboard
│   ├── devices/          # Device status
│   ├── events/           # Event history
│   └── automations/      # Automation tracking
├── components/            # Reusable components
│   ├── AreaCard.tsx      # Area control card
│   ├── WeatherWidget.tsx # Weather display
│   ├── PinPad.tsx        # PIN input pad
│   └── TabNav.tsx        # Navigation tabs
└── lib/                  # Utility functions
    ├── api.ts            # API wrapper
    └── weather.ts        # Weather API integration
```

## API Integration

The application integrates with the Fusion platform API:

- Base URL: `https://fusion-bridge-production.up.railway.app/`
- Authentication: API Key and PIN
- Endpoints:
  - `/api/admin/api-keys/test` - Validate API key
  - `/api/alarm/keypad/validate-pin` - Validate PIN
  - `/api/locations` - Get available locations
  - `/api/areas` - Get and control areas
  - `/api/devices` - Get device status
  - `/api/events` - Get event history

## Weather Integration

The application uses OpenWeatherMap API to display current weather conditions based on the selected location's postal code.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

The project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for styling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
