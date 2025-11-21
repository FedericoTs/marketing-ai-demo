'use client';

/**
 * Landing Page Manager Table
 *
 * Displays all landing pages with analytics for the organization.
 * Includes views, scans, conversions, and conversion rates.
 *
 * Phase 9.2.13 - Landing Page Manager
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ExternalLink,
  Edit,
  TrendingUp,
  Eye,
  QrCode,
  CheckCircle2,
  Circle
} from 'lucide-react';
import type { LandingPageWithAnalytics } from '@/lib/database/landing-page-analytics-queries';

interface LandingPageManagerTableProps {
  landingPages: LandingPageWithAnalytics[];
  loading?: boolean;
}

export function LandingPageManagerTable({
  landingPages,
  loading = false
}: LandingPageManagerTableProps) {
  const router = useRouter();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    // For MVP, just visit the landing page
    // router.push(`/landing-pages/${id}/edit`);
    // Instead, for now we just highlight that editing is not yet implemented
    window.alert('Editor coming soon! For now, you can view the landing page.');
  };

  const handleVisit = (trackingCode: string) => {
    window.open(`/lp/${trackingCode}`, '_blank');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatConversionRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-3"></div>
          <p className="text-sm text-slate-600">Loading landing pages...</p>
        </div>
      </div>
    );
  }

  if (landingPages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="text-center max-w-md">
          <div className="bg-slate-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No landing pages yet
          </h3>
          <p className="text-sm text-slate-600">
            Landing pages will appear here after you create campaigns with personalized content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Campaign</TableHead>
            <TableHead className="font-semibold">Template</TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Views
              </div>
            </TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                <QrCode className="h-3.5 w-3.5" />
                Scans
              </div>
            </TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Conversions
              </div>
            </TableHead>
            <TableHead className="font-semibold text-center">
              <div className="flex items-center justify-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Rate
              </div>
            </TableHead>
            <TableHead className="font-semibold">Created</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {landingPages.map((page) => (
            <TableRow
              key={page.id}
              className="hover:bg-slate-50 transition-colors cursor-pointer"
              onMouseEnter={() => setHoveredRow(page.id)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => handleEdit(page.id)}
            >
              {/* Status */}
              <TableCell>
                {page.is_active ? (
                  <div className="flex items-center gap-1.5 text-green-600">
                    <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse"></div>
                    <span className="text-xs font-medium">Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Circle className="h-2 w-2" />
                    <span className="text-xs font-medium">Inactive</span>
                  </div>
                )}
              </TableCell>

              {/* Campaign */}
              <TableCell>
                <div className="font-medium text-slate-900">
                  {page.campaign_name}
                </div>
              </TableCell>

              {/* Template */}
              <TableCell>
                <Badge variant="outline" className="font-normal capitalize">
                  {page.template_type}
                </Badge>
              </TableCell>

              {/* Views */}
              <TableCell className="text-center">
                <span className="font-medium text-slate-900">
                  {page.analytics.views.toLocaleString()}
                </span>
              </TableCell>

              {/* Scans */}
              <TableCell className="text-center">
                <span className="font-medium text-purple-600">
                  {page.analytics.scans.toLocaleString()}
                </span>
              </TableCell>

              {/* Conversions */}
              <TableCell className="text-center">
                <span className="font-medium text-green-600">
                  {page.analytics.conversions.toLocaleString()}
                </span>
              </TableCell>

              {/* Conversion Rate */}
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className={`font-semibold ${
                    page.analytics.conversion_rate >= 5
                      ? 'text-green-600'
                      : page.analytics.conversion_rate >= 2
                      ? 'text-yellow-600'
                      : 'text-slate-600'
                  }`}>
                    {formatConversionRate(page.analytics.conversion_rate)}
                  </span>
                </div>
              </TableCell>

              {/* Created Date */}
              <TableCell>
                <span className="text-sm text-slate-600">
                  {formatDate(page.created_at)}
                </span>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-right">
                <div
                  className="flex items-center justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVisit(page.tracking_code)}
                    className="h-8"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Visit
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleEdit(page.id)}
                    className="h-8"
                  >
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Summary Footer */}
      <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            Showing <span className="font-medium text-slate-900">{landingPages.length}</span> landing page{landingPages.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-slate-600">
              Active: <span className="font-medium text-green-600">
                {landingPages.filter(p => p.is_active).length}
              </span>
            </span>
            <span className="text-slate-600">
              Total Views: <span className="font-medium text-slate-900">
                {landingPages.reduce((sum, p) => sum + p.analytics.views, 0).toLocaleString()}
              </span>
            </span>
            <span className="text-slate-600">
              Total Conversions: <span className="font-medium text-green-600">
                {landingPages.reduce((sum, p) => sum + p.analytics.conversions, 0).toLocaleString()}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
