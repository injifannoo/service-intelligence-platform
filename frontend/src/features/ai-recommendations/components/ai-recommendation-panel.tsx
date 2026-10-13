'use client';

import React, { useState } from 'react';
import { AiRecommendationResult, ServiceProvider } from '@/types/service';
import { aiEngineService } from '@/features/services/aiEngine';
import { ETHIOPIAN_PROVIDERS } from '@/features/services/mockData';

interface AiRecommendationPanelProps {
  recommendation: AiRecommendationResult | null;
  isLoading: boolean;
  onSelectProvider: (provider: ServiceProvider) => void;
}

export const AiRecommendationPanel: React.FC<AiRecommendationPanelProps> = ({ onSelectProvider }) => {
  const [query, setQuery] = useState('I need an affordable software development company in Addis Ababa for a small business.');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiRecommendationResult | null>(null);

  const handleRunAi = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await aiEngineService.getRecommendation(query, ETHIOPIAN_PROVIDERS);
      setResult(res);
    } catch (err) {
      console.error('AI Engine error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-indigo-800/50 my-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-xl text-white shadow-md">
          ✨
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Decision Support Engine</h2>
          <p className="text-xs text-indigo-200">Real-time match scoring and automated service provider recommendations</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your exact service need..."
          className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleRunAi}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors shadow-md flex items-center justify-center min-w-[160px]"
        >
          {loading ? (
            <span className="animate-pulse">Analyzing...</span>
          ) : (
            <span>Get AI Match</span>
          )}
        </button>
      </div>

      {result && (
        <div className="mt-8 pt-8 border-t border-indigo-900/60 space-y-6">
          <div className="bg-indigo-900/40 border border-indigo-700/50 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Top Recommended Provider</span>
              <h3 className="text-2xl font-extrabold text-white mt-1">{result.recommendedProvider.name}</h3>
              <p className="text-xs text-indigo-200 mt-0.5">{result.recommendedProvider.category} • {result.recommendedProvider.location}</p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="block text-3xl font-black text-emerald-400">{result.matchScore}%</span>
                <span className="text-[10px] text-slate-300 uppercase font-semibold">Match Score</span>
              </div>
              <button
                onClick={() => onSelectProvider(result.recommendedProvider)}
                className="bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
              >
                Inspect Profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">Recommendation Drivers</h4>
              <ul className="space-y-2 text-xs text-slate-200">
                {result.reasoning.map((r, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-3">Decision Factor Analysis</h4>
              <div className="space-y-3">
                {result.keyDecisionFactors.map((f, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-200">{f.factor}</span>
                      <span className="text-indigo-300">{f.score}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${f.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};