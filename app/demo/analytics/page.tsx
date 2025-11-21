/**
 * Demo Analytics Dashboard
 *
 * Public analytics dashboard showing aggregate metrics across all demo submissions.
 * Demonstrates real-time attribution tracking capabilities.
 *
 * Phase 9.2.15 - Interactive Demo System
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, Mail, QrCode, Eye, MousePointerClick, FileText } from 'lucide-react';

interface Analytics {
  total_submissions: number;
  total_emails_sent: number;
  total_qr_scans: number;
  total_page_views: number;
  total_cta_clicks: number;
  total_form_submits: number;
  qr_scan_rate: number;
  page_view_rate: number;
  engagement_rate: number;
}

export default function DemoAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    // Refresh every 5 seconds
    const interval = setInterval(loadAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/demo/analytics');
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <img src="/images/logo_icon_tbg.png" alt="DropLab" className="h-6 w-auto" />
                <span className="font-bold text-slate-900">Demo Analytics</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
              Live
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Real-Time Demo Analytics
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            This is what you'll see for YOUR campaigns. Every metric updates in real-time.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total Submissions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Demo Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{analytics.total_submissions}</div>
              <p className="text-sm text-slate-500 mt-1">Total signups</p>
            </CardContent>
          </Card>

          {/* Emails Sent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Emails Delivered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{analytics.total_emails_sent}</div>
              <p className="text-sm text-slate-500 mt-1">Postcards sent</p>
            </CardContent>
          </Card>

          {/* QR Scans */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{analytics.total_qr_scans}</div>
              <p className="text-sm text-green-600 mt-1">{analytics.qr_scan_rate.toFixed(1)}% scan rate</p>
            </CardContent>
          </Card>

          {/* Page Views */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{analytics.total_page_views}</div>
              <p className="text-sm text-slate-500 mt-1">Landing page visits</p>
            </CardContent>
          </Card>

          {/* CTA Clicks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <MousePointerClick className="h-4 w-4" />
                CTA Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{analytics.total_cta_clicks}</div>
              <p className="text-sm text-green-600 mt-1">{analytics.engagement_rate.toFixed(1)}% engagement</p>
            </CardContent>
          </Card>

          {/* Form Submits */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{analytics.total_form_submits}</div>
              <p className="text-sm text-slate-500 mt-1">Form submissions</p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Card */}
        <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">This is What You Get With DropLab</h2>
            <p className="text-lg text-indigo-100 mb-6 max-w-2xl mx-auto">
              Pixel-perfect attribution for every offline campaign. Track scans, clicks, and conversions in real-time.
            </p>
            <Link href="/auth/signup">
              <Button size="lg" variant="secondary" className="bg-white text-indigo-600 hover:bg-indigo-50">
                Start Tracking Your Campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
