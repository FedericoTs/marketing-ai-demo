'use client';

/**
 * Performance Insights Widget
 *
 * Displays actionable insights:
 * - Top Performing Template (by response rate)
 * - Best Performing Locations (geographic)
 * - Recommendations based on data
 *
 * Dashboard Improvement - Nov 21, 2025
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Award, MapPin, FileImage } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TopTemplate {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  responseRate: number;
  campaignsUsed: number;
}

interface TopLocation {
  name: string;
  events: number;
}

interface PerformanceInsightsProps {
  topTemplate: TopTemplate | null;
  topLocations: TopLocation[];
  isLoading: boolean;
}

export function PerformanceInsights({
  topTemplate,
  topLocations,
  isLoading,
}: PerformanceInsightsProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-slate-200 rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-slate-100 rounded"></div>
            <div className="h-20 bg-slate-100 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = topTemplate || topLocations.length > 0;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Performance Insights
        </CardTitle>
        <CardDescription className="text-blue-700">
          Data-driven recommendations to improve your campaigns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!hasData ? (
          <div className="text-center py-8">
            <p className="text-slate-600 mb-2">
              No insights available yet
            </p>
            <p className="text-sm text-slate-500">
              Send campaigns to generate performance insights
            </p>
          </div>
        ) : (
          <>
            {/* Top Performing Template */}
            {topTemplate && (
              <div className="bg-white/80 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {topTemplate.thumbnailUrl ? (
                      <img
                        src={topTemplate.thumbnailUrl}
                        alt={topTemplate.name}
                        className="h-16 w-16 rounded object-cover border-2 border-blue-300"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded bg-blue-100 flex items-center justify-center border-2 border-blue-300">
                        <FileImage className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <h4 className="font-semibold text-slate-900">
                        Top Performing Template
                      </h4>
                    </div>
                    <p className="text-sm font-medium text-blue-900 truncate">
                      {topTemplate.name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-purple-600 font-semibold">
                        {topTemplate.responseRate.toFixed(1)}% response rate
                      </span>
                      <span className="text-slate-600">
                        Used in {topTemplate.campaignsUsed} campaign{topTemplate.campaignsUsed !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <Link href={`/templates?template=${topTemplate.id}`}>
                      <Button variant="link" size="sm" className="px-0 mt-2">
                        Use this template →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Best Performing Locations */}
            {topLocations.length > 0 && (
              <div className="bg-white/80 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <h4 className="font-semibold text-slate-900">
                    Top Performing Locations
                  </h4>
                </div>
                <div className="space-y-2">
                  {topLocations.map((location, index) => (
                    <div
                      key={location.name}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {location.name}
                        </span>
                      </div>
                      <span className="text-sm text-green-600 font-semibold">
                        {location.events} events
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  💡 Consider targeting more contacts in these high-performing areas
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
