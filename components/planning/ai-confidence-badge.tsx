/**
 * AI Confidence Badge Component
 * Visual indicator of AI recommendation confidence
 * Color-coded: Green (high), Yellow (medium), Red (low)
 */

import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import type { ConfidenceLevel } from '@/types/planning';

interface AIConfidenceBadgeProps {
  confidence: number; // 0-100
  level: ConfidenceLevel; // 'high' | 'medium' | 'low'
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showPercentage?: boolean;
}

export function AIConfidenceBadge({
  confidence,
  level,
  size = 'md',
  showIcon = true,
  showPercentage = true,
}: AIConfidenceBadgeProps) {
  // Color configuration based on confidence level
  const config = {
    high: {
      bg: 'bg-green-100 dark:bg-green-950',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
      icon: TrendingUp,
      label: 'High Confidence',
    },
    medium: {
      bg: 'bg-yellow-100 dark:bg-yellow-950',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
      icon: Brain,
      label: 'Medium Confidence',
    },
    low: {
      bg: 'bg-red-100 dark:bg-red-950',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
      icon: AlertTriangle,
      label: 'Low Confidence',
    },
  };

  const levelConfig = config[level];
  const Icon = levelConfig.icon;

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <Badge
      variant="outline"
      className={`
        ${levelConfig.bg}
        ${levelConfig.text}
        ${levelConfig.border}
        ${sizeClasses[size]}
        font-medium
        border
      `}
    >
      {showIcon && <Icon className={`${iconSizes[size]} mr-1.5`} />}

      {showPercentage ? (
        <span>{confidence.toFixed(0)}% {levelConfig.label}</span>
      ) : (
        <span>{levelConfig.label}</span>
      )}
    </Badge>
  );
}

/**
 * Compact version - just confidence percentage with color
 */
export function AIConfidenceScore({ confidence, level }: { confidence: number; level: ConfidenceLevel }) {
  const colorClass = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-red-600 dark:text-red-400',
  }[level];

  return (
    <span className={`font-bold ${colorClass}`}>
      {confidence.toFixed(0)}%
    </span>
  );
}
