'use client';

import { useState } from 'react';
import { ServiceProvider } from '@/types/service';

export function useComparison(maxProviders = 3) {
  const [selectedProviders, setSelectedProviders] = useState<ServiceProvider[]>([]);

  const toggleProvider = (provider: ServiceProvider) => {
    setSelectedProviders((prev) => {
      const exists = prev.some((p) => p.id === provider.id);
      if (exists) {
        return prev.filter((p) => p.id !== provider.id);
      }
      if (prev.length >= maxProviders) {
        return prev;
      }
      return [...prev, provider];
    });
  };

  const removeProvider = (id: string) => {
    setSelectedProviders((prev) => prev.filter((p) => p.id !== id));
  };

  const clearAll = () => setSelectedProviders([]);

  return {
    selectedProviders,
    toggleProvider,
    removeProvider,
    clearAll,
    isCompared: (id: string) => selectedProviders.some((p) => p.id === id),
  };
}