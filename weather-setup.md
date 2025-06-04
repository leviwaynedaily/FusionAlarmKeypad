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

## Features

- Displays current temperature in Fahrenheit
- Shows weather condition (Clear, Cloudy, Rain, etc.)
- Weather icon for visual representation
- Updates automatically every 10 minutes
- Uses location's postal code for accurate local weather

## Troubleshooting

- **No weather showing?** Make sure you've entered a valid API key
- **Wrong location?** Weather is based on the postal code of your selected location
- **API limits?** Free tier allows 60 calls/minute and 1,000,000 calls/month

## Privacy Note

The weather API key is stored locally in your browser and is never sent to our servers. Weather data is fetched directly from OpenWeatherMap. 