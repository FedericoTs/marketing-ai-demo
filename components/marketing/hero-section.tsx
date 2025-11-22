/**
 * Hero Section
 *
 * Above-the-fold section with attribution-focused value proposition.
 * - Headline: "Offline Marketing. Online Attribution."
 * - Subheadline emphasizing the attribution gap problem
 * - Primary CTA: Try Interactive Demo
 * - Secondary CTA: See How It Works (scroll to features)
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown, Mail, TrendingUp, Target, Activity } from 'lucide-react';
import { MiniAttributionChart } from './mini-attribution-chart';

interface HeroSectionProps {
  onDemoClick?: () => void;
}

export function HeroSection({ onDemoClick }: HeroSectionProps) {
  const [metrics, setMetrics] = useState({
    sent: 0,
    scans: 0,
    responseRate: 0,
    conversions: 0,
  });

  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  // Animate metrics counting up
  useEffect(() => {
    const targetMetrics = {
      sent: 1247,
      scans: 423,
      responseRate: 33.9,
      conversions: 87,
    };

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setMetrics({
        sent: Math.floor(targetMetrics.sent * easeOut),
        scans: Math.floor(targetMetrics.scans * easeOut),
        responseRate: parseFloat((targetMetrics.responseRate * easeOut).toFixed(1)),
        conversions: Math.floor(targetMetrics.conversions * easeOut),
      });

      if (currentStep >= steps) {
        clearInterval(interval);
        setMetrics(targetMetrics);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="text-center lg:text-left">
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-6">
              Offline Marketing.
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Online Attribution.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
              You wouldn't run Google Ads without analytics.{' '}
              <span className="font-semibold text-slate-900">
                Why send direct mail blind?
              </span>
              {' '}Track every scan, click, and conversion with pixel-perfect precision.
            </p>

            {/* Alternative subheadline (commented for A/B testing) */}
            {/* <p className="text-xl sm:text-2xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0">
              <span className="font-semibold text-slate-900">
                50% of marketers can't connect offline campaigns to revenue.
              </span>
              {' '}Join the other 50% with complete attribution.
            </p> */}

            {/* Social Proof Badge */}
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-8">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 border-2 border-white"
                  />
                ))}
              </div>
              <span className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">500+</span> marketers tracking offline campaigns
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                onClick={onDemoClick}
              >
                Try Interactive Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="px-8 py-6 text-lg font-semibold border-2 hover:bg-slate-50"
                onClick={scrollToFeatures}
              >
                See How It Works
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Setup in 60 seconds</span>
              </div>
            </div>
          </div>

          {/* Right Column - Enhanced Dashboard Preview */}
          <div className="relative">
            <div className="relative rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 transform hover:scale-105 transition-transform duration-300">
              {/* Header with Live Indicator */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  Campaign Performance
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-900">Live Data</span>
                </div>
              </div>

              {/* Enhanced Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {/* Mail Sent */}
                <div className="p-3 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg border border-indigo-200 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-semibold text-slate-600">Mail Sent</span>
                  </div>
                  <div className="text-2xl font-bold text-indigo-900 tabular-nums">
                    {metrics.sent.toLocaleString()}
                  </div>
                  <div className="text-xs text-indigo-600 mt-1">+12.5% this week</div>
                </div>

                {/* QR Scans */}
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-slate-600">QR Scans</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 tabular-nums">
                    {metrics.scans.toLocaleString()}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">{metrics.responseRate}% response</div>
                </div>

                {/* Response Rate */}
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg border border-green-200 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-slate-600">Response Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 tabular-nums">
                    {metrics.responseRate}%
                  </div>
                  <div className="text-xs text-green-600 mt-1">Industry avg: 3-5%</div>
                </div>

                {/* Conversions */}
                <div className="p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg border border-orange-200 transition-all hover:shadow-md">
                  <div className="flex items-center gap-2 mb-1">
                    <ArrowRight className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-semibold text-slate-600">Conversions</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-900 tabular-nums">
                    {metrics.conversions}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">7.0% conversion</div>
                </div>
              </div>

              {/* Attribution Funnel Chart */}
              <div className="mt-4">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">
                  Attribution Funnel
                </p>
                <div className="h-32 rounded-lg overflow-hidden">
                  <MiniAttributionChart />
                </div>
              </div>

              {/* ROI Indicator */}
              <div className="mt-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">Campaign ROI:</span>
                  <span className="text-xl font-bold text-green-600">412%</span>
                </div>
              </div>

              {/* Floating "tracking badge" */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse">
                Live Tracking
              </div>
            </div>

            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl blur-3xl opacity-20 -z-10 transform scale-95" />
          </div>
        </div>
      </div>

      {/* Bottom curve/wave (optional visual element) */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-12 text-white fill-current"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" />
        </svg>
      </div>
    </section>
  );
}
