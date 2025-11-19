'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { Loader2, Clock, Mail, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();

    // Check current session and approval status
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      if (!session) {
        setLoading(false);
        router.push('/auth/login');
        return;
      }

      // Fetch user profile with approval status
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(`
          approval_status,
          organizations (name)
        `)
        .eq('id', session.user.id)
        .single();

      if (!error && profile) {
        setApprovalStatus(profile.approval_status);
        setOrganizationName(profile.organizations?.name || '');
      } else {
        // If no profile exists, something went wrong during signup
        console.error('Failed to fetch user profile:', error);
        setApprovalStatus('error');
      }

      setLoading(false);
    };

    checkUserStatus();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (!session) {
        router.push('/auth/login');
      } else {
        // Re-check approval status when auth state changes
        checkUserStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Show pending approval screen
  if (approvalStatus === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-2xl shadow-lg">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-200 blur-2xl opacity-50 rounded-full"></div>
                <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-full">
                  <Clock className="h-12 w-12 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold">
                Waiting for Approval
              </CardTitle>
              <CardDescription className="text-base">
                Your request to join <span className="font-semibold text-slate-900">{organizationName}</span> is pending
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">
                    Security Notice
                  </p>
                  <p className="text-sm text-amber-700">
                    For security reasons, new members must be approved by an organization owner before accessing sensitive data. This helps protect your team's campaigns, templates, and analytics.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-900">What happens next?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">1</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">Owner Notification</p>
                    <p className="text-sm text-slate-600">The organization owner has been notified of your request.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">2</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">Review Process</p>
                    <p className="text-sm text-slate-600">They will review your request and verify your identity.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">3</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">Email Confirmation</p>
                    <p className="text-sm text-slate-600">You'll receive an email once your access has been approved.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-4 w-4" />
                <span>Signed in as <span className="font-medium text-slate-900">{user.email}</span></span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const supabase = createClient();
                    supabase.auth.signOut().then(() => {
                      router.push('/auth/login');
                    });
                  }}
                  className="flex-1"
                >
                  Sign Out
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Check Status
                </Button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-slate-500">
                Need help? Contact the organization owner directly or reach out to support@droplab.com
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if approval status couldn't be loaded
  if (approvalStatus === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Account Error</CardTitle>
            <CardDescription>
              We couldn't load your account information. Please try signing out and back in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                const supabase = createClient();
                supabase.auth.signOut().then(() => {
                  router.push('/auth/login');
                });
              }}
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show rejected state
  if (approvalStatus === 'rejected') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-red-100 p-4 rounded-full">
                <Shield className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Your request to join {organizationName} has been declined by the organization owner.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600 text-center">
              If you believe this is a mistake, please contact the organization owner directly.
            </p>
            <Button
              onClick={() => {
                const supabase = createClient();
                supabase.auth.signOut().then(() => {
                  router.push('/auth/login');
                });
              }}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Approved - show normal app
  return <>{children}</>;
}
