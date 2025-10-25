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
 * ENHANCED: Ultra visual, user-friendly KPI display
 */
import { AIConfidenceBadge } from './ai-confidence-badge';
import { ScoreBreakdown } from './score-breakdown';
import { AIScoreGrid, QuickInsight } from './visual-kpi-cards';
import type { ConfidenceLevel } from '@/types/planning';
import { Sparkles, TrendingUp } from 'lucide-react';

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

  // Calculate average score for quick insight
  const scoreValues = [
    scores.store_performance,
    scores.creative_performance,
    scores.geographic_fit,
    scores.timing_alignment,
  ].filter((v) => v !== null) as number[];

  const avgScore = scoreValues.length > 0
    ? scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length
    : 0;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border">
      {/* Header: Confidence Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <div className="text-lg font-semibold">AI Recommendation</div>
        </div>
        <AIConfidenceBadge
          confidence={confidence}
          level={confidenceLevel}
          size="lg"
        />
      </div>

      {/* Quick Insight */}
      {avgScore >= 75 && (
        <QuickInsight
          type="success"
          message={`Strong recommendation: All factors score ${avgScore.toFixed(0)}/100 or higher. High probability of success.`}
        />
      )}
      {avgScore >= 50 && avgScore < 75 && (
        <QuickInsight
          type="info"
          message={`Moderate recommendation: Average score of ${avgScore.toFixed(0)}/100. Good potential with some considerations.`}
        />
      )}
      {avgScore < 50 && (
        <QuickInsight
          type="warning"
          message={`Consider alternatives: Average score below 50/100. Review risk factors carefully before proceeding.`}
        />
      )}

      {/* Expected Outcome - Enhanced Visual */}
      {expectedConversions !== null && expectedConversions !== undefined && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
          <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
              Expected Conversions
            </div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {expectedConversions.toFixed(1)}
            </div>
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 text-right">
            Predicted<br/>responses
          </div>
        </div>
      )}

      {/* Visual Score Grid - NEW! */}
      <div>
        <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <span>AI Analysis Factors</span>
          <span className="text-xs text-muted-foreground/70">(hover for details)</span>
        </div>
        <AIScoreGrid scores={scores} />
      </div>

      {/* Reasoning - Simplified */}
      {reasoning && reasoning.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Why This Recommendation?
          </div>
          <AIReasoningList reasoning={reasoning} compact />
        </div>
      )}

      {/* Risk Factors */}
      <AIRiskFactors risks={risks} />
    </div>
  );
}
