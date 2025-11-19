"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
// Import standardized KPI utilities for consistent calculations
import { calculateConversionRate, formatPercentage } from "@/lib/utils/kpi-calculator";

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
  metrics: {
    totalRecipients: number;
    qrScans: number;
    landingPageVisits: number;
    totalCalls: number;
    webAppointments: number;
    callAppointments: number;
    totalConverted: number; // All web conversions + call appointments
  };
}

interface NivoNode {
  id: string;
  nodeColor?: string;
}

interface NivoLink {
  source: string;
  target: string;
  value: number;
}

interface NivoSankeyData {
  nodes: NivoNode[];
  links: NivoLink[];
}

interface SankeyChartProps {
  startDate?: string;
  endDate?: string;
}

export function SankeyChart({ startDate, endDate }: SankeyChartProps) {
  const [data, setData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      }

      const url = `/api/analytics/sankey${params.toString() ? `?${params.toString()}` : ""}`;

      // Debug logging
      console.log('[Sankey] Loading data with dates:', { startDate, endDate, url });

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        console.log('[Sankey Client] ✅ Data loaded successfully:', {
          nodesCount: result.data.nodes?.length || 0,
          linksCount: result.data.links?.length || 0,
          metrics: result.data.metrics
        });

        if (!result.data.links || result.data.links.length === 0) {
          console.warn('[Sankey Client] ⚠️  WARNING: Received EMPTY links array! Will show "No data" message.');
          console.warn('[Sankey Client] Metrics received:', result.data.metrics);
        }

        setData(result.data);
      } else {
        console.error('[Sankey Client] ❌ API returned success: false', result);
      }
    } catch (error) {
      console.error("[Sankey Client] ❌ Failed to load Sankey chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Customer Journey Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-600">Loading journey flow...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.links.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Customer Journey Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-slate-600 mb-2">No customer journey data available</p>
            <p className="text-xs text-slate-500">
              Data will appear once recipients interact with campaigns
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Nivo Sankey
  // Nivo uses string IDs for nodes, not indices
  const nivoData: NivoSankeyData = {
    nodes: data.nodes.map((node, idx) => {
      // Color coding:
      // Recipients - Blue (start)
      // No Engagement - Gray (inactive)
      // QR/Landing - Purple (digital path)
      // Calls - Orange (phone path)
      // Appointments - Green (conversions)
      let nodeColor = "#64748b"; // default slate

      if (node.name === "Recipients") nodeColor = "#3b82f6"; // blue
      else if (node.name === "No Engagement") nodeColor = "#cbd5e1"; // light slate (inactive)
      else if (node.name === "QR Scans") nodeColor = "#a855f7"; // purple
      else if (node.name === "Landing Page Visits") nodeColor = "#8b5cf6"; // violet
      else if (node.name === "Calls Received") nodeColor = "#f97316"; // orange
      else if (node.name === "Web Conversions") nodeColor = "#10b981"; // green (appointments, downloads, forms)
      else if (node.name === "Call Appointments") nodeColor = "#059669"; // emerald

      return {
        id: node.name,
        nodeColor,
      };
    }),
    links: data.links.map((link) => ({
      source: data.nodes[link.source].name,
      target: data.nodes[link.target].name,
      value: link.value,
    })),
  };

  // Calculate conversion rates for insights using standardized utilities
  const qrConversionRate = formatPercentage(
    calculateConversionRate(data.metrics.qrScans || 0, data.metrics.totalRecipients || 0),
    1
  );

  const landingConversionRate = formatPercentage(
    calculateConversionRate(data.metrics.landingPageVisits || 0, data.metrics.totalRecipients || 0),
    1
  );

  const callEngagementRate = formatPercentage(
    calculateConversionRate(data.metrics.totalCalls || 0, data.metrics.totalRecipients || 0),
    1
  );

  const callToApptRate = formatPercentage(
    calculateConversionRate(data.metrics.callAppointments || 0, data.metrics.totalCalls || 0),
    1
  );

  const webToApptRate = formatPercentage(
    calculateConversionRate(data.metrics.webAppointments || 0, data.metrics.landingPageVisits || 0),
    1
  );

  const overallConversionRate = formatPercentage(
    calculateConversionRate(data.metrics.totalConverted || 0, data.metrics.totalRecipients || 0),
    1
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Customer Journey Flow
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Multi-path conversion funnel showing how recipients engage through digital (QR/Web) and phone channels
        </p>
      </CardHeader>
      <CardContent>
        {/* Sankey Diagram */}
        <div className="h-[500px] w-full">
          <ResponsiveSankey
            data={nivoData}
            margin={{ top: 40, right: 200, bottom: 40, left: 160 }}
            align="justify"
            colors={(node) => {
              // Use custom colors from nodeColor
              return (node as any).nodeColor || '#64748b';
            }}
            nodeOpacity={1}
            nodeHoverOthersOpacity={0.35}
            nodeThickness={24}
            nodeSpacing={32}
            nodeBorderWidth={0}
            nodeBorderRadius={4}
            linkOpacity={0.6}
            linkHoverOthersOpacity={0.15}
            linkContract={4}
            enableLinkGradient={true}
            labelPosition="outside"
            labelOrientation="horizontal"
            labelPadding={20}
            labelTextColor="#1e293b"
            label={(node) => `${node.id} (${node.value?.toLocaleString() || 0})`}
            nodeTooltip={({ node }) => (
              <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-900">{node.id}</div>
                <div className="text-sm text-slate-600 mt-1">
                  Total: <span className="font-medium text-slate-900">{node.value?.toLocaleString()}</span>
                </div>
              </div>
            )}
            linkTooltip={({ link }) => (
              <div className="bg-white px-3 py-2 shadow-lg rounded-lg border border-slate-200">
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">{link.source.id}</span>
                  {' → '}
                  <span className="font-medium text-slate-900">{link.target.id}</span>
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Flow: <span className="font-medium text-slate-900">{link.value.toLocaleString()}</span>
                  {link.source.value && link.source.value > 0 && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({formatPercentage(calculateConversionRate(link.value, link.source.value), 1)} of source)
                    </span>
                  )}
                </div>
              </div>
            )}
          />
        </div>

        {/* Key Metrics Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Digital Path */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <p className="text-sm font-semibold text-purple-900">Digital Path</p>
            </div>
            <div className="space-y-1 text-xs text-purple-800">
              <div className="flex justify-between">
                <span>QR Engagement:</span>
                <span className="font-medium">{qrConversionRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Landing Visits:</span>
                <span className="font-medium">{landingConversionRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Web → Conv:</span>
                <span className="font-medium">{webToApptRate}</span>
              </div>
            </div>
          </div>

          {/* Phone Path */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <p className="text-sm font-semibold text-orange-900">Phone Path</p>
            </div>
            <div className="space-y-1 text-xs text-orange-800">
              <div className="flex justify-between">
                <span>Call Engagement:</span>
                <span className="font-medium">{callEngagementRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Calls → Appt:</span>
                <span className="font-medium">{callToApptRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Calls:</span>
                <span className="font-medium">{data.metrics.totalCalls?.toLocaleString() || 0}</span>
              </div>
            </div>
          </div>

          {/* Overall Performance */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <p className="text-sm font-semibold text-green-900">Overall Performance</p>
            </div>
            <div className="space-y-1 text-xs text-green-800">
              <div className="flex justify-between">
                <span>Conversion Rate:</span>
                <span className="font-medium">{overallConversionRate}</span>
              </div>
              <div className="flex justify-between">
                <span>Converted:</span>
                <span className="font-medium">{(data.metrics.totalConverted || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Recipients:</span>
                <span className="font-medium">{(data.metrics.totalRecipients || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-900">
              <p className="font-semibold mb-1">Key Insights:</p>
              <ul className="space-y-1 list-disc list-inside">
                {parseFloat(callToApptRate) > 50 && (
                  <li>
                    <span className="font-medium text-green-700">Strong phone conversion:</span> {callToApptRate} of calls result in appointments
                  </li>
                )}
                {(data.metrics.qrScans || 0) === 0 && (data.metrics.totalRecipients || 0) > 0 && (
                  <li>
                    <span className="font-medium text-amber-700">Opportunity:</span> No QR code scans yet - consider testing different QR placements or incentives
                  </li>
                )}
                {parseFloat(callEngagementRate) > 1 && (
                  <li>
                    <span className="font-medium text-blue-700">Phone is primary channel:</span> {callEngagementRate} of recipients are calling directly
                  </li>
                )}
                {(data.metrics.landingPageVisits || 0) > 0 && (data.metrics.webAppointments || 0) === 0 && (
                  <li>
                    <span className="font-medium text-amber-700">Opportunity:</span> Landing page visits not converting - optimize web booking flow
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Attribution Note */}
        <div className="mt-3 p-2 bg-slate-50 rounded text-xs text-slate-600 flex items-start gap-2">
          <Info className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
          <p>
            <span className="font-medium">Attribution Note:</span> Since a single phone number is used across all campaigns,
            calls are shown as an independent path from recipients. Future enhancements could include unique tracking numbers per campaign.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
