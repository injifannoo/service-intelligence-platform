'use client';

import React from 'react';
import { ServiceProvider } from '@/types/service';

interface ProviderDetailModalProps {
  provider: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleCompare: (provider: ServiceProvider) => void;
  isCompared: boolean;
}

export const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  provider,
  isOpen,
  onClose,
  onToggleCompare,
  isCompared,
}) => {
  if (!isOpen || !provider) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {provider.category}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {provider.location}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">{provider.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Rating & Fast Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
            <div>
              <p className="text-xs text-slate-500 font-medium">Rating</p>
              <p className="text-lg font-bold text-amber-500">★ {provider.rating}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Price Level</p>
              <p className="text-lg font-bold text-slate-800">{provider.priceLevel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Experience</p>
              <p className="text-lg font-bold text-slate-800">{provider.yearEstablished || '5+'} yrs</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">About the Organization</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{provider.description}</p>
          </div>

          {/* Service Offerings */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-2">Service Capabilities</h3>
            <div className="flex flex-wrap gap-2">
              {provider.servicesOffered.map((service, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Contact & Inquiry</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Email</p>
                <p className="font-semibold text-slate-800 truncate">{provider.contactEmail || `contact@${provider.name.toLowerCase().replace(/\s+/g, '')}.et`}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Phone</p>
                <p className="font-semibold text-slate-800">{provider.contactPhone || '+251 11 6XX XXXX'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={() => onToggleCompare(provider)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
              isCompared
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            {isCompared ? '✓ Added to Compare' : '+ Add to Compare'}
          </button>
          
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            Request Information
          </button>
        </div>
      </div>
    </div>
  );
};