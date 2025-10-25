/**
 * Score Breakdown Component
 * Visual display of 4-factor AI scoring with progress bars
 * Shows WHY the AI made this recommendation
 */

import { Progress } from '@/components/ui/progress';
import { Store, Image, MapPin, Clock } from 'lucide-react';

interface ScoreBreakdownProps {
  scores: {
    store_performance: number | null; // 0-100
    creative_performance: number | null; // 0-100
    geographic_fit: number | null; // 0-100
    timing_alignment: number | null; // 0-100
  };
  compact?: boolean;
}

export function ScoreBreakdown({ scores, compact = false }: ScoreBreakdownProps) {
  const scoreItems = [
    {
      key: 'store_performance',
      label: 'Store Performance',
      description: 'Historical conversion rate at this store',
      icon: Store,
      value: scores.store_performance,
      color: 'bg-blue-500',
    },
    {
      key: 'creative_performance',
      label: 'Creative Performance',
      description: 'How well this campaign works at similar stores',
      icon: Image,
      value: scores.creative_performance,
      color: 'bg-purple-500',
    },
    {
      key: 'geographic_fit',
      label: 'Geographic Fit',
      description: 'Regional and demographic alignment',
      icon: MapPin,
      value: scores.geographic_fit,
      color: 'bg-green-500',
    },
    {
      key: 'timing_alignment',
      label: 'Timing Alignment',
      description: 'Seasonal and calendar fit',
      icon: Clock,
      value: scores.timing_alignment,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="text-sm font-medium text-muted-foreground">
          AI Score Breakdown
        </div>
      )}

      <div className="space-y-3">
        {scoreItems.map((item) => {
          const Icon = item.icon;
          const value = item.value || 0;

          // Color coding for score value
          const scoreColor =
            value >= 75 ? 'text-green-600' :
            value >= 50 ? 'text-yellow-600' :
            'text-red-600';

          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color.replace('bg-', 'text-')}`} />
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                  {!compact && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.description}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-bold ${scoreColor}`}>
                  {value.toFixed(0)}
                </span>
              </div>

              <Progress
                value={value}
                className="h-2"
                indicatorClassName={item.color}
              />
            </div>
          );
        })}
      </div>

      {!compact && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          All scores on 0-100 scale. Higher is better.
        </div>
      )}
    </div>
  );
}

/**
 * Compact Score Summary - Just averages
 */
export function ScoreSummary({ scores }: { scores: { store_performance: number | null; creative_performance: number | null; geographic_fit: number | null; timing_alignment: number | null } }) {
  const values = [
    scores.store_performance,
    scores.creative_performance,
    scores.geographic_fit,
    scores.timing_alignment,
  ].filter((v) => v !== null) as number[];

  if (values.length === 0) return null;

  const average = values.reduce((sum, v) => sum + v, 0) / values.length;

  const colorClass =
    average >= 75 ? 'text-green-600' :
    average >= 50 ? 'text-yellow-600' :
    'text-red-600';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Avg Score:</span>
      <span className={`text-sm font-bold ${colorClass}`}>
        {average.toFixed(0)}
      </span>
    </div>
  );
}
