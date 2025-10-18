/**
 * Cost Tracking System for Image Generation
 * Monitors usage and costs to prevent unexpected expenses
 */

import { ImageQuality, ImageSize, calculateImageCost } from './ai/openai-v2';

export interface UsageRecord {
  timestamp: string;
  quality: ImageQuality;
  size: ImageSize;
  cost: number;
}

export interface DailyUsage {
  date: string;
  count: number;
  cost: number;
  records: UsageRecord[];
}

export interface UsageData {
  totalCost: number;
  totalCount: number;
  daily: Record<string, DailyUsage>;
  lastWarningDate?: string;
}

const STORAGE_KEY = 'image_generation_usage';

/**
 * Get current usage data from localStorage
 */
export function getUsageData(): UsageData {
  if (typeof window === 'undefined') {
    return createEmptyUsageData();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createEmptyUsageData();
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading usage data:', error);
    return createEmptyUsageData();
  }
}

/**
 * Save usage data to localStorage
 */
export function saveUsageData(data: UsageData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving usage data:', error);
  }
}

/**
 * Track a new image generation
 */
export function trackImageGeneration(
  quality: ImageQuality,
  size: ImageSize
): { warning: boolean; message?: string; data: UsageData } {
  const cost = calculateImageCost(quality, size);
  const usage = getUsageData();
  const today = getTodayKey();

  // Initialize today's data if needed
  if (!usage.daily[today]) {
    usage.daily[today] = {
      date: today,
      count: 0,
      cost: 0,
      records: [],
    };
  }

  // Add record
  const record: UsageRecord = {
    timestamp: new Date().toISOString(),
    quality,
    size,
    cost,
  };

  usage.totalCost += cost;
  usage.totalCount += 1;
  usage.daily[today].cost += cost;
  usage.daily[today].count += 1;
  usage.daily[today].records.push(record);

  saveUsageData(usage);

  // Check for warnings
  const warningResult = checkForWarnings(usage, today);

  return {
    warning: warningResult.shouldWarn,
    message: warningResult.message,
    data: usage,
  };
}

/**
 * Get today's usage statistics
 */
export function getTodayUsage(): DailyUsage {
  const usage = getUsageData();
  const today = getTodayKey();

  return usage.daily[today] || {
    date: today,
    count: 0,
    cost: 0,
    records: [],
  };
}

/**
 * Get this week's usage statistics
 */
export function getWeekUsage(): { count: number; cost: number } {
  const usage = getUsageData();
  const weekDays = getLast7Days();

  let totalCount = 0;
  let totalCost = 0;

  weekDays.forEach(day => {
    const dayData = usage.daily[day];
    if (dayData) {
      totalCount += dayData.count;
      totalCost += dayData.cost;
    }
  });

  return { count: totalCount, cost: totalCost };
}

/**
 * Reset usage data (clear all history)
 */
export function resetUsageData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error resetting usage data:', error);
  }
}

/**
 * Check if usage triggers any warnings
 */
function checkForWarnings(
  usage: UsageData,
  today: string
): { shouldWarn: boolean; message?: string } {
  const todayUsage = usage.daily[today];
  const weekUsage = getWeekUsage();

  // Skip if we already warned today
  if (usage.lastWarningDate === today) {
    return { shouldWarn: false };
  }

  // Daily thresholds
  if (todayUsage.cost >= 10.0) {
    usage.lastWarningDate = today;
    saveUsageData(usage);
    return {
      shouldWarn: true,
      message: `⚠️ You've spent $${todayUsage.cost.toFixed(2)} today on image generation (${todayUsage.count} images). Consider using lower quality for previews.`,
    };
  }

  if (todayUsage.cost >= 5.0) {
    usage.lastWarningDate = today;
    saveUsageData(usage);
    return {
      shouldWarn: true,
      message: `💡 You've spent $${todayUsage.cost.toFixed(2)} today on image generation (${todayUsage.count} images).`,
    };
  }

  // Weekly threshold
  if (weekUsage.cost >= 20.0 && usage.lastWarningDate !== today) {
    usage.lastWarningDate = today;
    saveUsageData(usage);
    return {
      shouldWarn: true,
      message: `📊 Weekly usage: $${weekUsage.cost.toFixed(2)} (${weekUsage.count} images). You're using image generation frequently.`,
    };
  }

  return { shouldWarn: false };
}

/**
 * Get cost savings estimate (comparing LOW vs HIGH quality)
 */
export function getCostSavings(count: number): {
  lowCost: number;
  highCost: number;
  savings: number;
  savingsPercent: number;
} {
  const lowCost = count * calculateImageCost('low', '1024x1024');
  const highCost = count * calculateImageCost('high', '1024x1024');
  const savings = highCost - lowCost;
  const savingsPercent = ((savings / highCost) * 100);

  return {
    lowCost,
    highCost,
    savings,
    savingsPercent,
  };
}

// Helper functions

function createEmptyUsageData(): UsageData {
  return {
    totalCost: 0,
    totalCount: 0,
    daily: {},
  };
}

function getTodayKey(): string {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split('T')[0]);
  }
  return days;
}
