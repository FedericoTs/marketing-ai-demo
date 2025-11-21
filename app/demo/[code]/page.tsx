/**
 * Demo Landing Page
 *
 * Personalized landing page shown after scanning QR code from demo postcard.
 * Tracks all interactions for attribution demonstration.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, BarChart3, Check } from 'lucide-react';

export default function DemoLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [demoData, setDemoData] = useState<{ name: string; demo_code: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    if (!code) return;

    // Detect source from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const sourceParam = urlParams.get('source') || 'qr'; // Default to QR if no source
    setSource(sourceParam);

    // Track appropriate entry event based on source
    if (sourceParam === 'email') {
      trackEvent('email_click', { source: 'email_button' });
    } else {
      trackEvent('qr_scan', { source: 'postcard_qr' });
    }

    // Also track page view
    trackEvent('page_view', { source: sourceParam });

    // Load demo data
    loadDemoData();

    // Timer for time on page
    const timer = setInterval(() => {
      setTimeOnPage(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [code]);

  const loadDemoData = async () => {
    try {
      const response = await fetch(`/api/demo/${code}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError('Demo not found');
        return;
      }

      setDemoData(data.data);
    } catch (err) {
      setError('Failed to load demo');
    } finally {
      setLoading(false);
    }
  };

  const trackEvent = async (event_type: string, event_data?: any) => {
    try {
      await fetch(`/api/demo/${code}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type, event_data }),
      });
      setEventCount(prev => prev + 1);
    } catch (err) {
      console.error('Failed to track event:', err);
    }
  };

  const handleCTAClick = () => {
    trackEvent('cta_click', { button: 'start_campaign' });
    router.push('/auth/signup');
  };

  const handleAnalyticsClick = () => {
    trackEvent('cta_click', { button: 'view_analytics' });
    router.push('/demo/analytics');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !demoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Demo Not Found</h1>
          <p className="text-slate-600 mb-6">{error || 'This demo link is invalid or has expired.'}</p>
          <Link href="/">
            <Button>Back to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/images/logo_icon_tbg.png" alt="DropLab" className="h-6 w-auto" />
            <span className="font-bold text-slate-900">DropLab Demo</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleAnalyticsClick}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Hey {demoData.name}! 👋
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            This is what your customers will see when they scan your QR code.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
            We're tracking this interaction in real-time
          </div>
        </div>

        {/* Live Attribution Dashboard */}
        <Card className="p-8 mb-8 bg-gradient-to-br from-slate-50 to-white border-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Live Attribution Dashboard</h2>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
              Live
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-3xl font-bold text-indigo-600">{eventCount + 1}</div>
              <div className="text-sm text-slate-600 mt-1">Events Tracked</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-3xl font-bold text-purple-600">{timeOnPage}s</div>
              <div className="text-sm text-slate-600 mt-1">Time on Page</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-3xl font-bold text-green-600">100%</div>
              <div className="text-sm text-slate-600 mt-1">Attribution</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="text-3xl font-bold text-orange-600">${((eventCount + 1) * 0.15).toFixed(2)}</div>
              <div className="text-sm text-slate-600 mt-1">Value Tracked</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-slate-900">
                  {source === 'email' ? 'Email Link Clicked' : 'QR Code Scanned'}
                </div>
                <div className="text-sm text-slate-600">
                  Source: {source === 'email' ? 'Email button' : `Postcard #${demoData?.demo_code.toUpperCase().slice(0, 6)}`}
                </div>
              </div>
              <div className="text-xs text-slate-500">Just now</div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-slate-900">Page Viewed</div>
                <div className="text-sm text-slate-600">Demo landing page loaded</div>
              </div>
              <div className="text-xs text-slate-500">{timeOnPage}s ago</div>
            </div>
            {timeOnPage > 5 && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Check className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">Engaged Visitor</div>
                  <div className="text-sm text-slate-600">Spent {timeOnPage}s reading content</div>
                </div>
                <div className="text-xs text-slate-500">Live</div>
              </div>
            )}
          </div>
        </Card>

        {/* What Makes This Powerful */}
        <Card className="p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Why This Changes Everything</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Perfect Attribution</h3>
              <p className="text-sm text-slate-600">
                Know exactly which postcard drove each conversion. No guessing, no surveys, no promo codes.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Real-Time Data</h3>
              <p className="text-sm text-slate-600">
                See engagement as it happens. Track scans, clicks, and conversions in real-time.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-2">ROI Proof</h3>
              <p className="text-sm text-slate-600">
                Finally prove direct mail ROI with pixel-perfect tracking. Justify every dollar spent.
              </p>
            </div>
          </div>
        </Card>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-center text-white mb-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Track Your Own Campaigns?</h2>
          <p className="text-lg text-indigo-100 mb-6">
            Create your first campaign and get the same pixel-perfect attribution for your offline marketing.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-indigo-600 hover:bg-indigo-50"
            onClick={handleCTAClick}
          >
            Start Your First Campaign
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Analytics Preview */}
        <div className="text-center">
          <p className="text-slate-600 mb-4">
            Want to see aggregate analytics across all demos?
          </p>
          <Button variant="outline" onClick={handleAnalyticsClick}>
            <BarChart3 className="h-4 w-4 mr-2" />
            View Public Analytics Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
