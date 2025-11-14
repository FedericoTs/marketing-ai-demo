"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, TrendingUp, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeographicData {
  state: string;
  recipientCount: number;
  scans: number;
  conversions: number;
  scanRate: number;
  conversionRate: number;
}

export function GeographicPerformance() {
  const [data, setData] = useState<GeographicData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'scanRate' | 'conversions' | 'recipients'>('scanRate');

  useEffect(() => {
    loadGeographicData();
  }, []);

  const loadGeographicData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/geographic');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load geographic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedData = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'scanRate':
        return b.scanRate - a.scanRate;
      case 'conversions':
        return b.conversions - a.conversions;
      case 'recipients':
        return b.recipientCount - a.recipientCount;
      default:
        return 0;
    }
  });

  const maxScanRate = Math.max(...data.map(d => d.scanRate), 1);
  const maxConversionRate = Math.max(...data.map(d => d.conversionRate), 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Geographic Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
            <p className="text-slate-600">Loading geographic data...</p>
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
            <MapPin className="h-5 w-5 text-blue-600" />
            Geographic Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500 py-12">
            No geographic data available. Send campaigns to see regional performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Geographic Performance by State
        </CardTitle>
        <p className="text-sm text-slate-600 mt-2">
          Campaign performance metrics across {data.length} states
        </p>
      </CardHeader>
      <CardContent>
        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-sm text-slate-600">Sort by:</span>
          <button
            onClick={() => setSortBy('scanRate')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium transition-all",
              sortBy === 'scanRate'
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            QR Scan Rate
          </button>
          <button
            onClick={() => setSortBy('conversions')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium transition-all",
              sortBy === 'conversions'
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            Total Conversions
          </button>
          <button
            onClick={() => setSortBy('recipients')}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg font-medium transition-all",
              sortBy === 'recipients'
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            Recipients
          </button>
        </div>

        {/* Performance Table with Visual Bars */}
        <div className="space-y-3">
          {sortedData.slice(0, 15).map((state, index) => (
            <div
              key={state.state}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white hover:shadow-md transition-all duration-300"
            >
              {/* Background gradient based on performance */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ width: `${(state.scanRate / maxScanRate) * 100}%` }}
              />

              <div className="relative p-4">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Rank & State */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold",
                        index === 0
                          ? "bg-amber-100 text-amber-700"
                          : index === 1
                          ? "bg-slate-200 text-slate-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{state.state}</p>
                      <p className="text-xs text-slate-500">
                        <Users className="inline h-3 w-3 mr-1" />
                        {state.recipientCount.toLocaleString()} recipients
                      </p>
                    </div>
                  </div>

                  {/* Scan Rate Progress Bar */}
                  <div className="col-span-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">QR Scan Rate</span>
                      <span className="text-sm font-bold text-blue-700">
                        {state.scanRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(state.scanRate / maxScanRate) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Conversion Rate Progress Bar */}
                  <div className="col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">Conversion Rate</span>
                      <span className="text-sm font-bold text-emerald-700">
                        {state.conversionRate.toFixed(2)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(state.conversionRate / maxConversionRate) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Conversions Count */}
                  <div className="col-span-2 text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-sm font-bold text-emerald-900">
                        {state.conversions}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">conversions</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show More Indicator */}
        {data.length > 15 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Showing top 15 of {data.length} states
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900">
              {data.reduce((sum, s) => sum + s.recipientCount, 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 mt-1">Total Recipients</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.reduce((sum, s) => sum + s.scans, 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 mt-1">Total QR Scans</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {data.reduce((sum, s) => sum + s.conversions, 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-600 mt-1">Total Conversions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
