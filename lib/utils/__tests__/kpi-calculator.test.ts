/**
 * KPI Calculator Utility Tests
 *
 * Purpose: Verify KPI calculation consistency
 * Run: npm test -- kpi-calculator.test.ts
 */

import {
  calculateConversionRate,
  calculateResponseRate,
  formatPercentage,
  formatDuration,
  calculateAverage,
  calculateROI,
  formatCurrency,
  calculateCostPerConversion,
  roundToNearest,
  clamp,
  formatLargeNumber,
} from '../kpi-calculator';

describe('KPI Calculator', () => {
  describe('calculateConversionRate', () => {
    test('calculates correct rate', () => {
      expect(calculateConversionRate(10, 100)).toBe(0.1);
      expect(calculateConversionRate(156, 1000)).toBe(0.156);
      expect(calculateConversionRate(1, 4)).toBe(0.25);
    });

    test('handles zero total', () => {
      expect(calculateConversionRate(10, 0)).toBe(0);
    });

    test('handles zero conversions', () => {
      expect(calculateConversionRate(0, 100)).toBe(0);
    });

    test('handles negative conversions', () => {
      expect(calculateConversionRate(-5, 100)).toBe(0);
    });

    test('clamps to maximum 1.0', () => {
      expect(calculateConversionRate(150, 100)).toBe(1);
    });
  });

  describe('formatPercentage', () => {
    test('formats with 1 decimal by default', () => {
      expect(formatPercentage(0.156)).toBe('15.6%');
      expect(formatPercentage(0.1)).toBe('10.0%');
    });

    test('formats with custom decimals', () => {
      expect(formatPercentage(0.156, 2)).toBe('15.60%');
      expect(formatPercentage(0.156, 0)).toBe('16%');
    });

    test('handles edge cases', () => {
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(1)).toBe('100.0%');
      expect(formatPercentage(NaN)).toBe('0.0%');
      expect(formatPercentage(Infinity)).toBe('0.0%');
    });
  });

  describe('formatDuration', () => {
    test('formats seconds only', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(0)).toBe('0s');
    });

    test('formats minutes and seconds', () => {
      expect(formatDuration(83)).toBe('1m 23s');
      expect(formatDuration(125)).toBe('2m 5s');
    });

    test('handles null and undefined', () => {
      expect(formatDuration(null)).toBe('0s');
      expect(formatDuration(undefined)).toBe('0s');
    });

    test('handles negative values', () => {
      expect(formatDuration(-10)).toBe('0s');
    });

    test('rounds down partial seconds', () => {
      expect(formatDuration(83.9)).toBe('1m 23s');
    });
  });

  describe('calculateAverage', () => {
    test('calculates average', () => {
      expect(calculateAverage([10, 20, 30])).toBe(20);
      expect(calculateAverage([5, 10])).toBe(7.5);
    });

    test('handles empty array', () => {
      expect(calculateAverage([])).toBe(0);
    });

    test('handles single value', () => {
      expect(calculateAverage([42])).toBe(42);
    });
  });

  describe('calculateROI', () => {
    test('calculates ROI', () => {
      expect(calculateROI(150, 100)).toBe(0.5); // 50% ROI
      expect(calculateROI(200, 100)).toBe(1); // 100% ROI
    });

    test('handles zero cost', () => {
      expect(calculateROI(100, 0)).toBe(0);
    });

    test('handles negative ROI', () => {
      expect(calculateROI(50, 100)).toBe(-0.5); // -50% ROI
    });
  });

  describe('formatCurrency', () => {
    test('formats with 2 decimals by default', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    test('formats with custom decimals', () => {
      expect(formatCurrency(1234.56, 0)).toBe('$1,235');
      expect(formatCurrency(1000, 3)).toBe('$1,000.000');
    });

    test('handles large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('calculateCostPerConversion', () => {
    test('calculates cost per conversion', () => {
      expect(calculateCostPerConversion(1000, 10)).toBe(100);
      expect(calculateCostPerConversion(500, 25)).toBe(20);
    });

    test('handles zero conversions', () => {
      expect(calculateCostPerConversion(1000, 0)).toBe(0);
    });
  });

  describe('roundToNearest', () => {
    test('rounds to nearest multiple', () => {
      expect(roundToNearest(347, 50)).toBe(350);
      expect(roundToNearest(220, 100)).toBe(200);
      expect(roundToNearest(275, 50)).toBe(300);
    });
  });

  describe('clamp', () => {
    test('clamps value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('formatLargeNumber', () => {
    test('formats thousands with K', () => {
      expect(formatLargeNumber(1234)).toBe('1.2K');
      expect(formatLargeNumber(5678)).toBe('5.7K');
    });

    test('formats millions with M', () => {
      expect(formatLargeNumber(1234567)).toBe('1.2M');
      expect(formatLargeNumber(9876543)).toBe('9.9M');
    });

    test('leaves small numbers as-is', () => {
      expect(formatLargeNumber(500)).toBe('500');
      expect(formatLargeNumber(999)).toBe('999');
    });
  });

  describe('Integration: Response Rate Calculation', () => {
    test('matches existing dashboard calculation', () => {
      // Simulate real data from analytics dashboard
      const pageViews = 156;
      const totalRecipients = 1000;

      const rate = calculateResponseRate(pageViews, totalRecipients);
      const formatted = formatPercentage(rate, 1);

      expect(rate).toBe(0.156);
      expect(formatted).toBe('15.6%');
    });
  });

  describe('Integration: Call Duration Formatting', () => {
    test('matches existing calls view formatting', () => {
      // Simulate real data from calls view
      const duration1 = 83; // 1m 23s
      const duration2 = 328; // 5m 28s

      expect(formatDuration(duration1)).toBe('1m 23s');
      expect(formatDuration(duration2)).toBe('5m 28s');
    });
  });
});
