'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LogOut,
  Loader2,
  Building2,
  CreditCard,
  Shield,
  AlertCircle,
  Plus
} from 'lucide-react';
import type { UserProfile, Organization } from '@/lib/database/types';
import { TeamWidget } from '@/components/dashboard/team-widget-enhanced';
import { CampaignPerformanceCards } from '@/components/dashboard/campaign-performance-cards';
import { RecentCampaignsTable } from '@/components/dashboard/recent-campaigns-table';
import { PerformanceInsights } from '@/components/dashboard/performance-insights';
import { toast } from 'sonner';
import { cachedFetch } from '@/lib/utils/cache';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teamCount, setTeamCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }
        setUser(user);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          // Profile doesn't exist - this is expected for new users before seed data
          console.log('No user profile found - seed data needs to be created');
          console.log('Error details:', profileError);
          setLoading(false);
          return;
        }

        if (!profileData) {
          console.log('No profile data returned');
          setLoading(false);
          return;
        }

        setProfile(profileData as UserProfile);

        // OPTIMIZATION: Fetch organization, team count, and metrics in PARALLEL
        const [orgResult, teamResult] = await Promise.all([
          // Get organization
          supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.organization_id)
            .single(),

          // Get team member count
          supabase
            .from('user_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', profileData.organization_id),
        ]);

        if (orgResult.error) {
          console.error('Organization error:', orgResult.error);
        } else {
          setOrganization(orgResult.data as Organization);
        }

        setTeamCount(teamResult.count || 0);

        // Fetch dashboard metrics (already async, no need to await)
        fetchDashboardMetrics();

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchDashboardMetrics() {
      try {
        // OPTIMIZATION: Use browser-native caching (30 second TTL)
        // This makes repeat visits to dashboard instant
        // REVERSIBILITY: Remove cachedFetch and use regular fetch to revert
        const data = await cachedFetch(
          '/api/dashboard/metrics',
          undefined,
          'dashboard-metrics',
          30000 // 30 seconds cache
        );

        if (data.success) {
          setDashboardMetrics(data.data);
        }
      } catch (error) {
        console.error('Error loading dashboard metrics:', error);
        // Fallback: try regular fetch if cache fails
        try {
          const response = await fetch('/api/dashboard/metrics');
          const fallbackData = await response.json();
          if (fallbackData.success) {
            setDashboardMetrics(fallbackData.data);
          }
        } catch (fallbackError) {
          console.error('Fallback fetch also failed:', fallbackError);
        }
      } finally {
        setMetricsLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const handleCompletePayment = async () => {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('[Dashboard] Checkout error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show onboarding if no profile exists
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <img
                src="/images/logo_icon_tbg.png"
                alt="DropLab"
                className="h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Welcome to DropLab
                </h1>
                <p className="text-slate-600">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          {/* Onboarding Card */}
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900 flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                🎯 Setup Required: Create Seed Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-orange-800">
                  Your account is authenticated, but you need to create an organization and user profile
                  to access the dashboard. This is a one-time setup step.
                </p>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-slate-900 mb-3">📋 Quick Setup Instructions:</h3>
                  <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside">
                    <li>
                      Open <strong>SEED_DATA_GUIDE.md</strong> in your project root
                    </li>
                    <li>
                      Follow the 3-step process:
                      <ul className="ml-6 mt-1 space-y-1 list-disc">
                        <li>Create Organizations (via Supabase SQL Editor)</li>
                        <li>Create Auth Users (via Supabase Auth UI)</li>
                        <li>Link Users to Organizations (via SQL)</li>
                      </ul>
                    </li>
                    <li>
                      Log out and log back in with test credentials
                    </li>
                  </ol>
                </div>

                <div className="bg-white p-4 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-slate-900 mb-2">🔗 Quick Links:</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Supabase SQL Editor:</strong>{' '}
                      <a
                        href="https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/sql/new"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Open SQL Editor →
                      </a>
                    </p>
                    <p>
                      <strong>Supabase Auth Users:</strong>{' '}
                      <a
                        href="https://supabase.com/dashboard/project/egccqmlhzqiirovstpal/auth/users"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Manage Users →
                      </a>
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> This setup creates 3 test organizations with 6 users.
                    After setup, you can test multi-tenant isolation by logging in as different users.
                  </p>
                </div>

                <div className="pt-4 border-t border-orange-200">
                  <p className="text-xs text-orange-700">
                    <strong>Current User ID:</strong> {user.id}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    This ID needs to be added to the <code className="bg-orange-100 px-1 rounded">user_profiles</code> table
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Card */}
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">📚 Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-blue-800">
                <p>✅ <strong>Database Schema:</strong> All tables deployed and ready</p>
                <p>✅ <strong>RLS Policies:</strong> Multi-tenant isolation configured</p>
                <p>✅ <strong>Authentication:</strong> Working (you're logged in!)</p>
                <p>⏳ <strong>Seed Data:</strong> Needs to be created manually</p>
                <p className="pt-3 border-t border-blue-200">
                  <strong>Files to reference:</strong>
                  <code className="block bg-blue-100 px-2 py-1 rounded mt-1">SEED_DATA_GUIDE.md</code>
                  <code className="block bg-blue-100 px-2 py-1 rounded mt-1">supabase/seed-data.sql</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {organization?.brand_logo_url ? (
              <img
                src={organization.brand_logo_url}
                alt={organization.name}
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: organization?.brand_primary_color || '#3B82F6' }}
              >
                {organization?.name?.charAt(0) || 'D'}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {organization?.name || 'DropLab'}
              </h1>
              <p className="text-slate-600">
                {profile?.full_name || user?.email} • {profile?.role && (
                  <span className="capitalize">{profile.role}</span>
                )}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Payment Required Banner - Show for incomplete subscriptions */}
        {organization?.billing_status === 'incomplete' && (
          <Card className="mb-8 border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-8 w-8 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-orange-900 mb-2">
                    🔒 Complete Your Payment to Access All Features
                  </h3>
                  <p className="text-sm text-orange-800 mb-4">
                    Your account is set up, but you need to complete payment to unlock print and campaign features.
                    You'll receive <strong className="font-semibold">${'499.00'}</strong> in credits after payment.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleCompletePayment}
                      disabled={checkoutLoading}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      {checkoutLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Complete Payment ($499/month)
                        </>
                      )}
                    </Button>
                    <span className="text-xs text-orange-700">
                      Secure payment via Stripe
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Organization Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" style={{ color: organization?.brand_primary_color }} />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold">{organization?.name || 'Loading...'}</p>
                  <p className="text-sm text-slate-500 capitalize">
                    {organization?.plan_tier || 'Free'} Plan • {organization?.billing_status || 'Active'}
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-500">Team Members</p>
                  <p className="text-lg font-semibold">{teamCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credits */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4" style={{ color: organization?.brand_accent_color }} />
                Available Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-3xl font-bold">${organization?.credits?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-slate-500">
                    For Data Axle contacts & PostGrid printing
                  </p>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-xs text-slate-500">Monthly Limits</p>
                  <p className="text-sm">
                    {organization?.monthly_design_limit || 0} designs • {organization?.monthly_sends_limit || 0} sends
                  </p>
                </div>
                <div className="pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/settings?tab=billing')}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Purchase Credits
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Role */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: organization?.brand_secondary_color }} />
                Your Role & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold capitalize">{profile?.role || 'Member'}</p>
                  <p className="text-sm text-slate-500">{profile?.job_title || 'Team Member'}</p>
                </div>
                <div className="pt-2 border-t space-y-1">
                  {profile?.can_create_designs && (
                    <p className="text-xs text-green-600">✓ Create Designs</p>
                  )}
                  {profile?.can_send_campaigns && (
                    <p className="text-xs text-green-600">✓ Send Campaigns</p>
                  )}
                  {profile?.can_manage_billing && (
                    <p className="text-xs text-green-600">✓ Manage Billing</p>
                  )}
                  {!profile?.can_manage_billing && profile?.role === 'admin' && (
                    <p className="text-xs text-slate-400">✗ Manage Billing</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Management Widget (for owners only) */}
        {profile && profile.role === 'owner' && (
          <div className="mb-8">
            <TeamWidget userRole={profile.role} currentUserId={user?.id} />
          </div>
        )}

        {/* Campaign Performance Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Campaign Performance</h2>
          <CampaignPerformanceCards
            data={dashboardMetrics?.overview || null}
            isLoading={metricsLoading}
          />
        </div>

        {/* Recent Campaigns and Insights Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentCampaignsTable
              campaigns={dashboardMetrics?.recentCampaigns || []}
              isLoading={metricsLoading}
            />
          </div>
          <div>
            <PerformanceInsights
              topTemplate={dashboardMetrics?.insights?.topTemplate || null}
              topLocations={dashboardMetrics?.insights?.topLocations || []}
              isLoading={metricsLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
