/**
 * Value Propositions Component
 *
 * 4 key features focused on solving the offline marketing attribution problem:
 * 1. Full-Funnel Attribution - Track complete customer journey
 * 2. Digital-Level Analytics - Google Analytics for direct mail
 * 3. Prove ROI, Finally - Know exact cost-per-acquisition
 * 4. Offline Meets Online - Bridge the attribution gap
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

'use client';

import { Target, BarChart3, DollarSign, Link2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: Target,
    headline: 'From Mailbox to Conversion',
    body: 'Track the complete customer journey with unique QR codes and personalized landing pages. See every touchpoint from scan to sale.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: BarChart3,
    headline: 'Google Analytics for Direct Mail',
    body: 'See exactly who scanned, when they visited, what they clicked, and how much they spent. Pixel-perfect tracking for offline campaigns.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: DollarSign,
    headline: 'Know Your Cost-Per-Acquisition',
    body: 'Track revenue down to the penny. No more guessing which campaigns drive sales. Show your CFO: $10k spend → $47k revenue = 4.7x ROI.',
    color: 'from-green-500 to-emerald-500',
  },
  {
    icon: Link2,
    headline: 'Bridge the Attribution Gap',
    body: 'Connect your physical campaigns to digital infrastructure. One dashboard shows complete attribution across online and offline channels.',
    color: 'from-orange-500 to-red-500',
  },
];

export function ValueProps() {
  const handleLearnMore = () => {
    const demoSection = document.getElementById('demo');
    demoSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
            The Attribution Problem, Solved
          </h2>
          <p className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Digital-Level Tracking.<br />Offline Campaigns.
          </p>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            50% of marketers can't connect offline campaigns to revenue.{' '}
            <span className="font-semibold text-slate-900">
              You're about to join the other 50%.
            </span>
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 hover:shadow-xl transition-shadow duration-300 border-2 hover:border-indigo-100"
              >
                {/* Icon with gradient */}
                <div className="mb-6">
                  <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${feature.color}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Headline */}
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  {feature.headline}
                </h3>

                {/* Body */}
                <p className="text-slate-600 leading-relaxed">
                  {feature.body}
                </p>

                {/* Learn More Link */}
                <button
                  onClick={handleLearnMore}
                  className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center gap-1 group"
                >
                  Learn more
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </Card>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-b border-slate-200">
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              100%
            </div>
            <div className="text-slate-600">Attribution Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              3 sec
            </div>
            <div className="text-slate-600">QR Scan to Landing Page</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              24/7
            </div>
            <div className="text-slate-600">Real-Time Analytics</div>
          </div>
        </div>
      </div>
    </section>
  );
}
