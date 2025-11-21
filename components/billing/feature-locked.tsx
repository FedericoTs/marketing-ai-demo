/**
 * Feature Locked Component
 *
 * Displays a locked state overlay or card for features that require payment.
 * Shows upgrade CTA and contextual messaging.
 *
 * Usage:
 * ```tsx
 * if (isFeatureLocked('campaigns')) {
 *   return <FeatureLocked feature="campaigns" />;
 * }
 * ```
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, CreditCard, AlertTriangle, Sparkles } from 'lucide-react';
import { useBillingStatus, type FeatureName } from '@/lib/hooks/use-billing-status';

interface FeatureLockedProps {
  feature: FeatureName;
  variant?: 'card' | 'overlay' | 'banner';
  showDetails?: boolean;
}

const featureInfo: Record<FeatureName, { title: string; description: string; icon: any }> = {
  campaigns: {
    title: 'Campaign Management',
    description: 'Create and send direct mail campaigns to your audiences',
    icon: Sparkles,
  },
  templates: {
    title: 'Design Templates',
    description: 'Create and manage reusable direct mail templates',
    icon: Sparkles,
  },
  audiences: {
    title: 'Audience Targeting',
    description: 'Build and manage targeted audience lists',
    icon: Sparkles,
  },
  analytics: {
    title: 'Analytics Dashboard',
    description: 'Track campaign performance and ROI',
    icon: Sparkles,
  },
  team: {
    title: 'Team Management',
    description: 'Manage team members and permissions',
    icon: Sparkles,
  },
};

export function FeatureLocked({ feature, variant = 'card', showDetails = true }: FeatureLockedProps) {
  const router = useRouter();
  const { requiresPayment, isPastDue, hasCredits, getUpgradeMessage } = useBillingStatus();

  const info = featureInfo[feature];
  const message = getUpgradeMessage(feature);

  const handleUpgrade = () => {
    if (requiresPayment) {
      // Navigate to dashboard where payment banner is displayed
      router.push('/dashboard');
    } else if (isPastDue) {
      // Navigate to billing page to update payment method
      router.push('/dashboard'); // TODO: Create dedicated billing page
    } else if (!hasCredits) {
      // Navigate to credits page
      router.push('/dashboard'); // TODO: Create dedicated credits page
    }
  };

  // Banner variant - slim alert banner
  if (variant === 'banner') {
    return (
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">{info.title} is locked</p>
              <p className="text-sm text-orange-700">{message}</p>
            </div>
          </div>
          <Button onClick={handleUpgrade} className="bg-orange-600 hover:bg-orange-700">
            <CreditCard className="mr-2 h-4 w-4" />
            Upgrade Now
          </Button>
        </div>
      </div>
    );
  }

  // Overlay variant - full-screen overlay with blur
  if (variant === 'overlay') {
    return (
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="max-w-md border-orange-200 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Lock className="h-8 w-8 text-orange-600" />
            </div>
            <CardTitle className="text-2xl">{info.title} Locked</CardTitle>
            <CardDescription className="text-base">{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {showDetails && (
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-700">{info.description}</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <Button onClick={handleUpgrade} size="lg" className="w-full bg-orange-600 hover:bg-orange-700">
                <CreditCard className="mr-2 h-5 w-5" />
                {requiresPayment ? 'Complete Payment' : 'Upgrade Now'}
              </Button>
              <Button onClick={() => router.back()} variant="outline" size="lg" className="w-full">
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Card variant (default) - standalone card
  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <Lock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl text-orange-900">{info.title} Locked</CardTitle>
            <CardDescription className="text-orange-700">{message}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDetails && (
          <>
            <p className="text-sm text-slate-700">{info.description}</p>
            <div className="rounded-lg bg-white/60 p-4 border border-orange-100">
              <p className="text-sm font-medium text-slate-900 mb-2">✨ Unlock with payment:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                <li>• $499/month subscription (first month)</li>
                <li>• $499.00 in credits immediately</li>
                <li>• Full platform access</li>
                <li>• Unlimited team members</li>
              </ul>
            </div>
          </>
        )}
        <Button onClick={handleUpgrade} className="w-full bg-orange-600 hover:bg-orange-700" size="lg">
          <CreditCard className="mr-2 h-5 w-5" />
          {requiresPayment ? 'Complete Payment ($499/mo)' : 'Upgrade Plan'}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Upgrade Prompt Component
 *
 * Inline upgrade prompt for features that are locked.
 * Minimal, non-intrusive design for use within existing pages.
 */
interface UpgradePromptProps {
  feature: FeatureName;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const router = useRouter();
  const { requiresPayment, getUpgradeMessage } = useBillingStatus();

  const info = featureInfo[feature];
  const message = getUpgradeMessage(feature);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
        <Lock className="h-4 w-4" />
        <span>{message}</span>
        <Button
          onClick={() => router.push('/dashboard')}
          size="sm"
          variant="ghost"
          className="ml-auto text-orange-700 hover:text-orange-900 hover:bg-orange-100"
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="flex-shrink-0">
        {requiresPayment ? (
          <AlertTriangle className="h-6 w-6 text-orange-600" />
        ) : (
          <Lock className="h-6 w-6 text-orange-600" />
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-orange-900 mb-1">{info.title} requires upgrade</h4>
        <p className="text-sm text-orange-700 mb-3">{message}</p>
        <Button
          onClick={() => router.push('/dashboard')}
          size="sm"
          className="bg-orange-600 hover:bg-orange-700"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {requiresPayment ? 'Complete Payment' : 'Upgrade Now'}
        </Button>
      </div>
    </div>
  );
}
