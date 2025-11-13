'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Copy, ExternalLink, Search, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { LandingPage } from '@/lib/database/types';

interface LandingPagesTableProps {
  campaignId: string;
}

export function LandingPagesTable({ campaignId }: LandingPagesTableProps) {
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load landing pages on mount
  useEffect(() => {
    loadLandingPages();
  }, [campaignId]);

  const loadLandingPages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${campaignId}/landing-pages`);
      
      if (response.ok) {
        const data = await response.json();
        setLandingPages(data.data?.landingPages || []);
      } else {
        toast.error('Failed to load landing pages');
      }
    } catch (error) {
      console.error('Error loading landing pages:', error);
      toast.error('Error loading landing pages');
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingCode = async (trackingCode: string, id: string) => {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopiedId(id);
      toast.success('Tracking code copied!');
      
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy tracking code');
    }
  };

  const copyLandingPageUrl = async (trackingCode: string) => {
    const url = `${window.location.origin}/lp/${trackingCode}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Landing page URL copied!');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const openLandingPage = (trackingCode: string) => {
    window.open(`/lp/${trackingCode}`, '_blank');
  };

  // Filter landing pages by search term
  const filteredPages = landingPages.filter((page) => {
    const searchLower = searchTerm.toLowerCase();
    const recipientName = page.recipient_data
      ? `${page.recipient_data.firstName || ''} ${page.recipient_data.lastName || ''}`.toLowerCase()
      : '';
    
    return (
      page.tracking_code.toLowerCase().includes(searchLower) ||
      recipientName.includes(searchLower) ||
      (page.recipient_data?.city || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">Loading landing pages...</div>
        </CardContent>
      </Card>
    );
  }

  if (landingPages.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Globe className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No landing pages yet</p>
            <p className="text-sm text-slate-500 mt-1">
              Landing pages will appear here after campaign creation
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Landing Pages
            </CardTitle>
            <CardDescription>
              {landingPages.length} personalized landing page{landingPages.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, code, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Recipient
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Location
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Tracking Code
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Template
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPages.map((page) => {
                const recipientName = page.recipient_data
                  ? `${page.recipient_data.firstName || ''} ${page.recipient_data.lastName || ''}`.trim()
                  : 'Unknown Recipient';
                
                const location = page.recipient_data
                  ? [page.recipient_data.city, page.recipient_data.state]
                      .filter(Boolean)
                      .join(', ')
                  : '-';

                return (
                  <tr
                    key={page.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{recipientName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-600">{location}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                          {page.tracking_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyTrackingCode(page.tracking_code, page.id)}
                        >
                          {copiedId === page.id ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded capitalize">
                        {page.template_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyLandingPageUrl(page.tracking_code)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy URL
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openLandingPage(page.tracking_code)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Visit
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* No results */}
        {filteredPages.length === 0 && searchTerm && (
          <div className="text-center py-8">
            <p className="text-slate-500">No landing pages match "{searchTerm}"</p>
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Showing {filteredPages.length} of {landingPages.length} landing pages
            </span>
            <span>
              {landingPages.filter((p) => p.is_active).length} active
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
