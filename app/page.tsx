/**
 * Marketing Homepage
 *
 * Public-facing landing page with attribution-focused value proposition.
 * "Offline Marketing. Online Attribution."
 *
 * Designed to convert visitors into qualified demo leads.
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { HeroSection } from '@/components/marketing/hero-section';
import { SocialProof } from '@/components/marketing/social-proof';
import { ValueProps } from '@/components/marketing/value-props';
import { PlatformShowcase } from '@/components/marketing/platform-showcase';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { Testimonials } from '@/components/marketing/testimonials';
import { FAQ } from '@/components/marketing/faq';
import { DemoForm } from '@/components/marketing/demo-form';
import { MarketingFooter } from '@/components/marketing/marketing-footer';

export default function MarketingHomepage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDemoClick = () => {
    // Scroll to demo section
    const demoSection = document.getElementById('demo');
    demoSection?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false); // Close mobile menu after clicking
  };

  const handleNavClick = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false); // Close mobile menu after clicking
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/images/logo_icon_tbg.png"
                alt="DropLab"
                className="h-6 w-auto object-contain"
              />
              <span className="text-xl font-bold text-slate-900">DropLab</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#demo"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Demo
              </a>
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-gradient-to-r from-indigo-600 to-purple-600">
                  Get Started
                </Button>
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 bg-white">
              <div className="px-4 py-4 space-y-3">
                <button
                  onClick={() => handleNavClick('features')}
                  className="block w-full text-left text-sm font-medium text-slate-600 hover:text-slate-900 py-2"
                >
                  Features
                </button>
                <button
                  onClick={() => handleNavClick('how-it-works')}
                  className="block w-full text-left text-sm font-medium text-slate-600 hover:text-slate-900 py-2"
                >
                  How It Works
                </button>
                <button
                  onClick={handleDemoClick}
                  className="block w-full text-left text-sm font-medium text-slate-600 hover:text-slate-900 py-2"
                >
                  Demo
                </button>
                <div className="pt-3 space-y-2">
                  <Link href="/auth/login" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup" className="block">
                    <Button size="sm" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <HeroSection onDemoClick={handleDemoClick} />

      {/* Social Proof */}
      <SocialProof />

      {/* Value Propositions */}
      <ValueProps />

      {/* Platform Showcase */}
      <PlatformShowcase />

      {/* How It Works */}
      <div id="how-it-works">
        <HowItWorks onDemoClick={handleDemoClick} />
      </div>

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* Demo Section */}
      <section id="demo" className="py-24 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
              See the Attribution Magic
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Get a personalized demo postcard via email. Scan the QR code to experience
              pixel-perfect tracking for yourself.
            </p>
          </div>

          {/* Demo Form */}
          <DemoForm />

          {/* Below Form - What Happens Next */}
          <div className="mt-12 bg-white rounded-xl p-8 shadow-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">
              What happens after you submit?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold mb-3">
                  1
                </div>
                <p className="text-sm text-slate-600">
                  We generate a personalized demo postcard with your name
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600 font-bold mb-3">
                  2
                </div>
                <p className="text-sm text-slate-600">
                  You receive it via email within 30 seconds
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-bold mb-3">
                  3
                </div>
                <p className="text-sm text-slate-600">
                  Scan the QR code to see live attribution tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6">
            Ready to Prove ROI on Offline Marketing?
          </h2>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            Join 500+ marketers who have complete attribution across online and offline channels.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleDemoClick}
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Try Interactive Demo
            </button>
            <Link
              href="/auth/signup"
              className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors inline-block"
            >
              Start Your First Campaign
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-indigo-100 flex-wrap">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free demo</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Setup in 60 seconds</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
