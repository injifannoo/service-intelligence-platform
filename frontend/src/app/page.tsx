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

import { HomeNav } from "@/components/homepage/home-nav";
import { HomepageSections } from "@/components/homepage/homepage-sections";
import { SiteFooter } from "@/components/homepage/site-footer";

/**
 * Public marketing homepage.
 *
 * Statically prerendered: `HomepageSections` is a client island whose fallback
 * renders every section, and the only data it reads comes from the public
 * directory and settings endpoints, so the page never needs server-side session
 * state.
 */
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
    <div className="flex min-h-screen flex-col bg-background">
      <HomeNav />
      <main className="flex-1">
        <HomepageSections />
      </main>
      <SiteFooter />
    </div>
  );
}