// Utility functions for alarm keypad functionality

// Format relative time
export const formatRelativeTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

// Update clock time and date
export const updateClock = () => {
  const now = new Date();
  const use24Hour = typeof window !== 'undefined' && localStorage.getItem('use_24_hour') === 'true';
  const timeString = now.toLocaleTimeString('en-US', {
    hour12: !use24Hour,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return { timeString, dateString };
};

// Check if device is mobile
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const width = window.innerWidth;
  const isMobile = width <= 1024; // Use 1024px as breakpoint for mobile/tablet
  console.log(`[isMobileDevice] width: ${width}, isMobile: ${isMobile}`);
  return isMobile;
};

// Get weather style based on condition
export const getWeatherStyle = (condition: string) => {
  const cond = condition.toLowerCase();
  
  if (cond.includes('clear') || cond.includes('sunny')) {
    return {
      bg: 'bg-gradient-to-br from-gray-800 to-gray-900',
      icon: '☀️',
      text: 'text-gray-100'
    };
  } else if (cond.includes('cloud') || cond.includes('overcast')) {
    return {
      bg: 'bg-gradient-to-br from-gray-400 to-gray-600',
      icon: '☁️',
      text: 'text-gray-100'
    };
  } else if (cond.includes('rain') || cond.includes('drizzle')) {
    return {
      bg: 'bg-gradient-to-br from-gray-700 to-gray-900',
      icon: '🌧️',
      text: 'text-gray-100'
    };
  } else if (cond.includes('snow') || cond.includes('sleet')) {
    return {
      bg: 'bg-gradient-to-br from-gray-600 to-gray-800',
      icon: '❄️',
      text: 'text-gray-100'
    };
  } else if (cond.includes('thunder') || cond.includes('storm')) {
    return {
      bg: 'bg-gradient-to-br from-purple-600 to-purple-800',
      icon: '⛈️',
      text: 'text-purple-100'
    };
  } else if (cond.includes('fog') || cond.includes('mist')) {
    return {
      bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
      icon: '🌫️',
      text: 'text-gray-100'
    };
  } else {
    return {
      bg: 'bg-gradient-to-br from-gray-500 to-gray-700',
      icon: '🌤️',
      text: 'text-gray-100'
    };
  }
};

// Validate PIN format
export const validatePinFormat = (pin: string) => {
  return /^\d{6}$/.test(pin);
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}; 