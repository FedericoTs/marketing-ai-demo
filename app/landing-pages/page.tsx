/**
 * Landing Pages Manager - List View
 *
 * Displays all landing pages for the organization with analytics.
 * Provides quick access to edit and view landing pages.
 *
 * Phase 9.2.13 - Landing Page Manager
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LandingPageManagerTable } from '@/components/landing-pages/landing-page-manager-table';
import { Search, RefreshCw, Globe, TrendingUp, Eye, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LandingPageWithAnalytics } from '@/lib/database/landing-page-analytics-queries';

export default function LandingPagesPage() {
  const [landingPages, setLandingPages] = useState<LandingPageWithAnalytics[]>([]);
  const [filteredPages, setFilteredPages] = useState<LandingPageWithAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLandingPages();
  }, []);

  useEffect(() => {
    // Filter landing pages by search term
    if (searchTerm.trim() === '') {
      setFilteredPages(landingPages);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = landingPages.filter((page) =>
        page.campaign_name.toLowerCase().includes(searchLower) ||
        page.template_type.toLowerCase().includes(searchLower) ||
        page.tracking_code.toLowerCase().includes(searchLower)
      );
      setFilteredPages(filtered);
    }
  }, [searchTerm, landingPages]);

  const loadLandingPages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/landing-pages');

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please sign in to view landing pages');
          return;
        }
        throw new Error('Failed to load landing pages');
      }

      const data = await response.json();
      if (data.success) {
        setLandingPages(data.data || []);
        setFilteredPages(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load landing pages');
      }
    } catch (error) {
      console.error('Error loading landing pages:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load landing pages');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLandingPages();
    setRefreshing(false);
    toast.success('Landing pages refreshed');
  };

  // Calculate summary stats
  const totalViews = landingPages.reduce((sum, p) => sum + p.analytics.views, 0);
  const totalConversions = landingPages.reduce((sum, p) => sum + p.analytics.conversions, 0);
  const avgConversionRate = landingPages.length > 0
    ? landingPages.reduce((sum, p) => sum + p.analytics.conversion_rate, 0) / landingPages.length
    : 0;
  const activePagesCount = landingPages.filter(p => p.is_active).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Globe className="h-8 w-8" />
            Landing Pages
          </h1>
          <p className="text-slate-600 mt-1">
            Manage and analyze all your landing pages in one place
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      {!loading && landingPages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Total Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {landingPages.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activePagesCount} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {totalViews.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Across all pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Total Conversions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalConversions.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                All landing pages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avg Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                avgConversionRate >= 5
                  ? 'text-green-600'
                  : avgConversionRate >= 2
                  ? 'text-yellow-600'
                  : 'text-slate-900'
              }`}>
                {avgConversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Average performance
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter */}
      {!loading && landingPages.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by campaign name, template type, or tracking code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchTerm && (
                <Button
                  variant="ghost"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-600"
                >
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landing Pages Table */}
      <LandingPageManagerTable
        landingPages={filteredPages}
        loading={loading}
      />

      {/* No Results Message */}
      {!loading && searchTerm && filteredPages.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                No landing pages match "{searchTerm}"
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Try adjusting your search terms
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
