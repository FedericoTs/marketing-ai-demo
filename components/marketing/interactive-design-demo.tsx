/**
 * Interactive Design Editor Demo
 *
 * Landscape postcard with DropLab branding and animated personalization
 * Phase 9.2.15 - Landing Page Enhancement (Redesigned - Static Preview)
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

const offers = [
  { headline: '20% OFF', subtext: 'Your First Order' },
  { headline: 'FREE SHIPPING', subtext: 'Limited Time Only' },
  { headline: 'BUY 2 GET 1', subtext: 'Special Promotion' },
];

const names = ['{{name}}', 'Sarah Johnson', '{{name}}', 'Michael Chen', '{{name}}', 'Emma Davis'];

export function InteractiveDesignDemo() {
  const [offerIndex, setOfferIndex] = useState(0);
  const [nameIndex, setNameIndex] = useState(0);

  // Cycle through offers
  useEffect(() => {
    const interval = setInterval(() => {
      setOfferIndex((prev) => (prev + 1) % offers.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through names
  useEffect(() => {
    const interval = setInterval(() => {
      setNameIndex((prev) => (prev + 1) % names.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const currentOffer = offers[offerIndex];
  const currentName = names[nameIndex];
  const isVariable = currentName.includes('{{');

  return (
    <div className="space-y-4">
      {/* Landscape Postcard Canvas */}
      <div className="relative w-full aspect-[16/10] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Left Section - Brand & Offer */}
        <div className="absolute left-0 top-0 bottom-0 w-[55%] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 p-5 flex flex-col justify-between">
          {/* Official DropLab Logo */}
          <div className="flex items-center gap-2 bg-white rounded-xl shadow-lg px-3 py-2 w-fit">
            <img
              src="/images/logo_icon_tbg.png"
              alt="DropLab"
              className="h-5 w-auto object-contain"
            />
            <span className="font-bold text-slate-900 text-sm">DropLab</span>
          </div>

          {/* Animated Offer (Center) */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center transform transition-all duration-500">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 mb-3">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
                <span className="text-white/90 text-xs font-semibold uppercase tracking-wide">
                  Exclusive Offer
                </span>
              </div>
              <h1 className="text-4xl font-black text-white mb-2 drop-shadow-2xl transition-all duration-500">
                {currentOffer.headline}
              </h1>
              <p className="text-lg text-white/95 font-semibold drop-shadow-lg">{currentOffer.subtext}</p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <div className="inline-block bg-white rounded-lg px-4 py-2 shadow-xl">
              <p className="text-indigo-700 font-bold text-xs">Scan QR Code to Claim →</p>
            </div>
          </div>
        </div>

        {/* Right Section - Personalization & QR */}
        <div className="absolute right-0 top-0 bottom-0 w-[45%] bg-gradient-to-br from-slate-50 to-slate-100 p-5 flex flex-col justify-between">
          {/* Personalized Greeting - Expanded for Full Address */}
          <div className="bg-white rounded-xl p-4 shadow-lg border-2 border-indigo-200 h-36 flex flex-col justify-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">Personalized For:</p>
            <h3
              className={`text-base font-bold transition-all duration-300 ${
                isVariable ? 'text-indigo-600' : 'text-slate-900'
              }`}
            >
              {isVariable && <span className="text-xs mr-1 align-super opacity-60 font-mono">VAR</span>}
              {currentName}
            </h3>
            {!isVariable && (
              <p className="text-xs text-slate-600 mt-1.5 font-medium leading-relaxed">123 Main St, San Francisco, CA</p>
            )}
          </div>

          {/* Static QR Code - Minimal */}
          <div className="flex justify-center items-center flex-1">
            <div className="relative bg-white rounded-lg shadow-lg p-2.5 border-3 border-orange-400">
              {/* QR Code Visual */}
              <div className="w-12 h-12 bg-slate-900 rounded flex items-center justify-center relative">
                <div className="absolute inset-1 bg-white"></div>
                <div className="absolute inset-1.5 grid grid-cols-4 gap-0.5">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className={`${i % 3 === 0 ? 'bg-slate-900' : 'bg-white'}`}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-slate-500 font-medium">www.droplab.com/offers</p>
          </div>
        </div>
      </div>

      {/* Info Badges - Below Postcard */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-full px-4 py-2">
          <Sparkles className="w-3 h-3 text-purple-600" />
          <span className="text-xs font-semibold text-purple-900">Live Personalization</span>
        </div>
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-indigo-900">Dynamic Content</span>
        </div>
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-2">
          <svg className="w-3 h-3 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <rect x="7" y="7" width="3" height="3" />
            <rect x="14" y="7" width="3" height="3" />
            <rect x="7" y="14" width="3" height="3" />
            <rect x="14" y="14" width="3" height="3" />
          </svg>
          <span className="text-xs font-semibold text-orange-900">Unique QR Codes</span>
        </div>
      </div>
    </div>
  );
}
