import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { useLoading } from '@/context/LoadingContext';

export function GlobalLoadingIndicator() {
  const { isLoading } = useLoading();
  
  if (!isLoading) return null;
  
  return <LoadingSpinner />;
} 