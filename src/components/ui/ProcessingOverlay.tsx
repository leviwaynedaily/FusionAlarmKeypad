import React from 'react';

interface ProcessingOverlayProps {
  isProcessing: boolean;
}

export function ProcessingOverlay({ isProcessing }: ProcessingOverlayProps) {
  if (!isProcessing) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-white/90 dark:bg-[#0f0f0f]/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#22c55f] mx-auto mb-4"></div>
        <p className="text-gray-900 dark:text-white font-medium">Processing...</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Please wait</p>
      </div>
    </div>
  );
} 