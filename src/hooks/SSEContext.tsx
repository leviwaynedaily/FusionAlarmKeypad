"use client";

import React, { createContext, useContext } from 'react';
import { useSSE, SSEEventDisplay } from './useSSE';

interface SSEContextValue {
  // Legacy properties (for backward compatibility)
  sseClient: ReturnType<typeof useSSE>['sseClient'];
  sseConnected: boolean;
  sseEnabled: boolean;
  lastSSEEvent: string;
  recentEvents: SSEEventDisplay[];
  showLiveEvents: boolean;
  
  // Legacy methods (for backward compatibility)
  setupSSEConnection: ReturnType<typeof useSSE>['setupSSEConnection'];
  disconnectSSE: ReturnType<typeof useSSE>['disconnectSSE'];
  toggleSSE: ReturnType<typeof useSSE>['toggleSSE'];
  toggleLiveEvents: ReturnType<typeof useSSE>['toggleLiveEvents'];
  setSSEEnabled: ReturnType<typeof useSSE>['setSSEEnabled'];
  setShowLiveEvents: ReturnType<typeof useSSE>['setShowLiveEvents'];
  loadSettings: ReturnType<typeof useSSE>['loadSettings'];
  
  // New background service methods
  checkBackgroundService: ReturnType<typeof useSSE>['checkBackgroundService'];
  refreshEvents: ReturnType<typeof useSSE>['refreshEvents'];
  startBackgroundService: ReturnType<typeof useSSE>['startBackgroundService'];
  stopBackgroundService: ReturnType<typeof useSSE>['stopBackgroundService'];
  backgroundServiceStatus: ReturnType<typeof useSSE>['backgroundServiceStatus'];
  isConnected: ReturnType<typeof useSSE>['isConnected'];
  isLoading: ReturnType<typeof useSSE>['isLoading'];
  statusLoading: ReturnType<typeof useSSE>['statusLoading'];
  connectSSE: ReturnType<typeof useSSE>['connectSSE'];
  cleanupOldEvents: ReturnType<typeof useSSE>['cleanupOldEvents'];
}

const SSEContext = createContext<SSEContextValue | undefined>(undefined);

export const SSEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sse = useSSE();
  return <SSEContext.Provider value={sse}>{children}</SSEContext.Provider>;
};

export function useSSEContext() {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  return context;
} 