const WEATHER_API_KEY = process.env.NEXT_PUBLIC_WEATHER_API_KEY;

export interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
}

export const getWeather = async (postalCode: string): Promise<WeatherData | null> => {
  // Try to get API key from localStorage first, then fall back to env variable
  const apiKey = typeof window !== 'undefined' 
    ? localStorage.getItem('weather_api_key') || WEATHER_API_KEY
    : WEATHER_API_KEY;
    
  if (!apiKey) {
    // Weather API key not found
    return null;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?zip=${postalCode},US&appid=${apiKey}&units=imperial`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
    };
  } catch (error) {
    // Error fetching weather data
    return null;
  }
}; 