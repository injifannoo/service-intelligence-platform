'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ServiceProvider, AiRecommendationResult } from '@/types/service';
import { ETHIOPIAN_PROVIDERS } from '@/features/services/mockData';
// 1. Import singleton instance rather than the interface
import { aiEngineService } from '@/features/services/aiEngine';

import { ProviderCard } from '@/features/services/components/provider-card';
import { ProviderDetailModal } from '@/features/services/components/provider-detail-modal';

import { ComparisonTable } from '@/features/comparison/components/comparison-table';
import { ComparisonTray } from '@/features/comparison/components/comparison-tray';
import { useComparison } from '@/features/comparison/use-comparison';

import { AiRecommendationPanel } from '@/features/ai-recommendations/components/ai-recommendation-panel';

export default function HomePage() {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Selection & Modal States
  const [selectedProviderDetail, setSelectedProviderDetail] = useState<ServiceProvider | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // AI Decision Engine State
  const [aiPrompt, setAiPrompt] = useState('I need an affordable software development company in Addis Ababa for a small business.');
  const [aiResult, setAiResult] = useState<AiRecommendationResult | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(true);

  // Comparison State Hook
  const { selectedProviders, toggleProvider, removeProvider, clearAll, isCompared } = useComparison(3);

  // Initial AI Engine execution on mount
  useEffect(() => {
    let isMounted = true;
    const fetchInitialRecommendation = async () => {
      setIsAiLoading(true);
      const result = await aiEngineService.getRecommendation(aiPrompt, ETHIOPIAN_PROVIDERS);
      if (isMounted) {
        setAiResult(result);
        setIsAiLoading(false);
      }
    };

    fetchInitialRecommendation();
    return () => { isMounted = false; };
  }, []);

  // Extract Categories dynamically
  const categories = useMemo(() => {
    const list = Array.from(new Set(ETHIOPIAN_PROVIDERS.map((p) => p.category)));
    return ['All', ...list];
  }, []);

  // Filter Providers
  const filteredProviders = useMemo(() => {
    return ETHIOPIAN_PROVIDERS.filter((provider) => {
      const matchesCategory = selectedCategory === 'All' || provider.category === selectedCategory;
      const matchesQuery = 
        provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        provider.servicesOffered.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  // Execute AI Analysis
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsAiLoading(true);
    // 2. Call method on service instance with await
    const result = await aiEngineService.getRecommendation(aiPrompt, ETHIOPIAN_PROVIDERS);
    setAiResult(result);
    setIsAiLoading(false);
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Hero Header */}
      <section className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          IntelligentService Platform
        </h1>
        <p className="text-lg text-slate-600">
          Discover, compare, and leverage AI decision support to select verified business service providers in Ethiopia.
        </p>

        {/* Global Search Bar */}
        <div className="pt-2">
          <form onSubmit={handleAiSearch} className="flex gap-2 max-w-xl mx-auto">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => {
                setAiPrompt(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Describe your business service requirement..."
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
            <button
              type="submit"
              disabled={isAiLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {isAiLoading ? 'Analyzing...' : 'AI Match'}
            </button>
          </form>
        </div>
      </section>

      {/* Category Filter Chips */}
      <section className="flex items-center justify-center gap-2 overflow-x-auto py-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors border ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Main Feature Grid (AI Panel + Provider Results) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: AI Decision Support Panel */}
        <div className="lg:col-span-1 sticky top-6">
          <AiRecommendationPanel 
            recommendation={aiResult}
            isLoading={isAiLoading}
            onSelectProvider={(provider) => setSelectedProviderDetail(provider)}
          />
        </div>

        {/* Right Column: Search Results & Provider Directory */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Provider Results ({filteredProviders.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Category: {selectedCategory}
            </span>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <p className="text-slate-500 text-sm">No service providers match your search criteria.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                className="mt-3 text-xs font-semibold text-blue-600 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProviders.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  isCompared={isCompared(provider.id)}
                  onToggleCompare={() => toggleProvider(provider)}
                  onViewDetails={() => setSelectedProviderDetail(provider)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Floating Comparison Tray */}
      <ComparisonTray
        selectedProviders={selectedProviders}
        onRemove={removeProvider}
        onClear={clearAll}
        onOpenComparison={() => setIsComparisonOpen(true)}
      />

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        provider={selectedProviderDetail}
        isOpen={!!selectedProviderDetail}
        onClose={() => setSelectedProviderDetail(null)}
        onToggleCompare={(p) => toggleProvider(p)}
        isCompared={selectedProviderDetail ? isCompared(selectedProviderDetail.id) : false}
      />

      {/* Comparison Matrix Modal */}
      {isComparisonOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Service Provider Benchmarking Matrix</h3>
                <p className="text-xs text-slate-500">Side-by-side comparison across technical metrics, rating, and service coverage</p>
              </div>
              <button
                onClick={() => setIsComparisonOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            
            <ComparisonTable 
              providers={selectedProviders} 
              onRemove={removeProvider}
              onClear={clearAll}
            />
          </div>
        </div>
      )}
    </div>
  );
}