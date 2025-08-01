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

// Responsive breakpoint detection
export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  
  let deviceType: 'mobile' | 'tablet' | 'desktop';
  
  // Mobile: Small phones to large phones  
  if (width <= 767) {
    deviceType = 'mobile';
  }
  // Tablet: iPad Mini to iPad Pro 13"
  else if (width >= 768 && width <= 1199) {
    deviceType = 'tablet';
  }
  // Desktop: Laptops and monitors
  else {
    deviceType = 'desktop';
  }
  
  console.log(`[getDeviceType] width: ${width}px → ${deviceType}`);
  return deviceType;
};

// Legacy mobile detection (kept for compatibility)
export const isMobileDevice = () => {
  return getDeviceType() === 'mobile';
};

// Get weather style based on condition
export const getWeatherStyle = (condition: string) => {
  const cond = condition.toLowerCase();
  
  if (cond.includes('clear') || cond.includes('sunny')) {
    return {
      bg: 'bg-gradient-to-br from-blue-400 to-blue-600',
      icon: '☀️',
      text: 'text-yellow-100'
    };
  } else if (cond.includes('cloud') || cond.includes('overcast')) {
    return {
      bg: 'bg-gradient-to-br from-gray-400 to-gray-600',
      icon: '☁️',
      text: 'text-gray-100'
    };
  } else if (cond.includes('rain') || cond.includes('drizzle')) {
    return {
      bg: 'bg-gradient-to-br from-blue-500 to-blue-700',
      icon: '🌧️',
      text: 'text-blue-100'
    };
  } else if (cond.includes('snow') || cond.includes('sleet')) {
    return {
      bg: 'bg-gradient-to-br from-blue-200 to-blue-400',
      icon: '❄️',
      text: 'text-blue-50'
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