/**
 * Platform Showcase Component
 *
 * Interactive demos and screenshots of the platform in action.
 *
 * Phase 9.2.15 - Landing Page Completion
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, BarChart3, Palette, Check, TrendingUp, Mail } from 'lucide-react';
import { InteractiveDesignDemo } from './interactive-design-demo';
import { InteractiveAudienceDemo } from './interactive-audience-demo';
import { InteractiveAnalyticsDemo } from './interactive-analytics-demo';

export function PlatformShowcase() {
  const [activeTab, setActiveTab] = useState('design');

  const tabs = [
    { id: 'design', label: 'Design Editor', icon: Palette },
    { id: 'audience', label: 'Audience Builder', icon: Users },
    { id: 'analytics', label: 'Live Analytics', icon: BarChart3 },
  ];

  return (
    <section id="features" className="py-24 bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            See DropLab in Action
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Explore the platform's powerful features with interactive previews
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Design Editor Preview */}
        {activeTab === 'design' && (
          <Card className="p-8 bg-white shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Professional Design Editor</h3>
                <p className="text-slate-600 mb-6">
                  Create stunning postcards with our powerful design editor. Drag-and-drop elements,
                  add text, images, and QR codes. All designs are print-ready and optimized for direct mail.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Drag-and-drop design tools</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">AI-generated backgrounds</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Print-ready export</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Template library with proven designs</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-100 to-indigo-50 rounded-lg p-6 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <InteractiveDesignDemo />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Audience Builder Preview */}
        {activeTab === 'audience' && (
          <Card className="p-8 bg-white shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  Smart Audience Targeting
                </h3>
                <p className="text-slate-600 mb-6">
                  Access millions of verified contacts through our audience database. Filter by demographics,
                  location, income, and more. Get FREE count previews before purchasing.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Millions of verified contacts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">FREE count preview before purchasing</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">AI-powered audience recommendations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Advanced demographic filtering</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6">
                <InteractiveAudienceDemo />
              </div>
            </div>
          </Card>
        )}

        {/* Analytics Preview */}
        {activeTab === 'analytics' && (
          <Card className="p-8 bg-white shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Real-Time Analytics Dashboard</h3>
                <p className="text-slate-600 mb-6">
                  Track every interaction from mailbox to conversion. See QR scans, page views, form fills,
                  and conversions in real-time with beautiful trend charts and performance insights.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Real-time event tracking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Interactive trend charts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Full attribution: QR scan → conversion</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-slate-700">Response rate and ROI calculations</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-6">
                <InteractiveAnalyticsDemo />
              </div>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
