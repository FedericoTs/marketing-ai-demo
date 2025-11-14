"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  ArrowUpDown,
  Loader2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignComparison {
  campaignId: string;
  campaignName: string;
  status: string;
  totalRecipients: number;
  scans: number;
  conversions: number;
  scanRate: number;
  conversionRate: number;
  costTotal: number;
  costPerConversion: number | null;
  createdAt: string;
}

type SortKey = 'campaignName' | 'totalRecipients' | 'scanRate' | 'conversionRate' | 'costTotal' | 'costPerConversion';

export function CampaignCostComparison() {
  const [data, setData] = useState<CampaignComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('costTotal');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadComparisonData();
  }, []);

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/comparison');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load campaign comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];

    // Handle null values
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === null) return sortDirection === 'asc' ? -1 : 1;

    const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyPrecise = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const exportToCSV = () => {
    const headers = [
      'Campaign',
      'Status',
      'Recipients',
      'QR Scans',
      'Scan Rate %',
      'Conversions',
      'Conversion Rate %',
      'Total Cost',
      'Cost per Conversion',
      'Created At'
    ];

    const rows = sortedData.map(campaign => [
      campaign.campaignName,
      campaign.status,
      campaign.totalRecipients,
      campaign.scans,
      campaign.scanRate.toFixed(2),
      campaign.conversions,
      campaign.conversionRate.toFixed(2),
      campaign.costTotal.toFixed(2),
      campaign.costPerConversion?.toFixed(2) || 'N/A',
      new Date(campaign.createdAt).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Campaign Cost Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading campaign data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Campaign Cost Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-12">
            No campaign data available. Create campaigns to see cost comparisons.
          </p>
        </CardContent>
      </Card>
    );
  }

  const SortButton = ({ column, label }: { column: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(column)}
      className="flex items-center gap-1 hover:text-slate-900 transition-colors group"
    >
      {label}
      <ArrowUpDown className={cn(
        "h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity",
        sortKey === column && "opacity-100 text-blue-600"
      )} />
    </button>
  );

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Campaign Cost & Performance Comparison
            </CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              Comprehensive view of all campaigns with cost metrics and performance data
            </p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">
                    <SortButton column="campaignName" label="Campaign" />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    <SortButton column="totalRecipients" label="Recipients" />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    <SortButton column="scanRate" label="Scan Rate" />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    <SortButton column="conversionRate" label="Conv. Rate" />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    <SortButton column="costTotal" label="Total Cost" />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    <SortButton column="costPerConversion" label="Cost/Conv." />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((campaign, index) => (
                  <TableRow
                    key={campaign.campaignId}
                    className={cn(
                      "hover:bg-slate-50 transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-slate-25"
                    )}
                  >
                    <TableCell className="font-medium text-slate-900">
                      {campaign.campaignName}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        campaign.status === 'active'
                          ? "bg-emerald-100 text-emerald-700"
                          : campaign.status === 'paused'
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      )}>
                        {campaign.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {campaign.totalRecipients.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(campaign.scanRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-blue-700 w-12">
                          {campaign.scanRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${Math.min(campaign.conversionRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-emerald-700 w-12">
                          {campaign.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(campaign.costTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {campaign.costPerConversion !== null ? (
                        <span className="font-semibold text-emerald-700">
                          {formatCurrencyPrecise(campaign.costPerConversion)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Row */}
        <div className="mt-6 grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-1">Total Campaigns</p>
            <p className="text-2xl font-bold text-slate-900">{data.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-1">Total Recipients</p>
            <p className="text-2xl font-bold text-slate-900">
              {data.reduce((sum, c) => sum + c.totalRecipients, 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-1">Total Investment</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(data.reduce((sum, c) => sum + c.costTotal, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-600 mb-1">Total Conversions</p>
            <p className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
