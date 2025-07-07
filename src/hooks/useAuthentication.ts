import { useState } from 'react';
import { validatePin } from '@/lib/api';
import { logger } from '@/lib/logger';
import { analytics } from '@/lib/analytics';
import { performanceMonitor } from '@/lib/performance';

export function useAuthentication() {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Handle PIN key press
  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 6 && !isProcessing) {
      setPin(prev => prev + digit);
    }
  };

  // Handle authentication
  const handleAuthenticate = async (selectedLocation?: any) => {
    if (pin.length !== 6 || isProcessing) return;

    setIsProcessing(true);
    setError('');
    
    const startTime = performance.now();
    
    try {
      const result = await validatePin(pin);
      const duration = performance.now() - startTime;
      
      if (result.data?.valid) {
        setIsAuthenticated(true);
        setAuthenticatedUser(result.data?.userName || 'User');
        setPin('');
        
        // Track successful authentication
        analytics.track({
          action: 'pin_authentication_success',
          category: 'authentication',
          label: 'pin',
          value: Math.round(duration),
          properties: {
            duration: Math.round(duration),
            location: selectedLocation?.name || 'unknown'
          }
        });
        
        performanceMonitor.trackMetric({
          name: 'pin_authentication_duration',
          value: duration,
          rating: duration < 1000 ? 'good' : duration < 3000 ? 'needs-improvement' : 'poor'
        });
      } else {
        setError('Invalid PIN');
        setPin('');
        
        // Track failed authentication
        analytics.track({
          action: 'pin_authentication_failed',
          category: 'authentication',
          label: 'pin',
          value: Math.round(duration),
          properties: {
            duration: Math.round(duration),
            location: selectedLocation?.name || 'unknown'
          }
        });
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error('Authentication error:', error);
      setError('Authentication failed');
      setPin('');
      
      analytics.track({
        action: 'pin_authentication_error',
        category: 'authentication',
        label: 'pin',
        value: Math.round(duration),
        properties: {
          duration: Math.round(duration),
          error: error instanceof Error ? error.message : 'Unknown error',
          location: selectedLocation?.name || 'unknown'
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle logout
  const handleLogout = (selectedLocation?: any) => {
    setIsAuthenticated(false);
    setAuthenticatedUser('');
    setPin('');
    setError('');
    
    analytics.track({
      action: 'user_logout',
      category: 'authentication',
      label: 'logout',
      properties: {
        location: selectedLocation?.name || 'unknown'
      }
    });
  };

  // Clear PIN
  const clearPin = () => {
    setPin('');
  };

  // Remove last digit
  const removeLastDigit = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return {
    // State
    pin,
    isAuthenticated,
    authenticatedUser,
    isProcessing,
    error,

    // Actions
    handlePinKeyPress,
    handleAuthenticate,
    handleLogout,
    clearPin,
    removeLastDigit,
    setPin,
    setError,
  };
} 