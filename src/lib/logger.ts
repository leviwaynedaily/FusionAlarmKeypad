// Production-ready logging utility
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  log: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.log(message, ...args);
    }
  },
  
  error: (message: string, error?: any) => {
    // Always log errors, even in production
    console.error(message, error);
    
    // In production, you might want to send to monitoring service
    if (isProduction) {
      // Example: Send to monitoring service
      // sendToMonitoring('error', message, error);
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.warn(message, ...args);
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.info(message, ...args);
    }
  }
};

// Only expose debug logging in development
export const debug = {
  log: (message: string, ...args: any[]) => {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
}; 