/**
 * AI Reasoning Components
 * Display reasoning bullets and risk factors
 * Explains WHY the AI made this recommendation
 */

import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface AIReasoningListProps {
  reasoning: string[] | null;
  compact?: boolean;
}

/**
 * Reasoning List - Bullet points explaining AI logic
 */
export function AIReasoningList({ reasoning, compact = false }: AIReasoningListProps) {
  if (!reasoning || reasoning.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No reasoning data available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4" />
          Why AI Recommended This
        </div>
      )}

      <ul className="space-y-2">
        {reasoning.map((reason, index) => (
          <li key={index} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm leading-relaxed">{reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface AIRiskFactorsProps {
  risks: string[] | null;
  compact?: boolean;
}

/**
 * Risk Factors - Warning badges for concerns
 */
export function AIRiskFactors({ risks, compact = false }: AIRiskFactorsProps) {
  if (!risks || risks.length === 0) {
    return null; // Don't show anything if no risks
  }

  if (compact) {
    // Compact mode: Just warning badges
    return (
      <div className="flex flex-wrap gap-2">
        {risks.map((risk, index) => (
          <Badge
            key={index}
            variant="outline"
            className="bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            {risk}
          </Badge>
        ))}
      </div>
    );
  }

  // Full mode: Alert box with list
  return (
    <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-300 dark:border-yellow-700">
      <AlertTriangle className="h-4 w-4 text-yellow-800 dark:text-yellow-300" />
      <AlertDescription>
        <div className="space-y-2">
          <div className="font-medium text-yellow-800 dark:text-yellow-300">
            Potential Risks
          </div>
          <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
            {risks.map((risk, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Combined AI Reasoning Panel
 * Shows confidence + scores + reasoning + risks all together
 */
import { AIConfidenceBadge } from './ai-confidence-badge';
import { ScoreBreakdown } from './score-breakdown';
import type { ConfidenceLevel } from '@/types/planning';

interface AIReasoningPanelProps {
  confidence: number | null;
  confidenceLevel: ConfidenceLevel | null;
  scores: {
    store_performance: number | null;
    creative_performance: number | null;
    geographic_fit: number | null;
    timing_alignment: number | null;
  };
  reasoning: string[] | null;
  risks: string[] | null;
  expectedConversions?: number | null;
}

export function AIReasoningPanel({
  confidence,
  confidenceLevel,
  scores,
  reasoning,
  risks,
  expectedConversions,
}: AIReasoningPanelProps) {
  // Handle missing data
  if (!confidence || !confidenceLevel) {
    return (
      <div className="p-6 bg-muted/50 rounded-lg">
        <div className="text-center text-muted-foreground text-sm">
          No AI recommendation data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-muted/30 rounded-lg border">
      {/* Header: Confidence Badge */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">AI Recommendation</div>
        <AIConfidenceBadge
          confidence={confidence}
          level={confidenceLevel}
          size="lg"
        />
      </div>

      {/* Expected Outcome */}
      {expectedConversions !== null && expectedConversions !== undefined && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm font-medium text-blue-900 dark:text-blue-300">
            Expected Conversions
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {expectedConversions.toFixed(1)}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <ScoreBreakdown scores={scores} />

      {/* Reasoning */}
      <AIReasoningList reasoning={reasoning} />

      {/* Risk Factors */}
      <AIRiskFactors risks={risks} />
    </div>
  );
}
