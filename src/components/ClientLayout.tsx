'use client';

import { ErrorBoundary } from './ErrorBoundary';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
} 