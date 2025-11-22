'use client';

/**
 * Billing Manager Component
 *
 * Provides UI for subscription management:
 * - View subscription status
 * - Purchase additional credits
 * - Cancel subscription
 * - Update payment method (Stripe Customer Portal)
 * - View billing history
 *
 * Phase 9.2.10 - Subscription Management
 * Phase 9.2.16 - One-Time Credit Purchase System
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBillingStatus } from '@/lib/hooks/use-billing-status';
import { toast } from 'sonner';
import {
  CreditCard,
  Calendar,
  Receipt,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  DollarSign,
} from 'lucide-react';

interface Invoice {
  id: string;
  number: string | null;
  created: number;
  period_start: number;
  period_end: number;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  paid: boolean;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  billing_reason: string | null;
  description: string | null;
}

export function BillingManager() {
  const {
    organization,
    billingStatus,
    credits,
    isLoading,
    requiresPayment,
    isPastDue,
    isActive,
    refresh,
  } = useBillingStatus();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [creditAmount, setCreditAmount] = useState<string>('100');
  const [isPurchasingCredits, setIsPurchasingCredits] = useState(false);

  // Load billing history on mount
  useEffect(() => {
    if (organization?.stripe_customer_id) {
      loadBillingHistory();
    }
  }, [organization?.stripe_customer_id]);

  // Handle credit purchase success/cancel from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const purchaseStatus = urlParams.get('purchase');
    const amount = urlParams.get('amount');

    if (purchaseStatus === 'success' && amount) {
      toast.success(`Successfully purchased $${amount} in credits! Your balance has been updated.`);
      refresh(); // Refresh to show new credit balance
      // Clear URL parameters
      window.history.replaceState({}, '', '/settings');
    } else if (purchaseStatus === 'canceled') {
      toast.info('Credit purchase canceled');
      // Clear URL parameters
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  async function loadBillingHistory() {
    setIsLoadingInvoices(true);
    try {
      const response = await fetch('/api/stripe/billing-history');
      const data = await response.json();

      if (data.success) {
        setInvoices(data.invoices);
      } else {
        console.error('Failed to load billing history:', data.error);
      }
    } catch (error) {
      console.error('Error loading billing history:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  }

  async function handleCancelSubscription() {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate: false }), // Cancel at period end
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Subscription cancelled successfully');
        await refresh(); // Refresh billing status
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      toast.error('Failed to cancel subscription. Please try again.');
      console.error('Error cancelling subscription:', error);
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleOpenCustomerPortal() {
    setIsOpeningPortal(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          return_url: `${window.location.origin}/settings`,
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open customer portal');
        setIsOpeningPortal(false);
      }
    } catch (error) {
      toast.error('Failed to open customer portal. Please try again.');
      console.error('Error opening customer portal:', error);
      setIsOpeningPortal(false);
    }
  }

  async function handlePurchaseCredits() {
    const amount = parseFloat(creditAmount);

    // Validate amount
    if (isNaN(amount) || amount < 10 || amount > 10000) {
      toast.error('Amount must be between $10 and $10,000');
      return;
    }

    setIsPurchasingCredits(true);
    try {
      const response = await fetch('/api/stripe/purchase-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to create checkout session');
        setIsPurchasingCredits(false);
      }
    } catch (error) {
      toast.error('Failed to purchase credits. Please try again.');
      console.error('Error purchasing credits:', error);
      setIsPurchasingCredits(false);
    }
  }

  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function getStatusBadge(status: string | null) {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
      active: { label: 'Active', variant: 'default' },
      trialing: { label: 'Trial', variant: 'secondary' },
      past_due: { label: 'Past Due', variant: 'destructive' },
      incomplete: { label: 'Incomplete', variant: 'destructive' },
      cancelled: { label: 'Cancelled', variant: 'outline' },
      canceled: { label: 'Cancelled', variant: 'outline' },
    };

    const config = statusConfig[status || ''] || { label: status || 'Unknown', variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!organization) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load billing information. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          <CardDescription>
            Manage your DropLab subscription and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600 mb-1">Status</p>
              <div>{getStatusBadge(billingStatus)}</div>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Available Credits</p>
              <p className="text-2xl font-bold">${credits}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Plan</p>
              <p className="text-lg font-semibold">Professional</p>
              <p className="text-sm text-slate-500">$499/month</p>
            </div>
          </div>

          {/* Status Messages */}
          {requiresPayment && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Payment required to activate your subscription. Please complete payment to unlock features.
              </AlertDescription>
            </Alert>
          )}

          {isPastDue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your payment is past due. Please update your payment method to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          {billingStatus === 'cancelled' && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription has been cancelled. Reactivate to continue using DropLab.
              </AlertDescription>
            </Alert>
          )}

          {isActive && !isPastDue && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Your subscription is active. Credits refresh monthly on your billing date.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4">
            <Button
              onClick={handleOpenCustomerPortal}
              disabled={isOpeningPortal || !organization.stripe_customer_id}
            >
              {isOpeningPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <CreditCard className="mr-2 h-4 w-4" />
              Manage Payment Method
            </Button>

            {billingStatus === 'active' && (
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={isCancelling}
              >
                {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Subscription
              </Button>
            )}

            {billingStatus === 'cancelled' && (
              <Button onClick={handleOpenCustomerPortal} disabled={isOpeningPortal}>
                {isOpeningPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Reactivate Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Additional Credits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Purchase Additional Credits
          </CardTitle>
          <CardDescription>
            Buy extra credits for Data Axle contacts and PostGrid printing. $1 = 1 credit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Balance Display */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div>
              <p className="text-sm text-slate-600 mb-1">Current Credit Balance</p>
              <p className="text-3xl font-bold text-slate-900">${credits}</p>
            </div>
            <DollarSign className="h-10 w-10 text-slate-400" />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="credit-amount">Purchase Amount ($10 - $10,000)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  id="credit-amount"
                  type="number"
                  min="10"
                  max="10000"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="pl-7"
                  placeholder="100"
                />
              </div>
              <Button
                onClick={handlePurchaseCredits}
                disabled={isPurchasingCredits}
                className="min-w-[120px]"
              >
                {isPurchasingCredits ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Purchase'
                )}
              </Button>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-2">
            <Label className="text-sm text-slate-600">Quick Amounts</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[50, 100, 250, 500].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setCreditAmount(amount.toString())}
                  className="w-full"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Info Alert */}
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>How it works:</strong> Purchase credits in any amount. Use them to buy Data Axle contacts
              or print postcards via PostGrid. Credits never expire and roll over month-to-month.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Billing History Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">
              No billing history available yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-slate-600">Description</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Amount</th>
                    <th className="text-center py-3 px-2 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-slate-600">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-2 text-sm">{formatDate(invoice.created)}</td>
                      <td className="py-3 px-2 text-sm">
                        {invoice.description || `Billing period: ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`}
                      </td>
                      <td className="py-3 px-2 text-sm text-right font-medium">
                        {formatCurrency(invoice.amount_paid, invoice.currency)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {invoice.paid ? (
                          <Badge variant="default">Paid</Badge>
                        ) : (
                          <Badge variant="destructive">{invoice.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {invoice.invoice_pdf && (
                          <a
                            href={invoice.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-sm"
                          >
                            View PDF
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
