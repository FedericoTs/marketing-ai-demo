/**
 * Credit Calculator Tests
 *
 * Tests for credit allocation calculation utilities
 * Phase 1.2 - Testing Infrastructure
 */

import {
  calculateCreditsToAllocate,
  centsToDecimal,
  decimalToCents,
  calculateNewBalance,
  getBillingCycleFromReason,
} from '../credit-calculator';

describe('Credit Calculator', () => {
  describe('calculateCreditsToAllocate', () => {
    it('should grant full amount for first month (cycle 1)', () => {
      expect(calculateCreditsToAllocate(49900, 1)).toBe(49900); // $499.00
      expect(calculateCreditsToAllocate(99900, 1)).toBe(99900); // $999.00
      expect(calculateCreditsToAllocate(1000, 1)).toBe(1000);   // $10.00
    });

    it('should cap recurring months at $99 (9900 cents)', () => {
      expect(calculateCreditsToAllocate(49900, 2)).toBe(9900);  // Capped at $99
      expect(calculateCreditsToAllocate(49900, 3)).toBe(9900);  // Month 3
      expect(calculateCreditsToAllocate(99900, 5)).toBe(9900);  // Month 5
    });

    it('should return actual amount if below cap for recurring months', () => {
      expect(calculateCreditsToAllocate(5000, 2)).toBe(5000);   // $50 < $99
      expect(calculateCreditsToAllocate(7500, 3)).toBe(7500);   // $75 < $99
      expect(calculateCreditsToAllocate(9900, 2)).toBe(9900);   // Exactly $99
    });

    it('should handle edge cases', () => {
      expect(calculateCreditsToAllocate(0, 1)).toBe(0);         // Zero payment
      expect(calculateCreditsToAllocate(0, 2)).toBe(0);         // Zero recurring
      expect(calculateCreditsToAllocate(9901, 2)).toBe(9900);   // Just over cap
    });

    it('should handle very large payments', () => {
      expect(calculateCreditsToAllocate(999999, 1)).toBe(999999); // First month unlimited
      expect(calculateCreditsToAllocate(999999, 2)).toBe(9900);   // Recurring capped
    });
  });

  describe('centsToDecimal', () => {
    it('should convert cents to decimal dollars correctly', () => {
      expect(centsToDecimal(49900)).toBe(499.00);
      expect(centsToDecimal(9900)).toBe(99.00);
      expect(centsToDecimal(150)).toBe(1.50);
      expect(centsToDecimal(5)).toBe(0.05);
    });

    it('should handle zero', () => {
      expect(centsToDecimal(0)).toBe(0);
    });

    it('should handle large amounts', () => {
      expect(centsToDecimal(123456789)).toBe(1234567.89);
    });

    it('should handle fractional cents (edge case)', () => {
      expect(centsToDecimal(100.5)).toBe(1.005); // Unusual but mathematically correct
    });
  });

  describe('decimalToCents', () => {
    it('should convert decimal dollars to cents correctly', () => {
      expect(decimalToCents(499.00)).toBe(49900);
      expect(decimalToCents(99.00)).toBe(9900);
      expect(decimalToCents(1.50)).toBe(150);
      expect(decimalToCents(0.05)).toBe(5);
    });

    it('should handle zero', () => {
      expect(decimalToCents(0)).toBe(0);
    });

    it('should round fractional cents correctly', () => {
      expect(decimalToCents(1.234)).toBe(123);   // Rounds to 123 cents
      expect(decimalToCents(1.235)).toBe(124);   // Rounds to 124 cents
      expect(decimalToCents(1.999)).toBe(200);   // Rounds to 200 cents
    });

    it('should handle large amounts', () => {
      expect(decimalToCents(1234567.89)).toBe(123456789);
    });

    it('should be reversible with centsToDecimal', () => {
      const testValues = [0, 100, 49900, 9900, 123456];
      testValues.forEach(cents => {
        const decimal = centsToDecimal(cents);
        const backToCents = decimalToCents(decimal);
        expect(backToCents).toBe(cents);
      });
    });
  });

  describe('calculateNewBalance', () => {
    it('should add credits to current balance correctly', () => {
      expect(calculateNewBalance(100.50, 499.00)).toBe(599.50);
      expect(calculateNewBalance(0, 499.00)).toBe(499.00);
      expect(calculateNewBalance(50.25, 99.00)).toBe(149.25);
    });

    it('should handle zero current balance', () => {
      expect(calculateNewBalance(0, 100)).toBe(100);
    });

    it('should handle zero credits added', () => {
      expect(calculateNewBalance(250.75, 0)).toBe(250.75);
    });

    it('should handle decimal precision correctly', () => {
      // JavaScript floating point precision test
      const result = calculateNewBalance(0.1, 0.2);
      expect(result).toBeCloseTo(0.3, 10);
    });

    it('should handle large balances', () => {
      expect(calculateNewBalance(999999.99, 500.00)).toBe(1000499.99);
    });

    it('should handle negative values (edge case - should not happen in production)', () => {
      // Edge case: If somehow balance went negative
      expect(calculateNewBalance(-10.00, 100.00)).toBe(90.00);
    });
  });

  describe('getBillingCycleFromReason', () => {
    it('should return 1 for subscription_create (first payment)', () => {
      expect(getBillingCycleFromReason('subscription_create')).toBe(1);
    });

    it('should return 2 for subscription_cycle (recurring)', () => {
      expect(getBillingCycleFromReason('subscription_cycle')).toBe(2);
    });

    it('should return 2 for subscription_update (plan change - treat as recurring)', () => {
      expect(getBillingCycleFromReason('subscription_update')).toBe(2);
    });

    it('should return 2 for unknown billing reasons (safer default)', () => {
      expect(getBillingCycleFromReason('unknown_reason')).toBe(2);
      expect(getBillingCycleFromReason('manual')).toBe(2);
      expect(getBillingCycleFromReason('')).toBe(2);
      expect(getBillingCycleFromReason('subscription_threshold')).toBe(2);
    });

    it('should handle case sensitivity (Stripe should be consistent, but testing)', () => {
      // Stripe API should always be lowercase, but testing edge case
      expect(getBillingCycleFromReason('SUBSCRIPTION_CREATE')).toBe(2); // Not exact match
    });
  });

  describe('Integration: Full credit allocation flow', () => {
    it('should calculate correct credits for first month payment', () => {
      // Scenario: Customer pays $499 for first month
      const amountPaid = 49900; // cents
      const billingCycle = getBillingCycleFromReason('subscription_create');
      const creditsInCents = calculateCreditsToAllocate(amountPaid, billingCycle);
      const creditsInDecimal = centsToDecimal(creditsInCents);
      const currentBalance = 0;
      const newBalance = calculateNewBalance(currentBalance, creditsInDecimal);

      expect(billingCycle).toBe(1);
      expect(creditsInCents).toBe(49900);
      expect(creditsInDecimal).toBe(499.00);
      expect(newBalance).toBe(499.00);
    });

    it('should calculate correct credits for recurring month payment', () => {
      // Scenario: Customer pays $499 for month 2
      const amountPaid = 49900; // cents
      const billingCycle = getBillingCycleFromReason('subscription_cycle');
      const creditsInCents = calculateCreditsToAllocate(amountPaid, billingCycle);
      const creditsInDecimal = centsToDecimal(creditsInCents);
      const currentBalance = 499.00; // From month 1
      const newBalance = calculateNewBalance(currentBalance, creditsInDecimal);

      expect(billingCycle).toBe(2);
      expect(creditsInCents).toBe(9900); // Capped at $99
      expect(creditsInDecimal).toBe(99.00);
      expect(newBalance).toBe(598.00); // 499 + 99
    });

    it('should calculate correct credits for lower-tier plan recurring', () => {
      // Scenario: Customer on $49/month plan (below $99 cap)
      const amountPaid = 4900; // $49 in cents
      const billingCycle = getBillingCycleFromReason('subscription_cycle');
      const creditsInCents = calculateCreditsToAllocate(amountPaid, billingCycle);
      const creditsInDecimal = centsToDecimal(creditsInCents);
      const currentBalance = 49.00;
      const newBalance = calculateNewBalance(currentBalance, creditsInDecimal);

      expect(billingCycle).toBe(2);
      expect(creditsInCents).toBe(4900); // Below cap, full amount
      expect(creditsInDecimal).toBe(49.00);
      expect(newBalance).toBe(98.00);
    });

    it('should handle plan upgrade correctly', () => {
      // Scenario: Customer upgrades plan mid-cycle
      const amountPaid = 24950; // $249.50 proration
      const billingCycle = getBillingCycleFromReason('subscription_update');
      const creditsInCents = calculateCreditsToAllocate(amountPaid, billingCycle);
      const creditsInDecimal = centsToDecimal(creditsInCents);
      const currentBalance = 150.00;
      const newBalance = calculateNewBalance(currentBalance, creditsInDecimal);

      expect(billingCycle).toBe(2); // Treated as recurring (safer)
      expect(creditsInCents).toBe(9900); // Capped at $99
      expect(creditsInDecimal).toBe(99.00);
      expect(newBalance).toBe(249.00);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle billing cycle 0 (edge case)', () => {
      // Cycle 0 does not make sense, but testing behavior
      expect(calculateCreditsToAllocate(49900, 0)).toBe(9900); // Treats as recurring
    });

    it('should handle negative billing cycle (edge case)', () => {
      expect(calculateCreditsToAllocate(49900, -1)).toBe(9900); // Treats as recurring
    });

    it('should handle very high billing cycle numbers', () => {
      expect(calculateCreditsToAllocate(49900, 100)).toBe(9900); // Still capped
      expect(calculateCreditsToAllocate(49900, 999)).toBe(9900); // Still capped
    });

    it('should handle fractional billing cycles (edge case)', () => {
      // TypeScript would prevent this, but testing runtime behavior
      expect(calculateCreditsToAllocate(49900, 1.5 as any)).toBe(9900); // Not === 1
    });
  });
});
