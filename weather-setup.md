# Weather Display Setup

The Fusion Alarm panel can display current weather information for your location. This requires a free API key from OpenWeatherMap.

## Setup Instructions

1. **Get a Free API Key**
   - Go to [OpenWeatherMap](https://openweathermap.org/api)
   - Click "Sign Up" and create a free account
   - After signing in, go to "API keys" in your account
   - Copy your default API key or generate a new one

2. **Add API Key to Fusion Alarm**
   - Open Fusion Alarm and log in
   - Click the Settings icon (gear) in the top right
   - Scroll to the "Weather API" section
   - Paste your OpenWeatherMap API key
   - The weather should appear in the header within a few seconds

3. **Configure Temperature Unit (Optional)**
   - In the Settings modal, find the "Temperature Unit" setting
   - Toggle between Fahrenheit (°F) and Celsius (°C)
   - Your preference is automatically saved and applied immediately

## Features

- **Universal Display**: Weather appears in the header across ALL views (mobile, tablet, desktop, VisionPro)
- **Temperature Units**: Choose between Fahrenheit (°F) and Celsius (°C) in settings
- **Smart Location Detection**: Automatically uses your selected location's postal code
- **Real-time Updates**: Weather refreshes automatically every 10 minutes in the background
- **Visual Weather Icons**: Clear icons representing current weather conditions
- **Responsive Design**: Compact display that works on all device sizes
- **Persistent Preferences**: Temperature unit choice is saved across sessions

## Troubleshooting

- **No weather showing?** Make sure you've entered a valid API key and selected a location with a postal code
- **Wrong location?** Weather is based on the postal code of your selected location
- **Temperature in wrong unit?** Check the Temperature Unit setting in Settings
- **API limits?** Free tier allows 60 calls/minute and 1,000,000 calls/month
- **Weather not updating?** Try refreshing the page or check your internet connection

## Privacy Note

The weather API key is stored locally in your browser and is never sent to our servers. Weather data is fetched directly from OpenWeatherMap. 