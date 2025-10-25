/**
 * Planning Workspace - Dashboard
 * Lists all campaign plans with status and quick stats
 * Path: /campaigns/planning
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  Calendar,
  Store,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  Rocket
} from 'lucide-react';
import type { PlanSummary, PlanStatus } from '@/types/planning';

export default function PlanningDashboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | PlanStatus>('all');

  // Fetch plans with summary data
  useEffect(() => {
    fetchPlans();
  }, [activeTab]);

  async function fetchPlans() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ summary: 'true' });
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }

      const response = await fetch(`/api/campaigns/plans?${params}`);
      const data = await response.json();

      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleCreatePlan() {
    // For now, redirect to editor with "new" - will create plan there
    // In future: Could show modal to enter plan name first
    router.push('/campaigns/planning/new');
  }

  function handleViewPlan(planId: string) {
    router.push(`/campaigns/planning/${planId}`);
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planning Workspace</h1>
          <p className="text-muted-foreground mt-1">
            AI-driven campaign planning with visual reasoning
          </p>
        </div>
        <Button onClick={handleCreatePlan} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create New Plan
        </Button>
      </div>

      {/* Tabs for filtering by status */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList>
          <TabsTrigger value="all">All Plans</TabsTrigger>
          <TabsTrigger value="draft">
            <Clock className="mr-2 h-4 w-4" />
            Draft
          </TabsTrigger>
          <TabsTrigger value="approved">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="executed">
            <Rocket className="mr-2 h-4 w-4" />
            Executed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading plans...
            </div>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="text-muted-foreground">
                    {activeTab === 'all'
                      ? 'No plans yet. Create your first campaign plan to get started.'
                      : `No ${activeTab} plans found.`
                    }
                  </div>
                  {activeTab === 'all' && (
                    <Button onClick={handleCreatePlan}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create First Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onView={() => handleViewPlan(plan.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Individual Plan Card Component
 */
function PlanCard({ plan, onView }: { plan: PlanSummary; onView: () => void }) {
  // Status badge color
  const statusConfig = {
    draft: { color: 'bg-gray-500', label: 'Draft', icon: Clock },
    approved: { color: 'bg-blue-500', label: 'Approved', icon: CheckCircle2 },
    executed: { color: 'bg-green-500', label: 'Executed', icon: Rocket },
  };

  const config = statusConfig[plan.status];
  const StatusIcon = config.icon;

  // Confidence color (average across all stores)
  const confidenceColor =
    plan.avg_confidence >= 75 ? 'text-green-600' :
    plan.avg_confidence >= 50 ? 'text-yellow-600' :
    'text-red-600';

  // Format date
  const createdDate = new Date(plan.created_at).toLocaleDateString();

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onView}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-1">{plan.name}</CardTitle>
            {plan.description && (
              <CardDescription className="line-clamp-2">
                {plan.description}
              </CardDescription>
            )}
          </div>
          <Badge className={`${config.color} text-white ml-2`}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Store className="mr-1 h-4 w-4" />
              Stores
            </div>
            <div className="text-2xl font-bold">{plan.total_stores}</div>
            <div className="text-xs text-muted-foreground">
              {plan.included_stores} included
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="mr-1 h-4 w-4" />
              Est. Cost
            </div>
            <div className="text-2xl font-bold">
              ${plan.estimated_cost.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">
              {plan.total_quantity.toLocaleString()} pieces
            </div>
          </div>
        </div>

        {/* AI Confidence & Conversions */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="mr-1 h-4 w-4" />
              AI Confidence
            </div>
            <div className={`text-xl font-bold ${confidenceColor}`}>
              {plan.avg_confidence.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {plan.high_confidence_stores} high confidence
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <TrendingUp className="mr-1 h-4 w-4" />
              Expected Conv.
            </div>
            <div className="text-xl font-bold">
              {plan.expected_conversions.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">
              predicted
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center">
            <Calendar className="mr-1 h-3 w-3" />
            {createdDate}
          </div>
          {plan.waves_count > 0 && (
            <div>
              {plan.waves_count} wave{plan.waves_count !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
