'use client';

import React from 'react';
import { ServiceProvider } from '@/types/service';

interface ProviderCardProps {
  provider: ServiceProvider;
  isCompared: boolean;
  onToggleCompare: (provider: ServiceProvider) => void;
  onViewDetails: (provider: ServiceProvider) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  isCompared,
  onToggleCompare,
  onViewDetails,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            {provider.category}
          </span>
          {provider.verified && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified
            </span>
          )}
        </div>

        {/* Title & Location */}
        <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
        <p className="text-xs text-slate-500 font-medium mb-3">{provider.location}</p>

        {/* Rating & Pricing */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 mb-3 bg-slate-50 p-2 rounded-lg">
          <span className="text-amber-600 font-bold">★ {provider.rating}</span>
          <span>•</span>
          <span>{provider.priceLevel}</span>
        </div>

        {/* Description preview */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
          {provider.description}
        </p>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onToggleCompare(provider)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            isCompared
              ? 'bg-amber-50 text-amber-700 border-amber-300'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {isCompared ? '✓ Compared' : '+ Compare'}
        </button>

        <button
          onClick={() => onViewDetails(provider)}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
};