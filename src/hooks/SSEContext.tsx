"use client";

import React, { createContext, useContext } from 'react';
import { useSSE, SSEEventDisplay } from './useSSE';

interface SSEContextValue {
  sseClient: ReturnType<typeof useSSE>['sseClient'];
  sseConnected: boolean;
  sseEnabled: boolean;
  lastSSEEvent: string;
  recentEvents: SSEEventDisplay[];
  showLiveEvents: boolean;
  setupSSEConnection: ReturnType<typeof useSSE>['setupSSEConnection'];
  disconnectSSE: ReturnType<typeof useSSE>['disconnectSSE'];
  toggleSSE: ReturnType<typeof useSSE>['toggleSSE'];
  toggleLiveEvents: ReturnType<typeof useSSE>['toggleLiveEvents'];
  setSSEEnabled: ReturnType<typeof useSSE>['setSSEEnabled'];
  setShowLiveEvents: ReturnType<typeof useSSE>['setShowLiveEvents'];
  loadSettings: ReturnType<typeof useSSE>['loadSettings'];
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