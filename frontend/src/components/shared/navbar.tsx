'use client';

import React, { useState } from 'react';

interface NavbarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  compareCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab: externalActiveTab, 
  setActiveTab: externalSetActiveTab, 
  compareCount = 0 
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState('home');

  const activeTab = externalActiveTab ?? internalActiveTab;
  
  const handleTabChange = (tab: string) => {
    if (externalSetActiveTab) {
      externalSetActiveTab(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTabChange('home')}>
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xl text-white shadow-sm">
            IS
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">IntelligentService</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 border border-blue-700/50">
              Demo MVP
            </span>
          </div>
        </div>

        <nav className="flex space-x-1 sm:space-x-4">
          <button
            onClick={() => handleTabChange('home')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'home' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleTabChange('search')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'search' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Find Providers
          </button>
          <button
            onClick={() => handleTabChange('compare')}
            className={`relative px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'compare' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Compare
            {compareCount > 0 && (
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                {compareCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('ai')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1.5 ${
              activeTab === 'ai' ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-indigo-900/50 hover:text-white'
            }`}
          >
            <span className="text-xs">✨</span>
            <span>AI Assist</span>
          </button>
        </nav>
      </div>
    </header>
  );
};