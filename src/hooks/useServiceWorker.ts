import { useState } from 'react';
import { analytics } from '@/lib/analytics';

export function useServiceWorker() {
  const [isCheckingForUpdate, setIsCheckingForUpdate] = useState(false);
  const [lastUpdateCheck, setLastUpdateCheck] = useState<string>('');

  // Check for service worker updates
  const checkForUpdates = async () => {
    setIsCheckingForUpdate(true);
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        setLastUpdateCheck(new Date().toLocaleTimeString());
        
        analytics.track({
          action: 'service_worker_update_check',
          category: 'system',
          label: 'success'
        });
      } else {
        analytics.track({
          action: 'service_worker_update_check',
          category: 'system',
          label: 'no_registration'
        });
      }
    } catch (error) {
      console.error('Update check error:', error);
      
      analytics.track({
        action: 'service_worker_update_check',
        category: 'system',
        label: 'error',
        properties: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } finally {
      setIsCheckingForUpdate(false);
    }
  };

  // Register service worker update listener
  const registerUpdateListener = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        analytics.track({
          action: 'service_worker_controller_change',
          category: 'system',
          label: 'update_applied'
        });
        
        // Reload the page to apply the update
        window.location.reload();
      });
    }
  };

  return {
    // State
    isCheckingForUpdate,
    lastUpdateCheck,

    // Actions
    checkForUpdates,
    registerUpdateListener,

    // Setters
    setIsCheckingForUpdate,
    setLastUpdateCheck,
  };
} 