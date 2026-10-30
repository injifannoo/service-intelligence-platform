'use client';

import React from 'react';
import { ServiceProvider } from '@/types/service';

interface ComparisonTrayProps {
  selectedProviders: ServiceProvider[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpenComparison: () => void;
}

export const ComparisonTray: React.FC<ComparisonTrayProps> = ({
  selectedProviders,
  onRemove,
  onClear,
  onOpenComparison,
}) => {
  if (selectedProviders.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-4 border border-slate-700 flex items-center justify-between gap-4">
        {/* Selected Items List */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Comparing ({selectedProviders.length}/3):
          </span>
          {selectedProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center gap-2 bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-medium shrink-0"
            >
              <span className="max-w-[120px] truncate">{provider.name}</span>
              <button
                onClick={() => onRemove(provider.id)}
                className="text-slate-400 hover:text-white transition-colors ml-1"
                aria-label={`Remove ${provider.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onOpenComparison}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-md"
          >
            Compare Now →
          </button>
        </div>
      </div>
    </div>
  );
};