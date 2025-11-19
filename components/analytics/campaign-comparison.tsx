"use client";
// Updated: 2025-11-18 to fix undefined field access errors

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Loader2, BarChart3 } from "lucide-react";

interface CampaignComparisonData {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  uniqueVisitors: number;
  totalPageViews: number;
  totalConversions: number;
  conversionRate: number;
}

interface CampaignComparisonProps {
  data: CampaignComparisonData[];
  loading?: boolean;
  title?: string;
  metric?: "recipients" | "visitors" | "conversions" | "conversionRate";
}

export function CampaignComparison({
  data,
  loading = false,
  title = "Campaign Comparison",
  metric = "conversionRate",
}: CampaignComparisonProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-600">Loading comparison data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-sm text-slate-600">No campaigns to compare</p>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData = data.map((campaign) => ({
    name: campaign.name?.length > 20 ? campaign.name.substring(0, 20) + "..." : campaign.name || 'Unnamed',
    fullName: campaign.name || 'Unnamed',
    recipients: campaign.totalRecipients || 0,
    visitors: campaign.uniqueVisitors || 0,
    conversions: campaign.totalConversions || 0,
    conversionRate: campaign.conversionRate || 0,
  }));

  const getMetricConfig = () => {
    switch (metric) {
      case "recipients":
        return {
          dataKey: "recipients",
          name: "Recipients",
          color: "#3b82f6",
        };
      case "visitors":
        return {
          dataKey: "visitors",
          name: "Visitors",
          color: "#8b5cf6",
        };
      case "conversions":
        return {
          dataKey: "conversions",
          name: "Conversions",
          color: "#10b981",
        };
      case "conversionRate":
        return {
          dataKey: "conversionRate",
          name: "Conversion Rate (%)",
          color: "#f59e0b",
        };
      default:
        return {
          dataKey: "conversionRate",
          name: "Conversion Rate (%)",
          color: "#f59e0b",
        };
    }
  };

  const metricConfig = getMetricConfig();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-slate-600">
          Compare performance across campaigns
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "#0f172a", fontWeight: 600 }}
              formatter={(value: number, name: string) => [
                metric === "conversionRate" ? `${value}%` : value,
                metricConfig.name,
              ]}
              labelFormatter={(label: string) => {
                const campaign = chartData.find((c) => c.name === label);
                return campaign?.fullName || label;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
              iconType="rect"
            />
            <Bar
              dataKey={metricConfig.dataKey}
              name={metricConfig.name}
              fill={metricConfig.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Campaign Details Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 font-semibold text-slate-900">
                  Campaign
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-900">
                  Recipients
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-900">
                  Visitors
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-900">
                  Conversions
                </th>
                <th className="text-right py-2 px-2 font-semibold text-slate-900">
                  Conv. Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((campaign) => (
                <tr key={campaign.id} className="border-b border-slate-100">
                  <td className="py-2 px-2 font-medium text-slate-900">
                    {campaign.name}
                  </td>
                  <td className="text-right py-2 px-2 text-slate-700">
                    {(campaign.totalRecipients || 0).toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 text-slate-700">
                    {(campaign.uniqueVisitors || 0).toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 text-slate-700">
                    {(campaign.totalConversions || 0).toLocaleString()}
                  </td>
                  <td className="text-right py-2 px-2 font-semibold text-green-600">
                    {(campaign.conversionRate || 0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
