/**
 * Visual KPI Cards - Ultra Simple, Visual AI Reasoning
 * Makes complex AI logic easy to understand at a glance
 * Focus: User-friendly, hide complexity, show clear KPIs
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Store,
  Image,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  DollarSign,
  Users,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VisualKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Individual KPI Card - Shows one metric with icon and trend
 */
export function VisualKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  tooltip,
  size = 'md',
}: VisualKPICardProps) {
  const colors = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-900 dark:text-blue-100',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      text: 'text-green-900 dark:text-green-100',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-950',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'text-orange-600 dark:text-orange-400',
      text: 'text-orange-900 dark:text-orange-100',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-900 dark:text-purple-100',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      text: 'text-red-900 dark:text-red-100',
    },
  };

  const colorScheme = colors[color];

  const sizes = {
    sm: {
      card: 'p-3',
      icon: 'h-5 w-5',
      value: 'text-xl',
      title: 'text-xs',
    },
    md: {
      card: 'p-4',
      icon: 'h-6 w-6',
      value: 'text-2xl',
      title: 'text-sm',
    },
    lg: {
      card: 'p-6',
      icon: 'h-8 w-8',
      value: 'text-3xl',
      title: 'text-base',
    },
  };

  const sizeClass = sizes[size];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const content = (
    <Card className={`${colorScheme.bg} ${colorScheme.border} border-2 transition-all hover:shadow-md`}>
      <CardContent className={sizeClass.card}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`${sizeClass.title} font-medium ${colorScheme.text} mb-1 flex items-center gap-2`}>
              {title}
              {tooltip && (
                <Info className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
            <div className={`${sizeClass.value} font-bold ${colorScheme.text} mb-1`}>
              {value}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                <TrendIcon
                  className={`h-3 w-3 ${
                    trend === 'up' ? 'text-green-600' :
                    trend === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}
                />
                <span className={`text-xs font-medium ${
                  trend === 'up' ? 'text-green-600' :
                  trend === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <Icon className={`${sizeClass.icon} ${colorScheme.icon} flex-shrink-0`} />
        </div>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

interface ScoreCardProps {
  score: number;
  label: string;
  description: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

/**
 * AI Score Card - Visual display of one AI factor with progress bar
 */
export function ScoreCard({ score, label, description, icon: Icon, color }: ScoreCardProps) {
  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  };

  // Simple color grading
  const gradeColor =
    score >= 75 ? 'text-green-600 dark:text-green-400' :
    score >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
    'text-red-600 dark:text-red-400';

  const gradeLabel =
    score >= 75 ? 'Excellent' :
    score >= 50 ? 'Good' :
    'Needs Improvement';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="p-4 border rounded-lg hover:shadow-sm transition-all cursor-help bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${colors[color].replace('bg-', 'text-')}`} />
                <span className="font-medium text-sm">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={gradeColor}>
                  {gradeLabel}
                </Badge>
                <span className={`text-lg font-bold ${gradeColor}`}>
                  {score}
                </span>
              </div>
            </div>
            <Progress
              value={score}
              className="h-2"
              indicatorClassName={colors[color]}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium mb-1">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Score: {score}/100 - {gradeLabel}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface AIScoreGridProps {
  scores: {
    store_performance: number | null;
    creative_performance: number | null;
    geographic_fit: number | null;
    timing_alignment: number | null;
  };
}

/**
 * AI Score Grid - 4 visual cards showing AI reasoning factors
 */
export function AIScoreGrid({ scores }: AIScoreGridProps) {
  const factors = [
    {
      key: 'store_performance',
      label: 'Store Quality',
      description: 'Historical performance of this store based on past campaigns. Higher means better conversion rates.',
      icon: Store,
      color: 'blue' as const,
      value: scores.store_performance || 0,
    },
    {
      key: 'creative_performance',
      label: 'Creative Match',
      description: 'How well this specific campaign creative resonates with similar audience segments.',
      icon: Image,
      color: 'purple' as const,
      value: scores.creative_performance || 0,
    },
    {
      key: 'geographic_fit',
      label: 'Location Fit',
      description: 'Geographic and demographic alignment between campaign message and store location.',
      icon: MapPin,
      color: 'green' as const,
      value: scores.geographic_fit || 0,
    },
    {
      key: 'timing_alignment',
      label: 'Timing',
      description: 'Seasonal trends and calendar events that impact campaign effectiveness.',
      icon: Clock,
      color: 'orange' as const,
      value: scores.timing_alignment || 0,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {factors.map((factor) => (
        <ScoreCard
          key={factor.key}
          score={factor.value}
          label={factor.label}
          description={factor.description}
          icon={factor.icon}
          color={factor.color}
        />
      ))}
    </div>
  );
}

interface QuickInsightProps {
  type: 'success' | 'warning' | 'info';
  message: string;
}

/**
 * Quick Insight Badge - Simple visual indicator of AI finding
 */
export function QuickInsight({ type, message }: QuickInsightProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      bg: 'bg-green-50 dark:bg-green-950',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    warning: {
      icon: AlertCircle,
      bg: 'bg-yellow-50 dark:bg-yellow-950',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    info: {
      icon: Sparkles,
      bg: 'bg-blue-50 dark:bg-blue-950',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  };

  const { icon: Icon, bg, border, text, iconColor } = config[type];

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bg} ${border}`}>
      <Icon className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <p className={`text-sm ${text} leading-relaxed`}>{message}</p>
    </div>
  );
}

interface PerformanceSummaryProps {
  aiConfidence: number;
  expectedConversions: number;
  expectedRate: number;
  costPerConversion: number;
}

/**
 * Performance Summary - Big KPI cards at the top
 */
export function PerformanceSummary({
  aiConfidence,
  expectedConversions,
  expectedRate,
  costPerConversion,
}: PerformanceSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <VisualKPICard
        title="AI Confidence"
        value={`${aiConfidence}%`}
        subtitle={aiConfidence >= 75 ? 'High confidence' : aiConfidence >= 50 ? 'Medium confidence' : 'Low confidence'}
        icon={Sparkles}
        color={aiConfidence >= 75 ? 'green' : aiConfidence >= 50 ? 'blue' : 'orange'}
        tooltip="AI's confidence in this recommendation based on historical data and predictive models"
        size="md"
      />
      <VisualKPICard
        title="Expected Conversions"
        value={expectedConversions.toFixed(1)}
        subtitle="predicted responses"
        icon={Target}
        color="blue"
        tooltip="Number of customers predicted to convert (form submission, purchase, etc.)"
        size="md"
      />
      <VisualKPICard
        title="Conversion Rate"
        value={`${expectedRate.toFixed(2)}%`}
        subtitle="of recipients"
        icon={TrendingUp}
        color="purple"
        tooltip="Percentage of recipients expected to convert based on historical patterns"
        size="md"
      />
      <VisualKPICard
        title="Cost Per Conversion"
        value={`$${costPerConversion.toFixed(2)}`}
        subtitle="per response"
        icon={DollarSign}
        color="green"
        tooltip="Total campaign cost divided by expected conversions - lower is better"
        size="md"
      />
    </div>
  );
}
