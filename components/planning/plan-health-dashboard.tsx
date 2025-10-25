/**
 * Plan Health Dashboard - ULTRA SIMPLIFIED
 *
 * Makes plan quality obvious at a glance:
 * - Traffic light: Green = go, Yellow = review, Red = stop
 * - Big numbers for key metrics
 * - Visual badges for quick scanning
 * - Zero jargon, maximum clarity
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Users,
  Sparkles,
  Info,
  CircleDot,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PlanHealthDashboardProps {
  avgConfidence: number;
  highConfidenceStores: number;
  totalStores: number;
  expectedConversions: number;
  estimatedCost: number;
  totalQuantity: number;
}

/**
 * Calculate overall plan health score (0-100)
 * Simple formula: (avg_confidence * 0.7) + (high_conf_ratio * 30)
 */
function calculateHealthScore(
  avgConfidence: number,
  highConfidenceStores: number,
  totalStores: number
): number {
  if (totalStores === 0) return 0;
  const highConfRatio = (highConfidenceStores / totalStores) * 100;
  return Math.round(avgConfidence * 0.7 + highConfRatio * 0.3);
}

/**
 * Get health status: excellent, good, fair, poor
 */
function getHealthStatus(healthScore: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  message: string;
} {
  if (healthScore >= 80) {
    return {
      label: 'Excellent',
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-300',
      icon: CheckCircle2,
      message: 'Strong plan with high success probability. Ready to execute.',
    };
  } else if (healthScore >= 60) {
    return {
      label: 'Good',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-300',
      icon: CircleDot,
      message: 'Solid plan with good potential. Proceed with confidence.',
    };
  } else if (healthScore >= 40) {
    return {
      label: 'Fair',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50 border-yellow-300',
      icon: AlertTriangle,
      message: 'Moderate plan. Review recommendations and consider adjustments.',
    };
  } else {
    return {
      label: 'Needs Review',
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-300',
      icon: XCircle,
      message: 'Plan has concerns. Review risks carefully before proceeding.',
    };
  }
}

export function PlanHealthDashboard({
  avgConfidence,
  highConfidenceStores,
  totalStores,
  expectedConversions,
  estimatedCost,
  totalQuantity,
}: PlanHealthDashboardProps) {
  const healthScore = calculateHealthScore(avgConfidence, highConfidenceStores, totalStores);
  const status = getHealthStatus(healthScore);
  const Icon = status.icon;

  // Calculate cost per conversion
  const costPerConversion = expectedConversions > 0 ? estimatedCost / expectedConversions : 0;

  // Calculate expected ROI (simplified - assumes $50 value per conversion)
  const assumedValuePerConversion = 50;
  const expectedRevenue = expectedConversions * assumedValuePerConversion;
  const roi = estimatedCost > 0 ? ((expectedRevenue - estimatedCost) / estimatedCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Main Health Indicator - ULTRA PROMINENT */}
      <Card className={`border-2 ${status.bgColor}`}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            {/* Traffic Light Circle */}
            <div className="relative">
              <div className={`h-24 w-24 rounded-full ${status.bgColor} border-4 ${status.bgColor.replace('bg-', 'border-')} flex items-center justify-center`}>
                <Icon className={`h-12 w-12 ${status.color}`} />
              </div>
              {/* Health Score Badge */}
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <Badge className={`${status.bgColor} ${status.color} border-2 text-lg font-bold px-3 py-1`}>
                  {healthScore}
                </Badge>
              </div>
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold">Plan Health: {status.label}</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-5 w-5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Health score combines AI confidence ({avgConfidence.toFixed(0)}%) and proportion of high-confidence stores ({highConfidenceStores}/{totalStores}).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className={`text-lg ${status.color}`}>{status.message}</p>

              {/* Quick Stats Row */}
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <div className="text-sm text-muted-foreground">AI Confidence</div>
                  <div className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Strong Stores</div>
                  <div className="text-2xl font-bold">{highConfidenceStores}/{totalStores}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Risk Level</div>
                  <div className="text-2xl font-bold">
                    {healthScore >= 80 ? 'Low' : healthScore >= 60 ? 'Medium' : 'High'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators - 4 Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {/* Expected Conversions */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Expected Results</div>
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-1">
              {expectedConversions.toFixed(0)}
            </div>
            <div className="text-xs text-muted-foreground">conversions predicted</div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Progress value={Math.min((expectedConversions / 100) * 100, 100)} className="h-2 mt-2" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">Based on historical data and AI models</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>

        {/* Cost Per Conversion */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Cost Efficiency</div>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">
              ${costPerConversion.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">per conversion</div>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {costPerConversion < 5 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-green-600" />
                  <span className="text-green-600 font-medium">Excellent</span>
                </>
              ) : costPerConversion < 10 ? (
                <>
                  <span className="text-blue-600 font-medium">Good</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3 text-yellow-600" />
                  <span className="text-yellow-600 font-medium">High</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Investment */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Total Budget</div>
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">
              ${estimatedCost.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">{totalQuantity.toLocaleString()} pieces</div>
            <div className="mt-2 text-xs text-muted-foreground">
              ${(estimatedCost / totalQuantity).toFixed(2)}/piece
            </div>
          </CardContent>
        </Card>

        {/* Expected ROI */}
        <Card className="border-2 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-muted-foreground">Expected ROI</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Sparkles className="h-5 w-5 text-orange-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Assumes ${assumedValuePerConversion} value per conversion</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className={`text-3xl font-bold mb-1 ${roi > 100 ? 'text-green-600' : roi > 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {roi > 0 ? '+' : ''}{roi.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {roi > 0 ? 'positive return' : 'negative return'}
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs">
              {roi > 100 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600 font-medium">Excellent</span>
                </>
              ) : roi > 0 ? (
                <>
                  <span className="text-blue-600 font-medium">Profitable</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600 font-medium">Review</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Recommendations */}
      {healthScore < 60 && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-700 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-yellow-900 mb-2">Recommended Actions</h4>
                <ul className="space-y-2 text-sm text-yellow-800">
                  {avgConfidence < 60 && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Consider selecting higher-performing stores to improve plan confidence</span>
                    </li>
                  )}
                  {(highConfidenceStores / totalStores) < 0.5 && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Less than half your stores have high AI confidence - review store selection</span>
                    </li>
                  )}
                  {costPerConversion > 10 && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Cost per conversion is high - consider adjusting quantities or targeting</span>
                    </li>
                  )}
                  {roi < 0 && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1">•</span>
                      <span>Expected ROI is negative - plan may not be profitable with current assumptions</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Compact Plan Health Badge - For use in list views
 */
interface PlanHealthBadgeProps {
  avgConfidence: number;
  highConfidenceStores: number;
  totalStores: number;
}

export function PlanHealthBadge({
  avgConfidence,
  highConfidenceStores,
  totalStores,
}: PlanHealthBadgeProps) {
  const healthScore = calculateHealthScore(avgConfidence, highConfidenceStores, totalStores);
  const status = getHealthStatus(healthScore);
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${status.bgColor} ${status.color} border flex items-center gap-1.5 px-2 py-1`}>
            <Icon className="h-3.5 w-3.5" />
            <span className="font-semibold">{status.label}</span>
            <span className="text-xs opacity-75">({healthScore})</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{status.message}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
