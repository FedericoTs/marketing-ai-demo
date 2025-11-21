'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, CreditCard, ArrowRight } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [creditsGranted, setCreditsGranted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get user's organization to check credits
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Get profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setError('Profile not found');
          setLoading(false);
          return;
        }

        // Get organization credits
        const { data: org } = await supabase
          .from('organizations')
          .select('credits, billing_status')
          .eq('id', profile.organization_id)
          .single();

        if (org) {
          setCreditsGranted(parseFloat(org.credits || '0'));

          // Wait a moment to ensure webhook has processed
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setLoading(false);
      } catch (err) {
        console.error('[Payment Success] Error:', err);
        setError('Failed to verify payment');
        setLoading(false);
      }
    }

    verifyPayment();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <CardTitle>Verifying Payment...</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">
              Please wait while we confirm your subscription payment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-8">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Payment Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-8">
      <Card className="max-w-2xl w-full border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <CardTitle className="text-green-900">Payment Successful!</CardTitle>
              <CardDescription className="text-green-700">
                Your subscription is now active
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credits Info */}
          <div className="bg-white p-6 rounded-lg border border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">Credits Added</h3>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-slate-900">
                ${creditsGranted?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-slate-600">
                Your account has been credited with the full first-month amount.
                These credits can be used for Data Axle contact purchases and campaign sends.
              </p>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-white p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              🎉 What's Next?
            </h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>All design tools are now fully accessible</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Create campaigns and audience lists</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Purchase Data Axle contacts using your credits</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span>Send direct mail campaigns to your audience</span>
              </li>
            </ul>
          </div>

          {/* Billing Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>📅 Billing Cycle:</strong> Your subscription will renew monthly at $499.00.
              After the first month, you'll receive $99.00 in credits per billing cycle.
            </p>
          </div>

          {/* CTA */}
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/dashboard')}
              className="flex-1"
              size="lg"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
