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

3. **Start development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

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
