/**
 * Performance Comparison Visual Component
 *
 * Shows scientifically-backed comparison between AI and user override
 * in an extremely simple, visual way.
 *
 * Design Philosophy:
 * - SIMPLE: Users see "8.7 vs 6.2 conversions" not "p-value: 0.03"
 * - VISUAL: Green = good, Red = bad, color-coded everything
 * - CLEAR: Direct recommendation, no ambiguity
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { PerformanceComparison } from '@/lib/analytics/performance-predictor';

interface PerformanceComparisonProps {
  comparison: PerformanceComparison;
  className?: string;
}

export function PerformanceComparisonVisual({ comparison, className = '' }: PerformanceComparisonProps) {
  const { aiPrediction, userOverride, delta, recommendation, confidence, dataQuality } = comparison;

  // Determine visual styling based on recommendation
  const getRecommendationStyle = () => {
    if (recommendation === 'favor_ai') {
      return {
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
        message: 'AI recommendation performs better based on historical data',
      };
    } else if (recommendation === 'favor_override') {
      return {
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        message: 'Your override may perform better based on historical data',
      };
    } else {
      return {
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Info className="h-5 w-5 text-blue-600" />,
        message: 'Both choices show similar expected performance',
      };
    }
  };

  const style = getRecommendationStyle();

  // Format numbers for display (with null safety)
  const formatConversions = (num: number | null | undefined) =>
    num != null ? num.toFixed(1) : '0.0';
  const formatRate = (num: number | null | undefined) =>
    num != null ? `${num.toFixed(1)}%` : '0.0%';
  const formatCost = (num: number | null | undefined) =>
    num != null && isFinite(num) ? `$${num.toFixed(2)}` : 'N/A';
  const formatDelta = (num: number | null | undefined) =>
    num != null ? (num > 0 ? `+${num.toFixed(1)}` : num.toFixed(1)) : '0.0';
  const formatDeltaPercent = (num: number | null | undefined) => {
    if (num == null) return '0%';
    const abs = Math.abs(num);
    const sign = num > 0 ? '+' : '';
    return `${sign}${abs.toFixed(0)}%`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with Recommendation */}
      <div className={`p-4 rounded-lg border ${style.bgColor} ${style.borderColor}`}>
        <div className="flex items-start gap-3">
          {style.icon}
          <div className="flex-1">
            <h4 className={`font-semibold ${style.color}`}>Performance Comparison</h4>
            <p className="text-sm text-slate-700 mt-1">{style.message}</p>
            <p className="text-xs text-slate-600 mt-1">{dataQuality.message}</p>
          </div>
          <Badge variant="outline" className={confidence === 'high' ? 'bg-green-50 border-green-300 text-green-800' : confidence === 'medium' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-slate-50 border-slate-300 text-slate-800'}>
            {confidence} confidence
          </Badge>
        </div>
      </div>

      {/* Main Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Prediction */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              AI
            </div>
            <h5 className="font-semibold text-blue-900">AI Recommendation</h5>
          </div>

          <div className="space-y-3">
            {/* Expected Conversions */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-blue-800">Expected Conversions</span>
                <span className="font-bold text-blue-900">{formatConversions(aiPrediction.expectedConversions)}</span>
              </div>
              <div className="text-xs text-blue-700">
                {formatRate(aiPrediction.expectedConversionRate)} conversion rate
              </div>
            </div>

            {/* Cost Efficiency */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-blue-800">Cost per Conversion</span>
                <span className="font-bold text-blue-900">{formatCost(aiPrediction.costPerConversion)}</span>
              </div>
            </div>

            {/* Base Performance */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-blue-800">Base Quality</span>
                <span className="font-bold text-blue-900">{aiPrediction.basePercentile}th</span>
              </div>
              <Progress
                value={aiPrediction.basePercentile}
                className="h-2"
                indicatorClassName="bg-blue-400"
              />
              <div className="text-xs text-blue-700 mt-1">
                Inherent store quality
              </div>
            </div>

            {/* Projected Performance */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-blue-800">At This Volume</span>
                <span className="font-bold text-blue-900">{aiPrediction.projectedPercentile}th</span>
              </div>
              <Progress
                value={aiPrediction.projectedPercentile}
                className="h-2"
                indicatorClassName="bg-blue-600"
              />
              <div className="text-xs text-blue-700 mt-1">
                {Math.round(aiPrediction.saturationLevel * 100)}% saturated
              </div>
            </div>
          </div>
        </div>

        {/* User Override */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full bg-yellow-600 flex items-center justify-center text-white text-xs font-bold">
              YOU
            </div>
            <h5 className="font-semibold text-yellow-900">Your Override</h5>
          </div>

          <div className="space-y-3">
            {/* Expected Conversions */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-yellow-800">Expected Conversions</span>
                <span className="font-bold text-yellow-900">{formatConversions(userOverride.expectedConversions)}</span>
              </div>
              <div className="text-xs text-yellow-700">
                {formatRate(userOverride.expectedConversionRate)} conversion rate
              </div>
            </div>

            {/* Cost Efficiency */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-yellow-800">Cost per Conversion</span>
                <span className="font-bold text-yellow-900">{formatCost(userOverride.costPerConversion)}</span>
              </div>
            </div>

            {/* Base Performance */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-yellow-800">Base Quality</span>
                <span className="font-bold text-yellow-900">{userOverride.basePercentile}th</span>
              </div>
              <Progress
                value={userOverride.basePercentile}
                className="h-2"
                indicatorClassName="bg-yellow-400"
              />
              <div className="text-xs text-yellow-700 mt-1">
                Inherent store quality
              </div>
            </div>

            {/* Projected Performance */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-yellow-800">At This Volume</span>
                <span className="font-bold text-yellow-900">{userOverride.projectedPercentile}th</span>
              </div>
              <Progress
                value={userOverride.projectedPercentile}
                className="h-2"
                indicatorClassName={
                  userOverride.saturationLevel > 0.8
                    ? "bg-red-600" // Severe oversaturation
                    : userOverride.saturationLevel > 0.6
                    ? "bg-orange-600" // Heavy saturation
                    : "bg-yellow-600" // Acceptable saturation
                }
              />
              <div className={`text-xs mt-1 ${
                userOverride.saturationLevel > 0.8 ? 'text-red-700 font-semibold' :
                userOverride.saturationLevel > 0.6 ? 'text-orange-700 font-medium' :
                'text-yellow-700'
              }`}>
                {Math.round(userOverride.saturationLevel * 100)}% saturated
                {userOverride.saturationLevel > 0.7 && ' ⚠️ Oversaturated!'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delta Summary (Simple Visual Indicators) */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h5 className="font-semibold text-slate-900 mb-3">Difference</h5>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Conversions Delta */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Conversions:</span>
            <div className="flex items-center gap-1">
              {delta.conversionsDelta > 0.5 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : delta.conversionsDelta < -0.5 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-slate-400" />
              )}
              <span className={`font-semibold ${delta.conversionsDelta > 0 ? 'text-green-700' : delta.conversionsDelta < 0 ? 'text-red-700' : 'text-slate-700'}`}>
                {formatDelta(delta.conversionsDelta)} ({formatDeltaPercent(delta.conversionsDeltaPercent)})
              </span>
            </div>
          </div>

          {/* Cost Efficiency Delta */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Cost Efficiency:</span>
            <div className="flex items-center gap-1">
              {delta.costEfficiencyDelta < -0.5 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : delta.costEfficiencyDelta > 0.5 ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="h-4 w-4 text-slate-400" />
              )}
              <span className={`font-semibold ${delta.costEfficiencyDelta < 0 ? 'text-green-700' : delta.costEfficiencyDelta > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                {delta.costEfficiencyDelta < 0 ? 'Better' : delta.costEfficiencyDelta > 0 ? 'Worse' : 'Same'}
              </span>
            </div>
          </div>

          {/* Overall Assessment */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Overall:</span>
            <Badge className={
              delta.performanceLabel === 'much_better' || delta.performanceLabel === 'better'
                ? 'bg-green-100 text-green-800 border-green-300'
                : delta.performanceLabel === 'much_worse' || delta.performanceLabel === 'worse'
                ? 'bg-red-100 text-red-800 border-red-300'
                : 'bg-blue-100 text-blue-800 border-blue-300'
            }>
              {delta.performanceLabel === 'much_better' ? 'Much Better'
                : delta.performanceLabel === 'better' ? 'Better'
                : delta.performanceLabel === 'much_worse' ? 'Much Worse'
                : delta.performanceLabel === 'worse' ? 'Worse'
                : 'Similar'}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
