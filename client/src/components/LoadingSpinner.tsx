import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-background/95">
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold text-primary animate-pulse">Loading game...</h2>
      </div>
    </div>
  );
} 