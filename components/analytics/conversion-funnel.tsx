"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingDown } from "lucide-react";

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
}

interface ConversionFunnelProps {
  data: FunnelData[];
  loading?: boolean;
  title?: string;
}

export function ConversionFunnel({
  data,
  loading = false,
  title = "Conversion Funnel",
}: ConversionFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-96 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-600">Loading funnel data...</p>
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
        <CardContent className="h-96 flex items-center justify-center">
          <p className="text-sm text-slate-600">No funnel data available</p>
        </CardContent>
      </Card>
    );
  }

  const getStageColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-green-500",
    ];
    return colors[index] || "bg-slate-500";
  };

  const getStageColorLight = (index: number) => {
    const colors = [
      "bg-blue-50 border-blue-200",
      "bg-purple-50 border-purple-200",
      "bg-green-50 border-green-200",
    ];
    return colors[index] || "bg-slate-50 border-slate-200";
  };

  const getStageTextColor = (index: number) => {
    const colors = [
      "text-blue-900",
      "text-purple-900",
      "text-green-900",
    ];
    return colors[index] || "text-slate-900";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {title}
          <TrendingDown className="h-5 w-5 text-slate-500" />
        </CardTitle>
        <p className="text-sm text-slate-600">
          Track how recipients progress through your campaign
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((stage, index) => {
            const dropoffPercent =
              index > 0 ? data[index - 1].percentage - stage.percentage : 0;

            return (
              <div key={stage.stage}>
                {/* Funnel Stage */}
                <div
                  className={`relative rounded-lg border-2 p-6 transition-all ${getStageColorLight(
                    index
                  )}`}
                  style={{
                    width: `${Math.max(stage.percentage, 20)}%`,
                    marginLeft: "auto",
                    marginRight: "auto",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-semibold ${getStageTextColor(
                          index
                        )}`}
                      >
                        {stage.stage}
                      </h3>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {stage.count.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getStageColor(
                          index
                        )} text-white font-bold text-lg`}
                      >
                        {Math.round(stage.percentage)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Drop-off Indicator */}
                {index < data.length - 1 && dropoffPercent > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span>
                        <span className="font-semibold text-red-600">
                          {dropoffPercent.toFixed(1)}%
                        </span>{" "}
                        drop-off
                      </span>
                      <span className="text-xs text-slate-500">
                        ({(data[index].count - data[index + 1].count).toLocaleString()}{" "}
                        people)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Overall Conversion Rate:</span>
            <span className="text-xl font-bold text-green-600">
              {(data[data.length - 1]?.percentage || 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
