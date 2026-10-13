'use client';

import React from 'react';
import { ServiceProvider } from '@/types/service';

interface ComparisonTableProps {
  providers: ServiceProvider[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ providers, onRemove, onClear }) => {
  if (providers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto my-8">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          ⚖️
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Providers Selected for Comparison</h3>
        <p className="text-sm text-slate-500 mt-2">
          Select 2 to 3 service providers from the search results to evaluate side-by-side metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden my-6">
      <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Provider Comparison Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">Evaluating {providers.length} selected providers</p>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="p-4 text-xs font-bold text-slate-400 uppercase w-48">Metric</th>
              {providers.map((p) => (
                <th key={p.id} className="p-4 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                    <button onClick={() => onRemove(p.id)} className="text-slate-400 hover:text-rose-500 text-xs">✕</button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            <tr>
              <td className="p-4 font-semibold text-slate-500 text-xs uppercase bg-slate-50/50">Category</td>
              {providers.map((p) => (
                <td key={p.id} className="p-4 font-medium text-slate-800">{p.category}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-semibold text-slate-500 text-xs uppercase bg-slate-50/50">Rating & Reviews</td>
              {providers.map((p) => (
                <td key={p.id} className="p-4 font-bold text-amber-500">
                  ★ {p.rating} <span className="text-xs font-normal text-slate-400">({p.reviewCount} reviews)</span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-semibold text-slate-500 text-xs uppercase bg-slate-50/50">Price & Rates</td>
              {providers.map((p) => (
                <td key={p.id} className="p-4 text-slate-800">
                  <span className="font-bold">{p.priceLevel}</span> <span className="text-xs text-slate-500">({p.hourlyRate})</span>
                </td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-semibold text-slate-500 text-xs uppercase bg-slate-50/50">Location</td>
              {providers.map((p) => (
                <td key={p.id} className="p-4 text-slate-700 text-xs">{p.location}</td>
              ))}
            </tr>
            <tr>
              <td className="p-4 font-semibold text-slate-500 text-xs uppercase bg-slate-50/50">Team & History</td>
              {providers.map((p) => (
                <td key={p.id} className="p-4 text-slate-700 text-xs">
                  Established {p.yearEstablished} ({p.teamSize})
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};