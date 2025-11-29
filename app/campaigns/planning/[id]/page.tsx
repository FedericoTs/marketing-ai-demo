/**
 * Planning Workspace - Plan Editor
 * Edit campaign plan with AI-driven recommendations
 * Path: /campaigns/planning/[id]
 */

'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  CheckCircle2,
  Rocket,
  Store,
  DollarSign,
  TrendingUp,
  Save,
  ChevronDown,
  ChevronUp,
  Award,
  Target,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlanSummary, PlanItemWithStoreDetails } from '@/types/planning';
import { AIReasoningPanel } from '@/components/planning/ai-reasoning';
import { AIConfidenceScore } from '@/components/planning/ai-confidence-badge';
import { OverridePanel, type OverrideChanges } from '@/components/planning/override-panel';
import { PlanHealthDashboard } from '@/components/planning/plan-health-dashboard';
import { StorePerformanceComparison } from '@/components/planning/store-performance-comparison';

interface PlanEditorPageProps {
  params: Promise<{ id: string }>;
}

export default function PlanEditorPage({ params }: PlanEditorPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [items, setItems] = useState<PlanItemWithStoreDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id === 'new') {
      // TODO: Create new plan flow
      toast.error('Create new plan flow not yet implemented');
      router.push('/campaigns/planning');
      return;
    }

    fetchPlanData();
  }, [id]);

  async function fetchPlanData() {
    try {
      setLoading(true);

      // Fetch plan summary
      const planResponse = await fetch(`/api/campaigns/plans/${id}?summary=true`);
      const planData = await planResponse.json();

      if (!planData.success) {
        toast.error('Failed to load plan');
        router.push('/campaigns/planning');
        return;
      }

      setPlan(planData.data);

      // Fetch plan items with store details
      const itemsResponse = await fetch(`/api/campaigns/plans/${id}/items?includeStoreDetails=true`);
      const itemsData = await itemsResponse.json();

      if (itemsData.success) {
        setItems(itemsData.data);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      toast.error('Failed to load plan');
    } finally {
      setLoading(false);
    }
  }

  function toggleRowExpanded(itemId: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  async function handleApprovePlan() {
    if (!plan) return;

    if (plan.total_stores === 0) {
      toast.error('Cannot approve plan with no stores');
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/plans/${id}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Plan approved successfully');
        fetchPlanData(); // Refresh
      } else {
        toast.error(data.error || 'Failed to approve plan');
      }
    } catch (error) {
      console.error('Error approving plan:', error);
      toast.error('Failed to approve plan');
    }
  }

  async function handleExecutePlan() {
    if (!plan) return;

    if (plan.status !== 'approved') {
      toast.error('Plan must be approved before execution');
      return;
    }

    if (!confirm(`Execute plan "${plan.name}"? This will create ${plan.included_stores} orders.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/campaigns/plans/${id}/execute`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Plan executed successfully');
        router.push('/campaigns/orders'); // Redirect to orders page
      } else {
        toast.error(data.error || 'Failed to execute plan');
      }
    } catch (error) {
      console.error('Error executing plan:', error);
      toast.error('Failed to execute plan');
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Loading plan...</div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">Plan not found</div>
      </div>
    );
  }

  // Status badge
  const statusConfig = {
    draft: { color: 'bg-gray-500', label: 'Draft' },
    approved: { color: 'bg-blue-500', label: 'Approved' },
    executed: { color: 'bg-green-500', label: 'Executed' },
  };

  const config = statusConfig[plan.status];
  const canEdit = plan.status === 'draft';
  const canApprove = plan.status === 'draft' && plan.total_stores > 0;
  const canExecute = plan.status === 'approved';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/campaigns/planning')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{plan.name}</h1>
              <Badge className={`${config.color} text-white`}>
                {config.label}
              </Badge>
            </div>
            {plan.description && (
              <p className="text-muted-foreground mt-1">{plan.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canApprove && (
            <Button onClick={handleApprovePlan} variant="outline">
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve Plan
            </Button>
          )}
          {canExecute && (
            <Button onClick={handleExecutePlan}>
              <Rocket className="mr-2 h-4 w-4" />
              Execute Plan
            </Button>
          )}
        </div>
      </div>

      {/* Plan Health Dashboard - ULTRA VISUAL */}
      <PlanHealthDashboard
        avgConfidence={plan.avg_confidence}
        highConfidenceStores={plan.high_confidence_stores}
        totalStores={plan.total_stores}
        expectedConversions={plan.expected_conversions}
        estimatedCost={plan.estimated_cost}
        totalQuantity={plan.total_quantity}
      />

      {/* Plan Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Store Recommendations</CardTitle>
          <CardDescription>
            Review AI recommendations for each store. Click on a row to see detailed reasoning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No stores in this plan yet.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <StoreRow
                  key={item.id}
                  item={item}
                  allItems={items}
                  plan={plan}
                  expanded={expandedRows.has(item.id)}
                  onToggle={() => toggleRowExpanded(item.id)}
                  canEdit={canEdit}
                  planId={id}
                  onUpdate={fetchPlanData}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Individual Store Row with expandable AI reasoning and override capability
 */
function StoreRow({
  item,
  allItems,
  plan,
  expanded,
  onToggle,
  canEdit,
  planId,
  onUpdate,
}: {
  item: PlanItemWithStoreDetails;
  allItems: PlanItemWithStoreDetails[];
  plan: PlanSummary;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
  planId: string;
  onUpdate: () => void;
}) {
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const isOverridden = item.is_overridden;

  // Calculate plan averages from all items
  const planAverage = {
    avgConfidence: allItems.length > 0
      ? allItems.reduce((sum, i) => sum + (i.ai_confidence ?? 0), 0) / allItems.length
      : 0,
    avgExpectedConversions: allItems.length > 0
      ? allItems.reduce((sum, i) => sum + (i.ai_expected_conversions ?? 0), 0) / allItems.length
      : 0,
    avgQuantity: allItems.length > 0
      ? allItems.reduce((sum, i) => sum + (i.quantity ?? 0), 0) / allItems.length
      : 0,
    avgCostPerPiece: plan.estimated_cost && plan.total_quantity > 0
      ? plan.estimated_cost / plan.total_quantity
      : undefined,
  };

  const planStats = {
    totalStores: plan.total_stores,
    highConfidenceStores: plan.high_confidence_stores,
  };

  // Determine performance badge based on comparison to plan average
  const confidenceRatio = planAverage.avgConfidence > 0
    ? (item.ai_confidence ?? 0) / planAverage.avgConfidence
    : 1;

  const performanceBadge = confidenceRatio >= 1.2 ? {
    label: 'Top Performer',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Award,
  } : confidenceRatio >= 1.05 ? {
    label: 'Above Average',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: TrendingUp,
  } : confidenceRatio >= 0.95 ? null : {
    label: 'Below Average',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: TrendingDown,
  };

  const PerformanceIcon = performanceBadge?.icon;

  const handleOverrideSave = async (changes: OverrideChanges) => {
    try {
      const response = await fetch(`/api/campaigns/plans/${planId}/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Override saved successfully');
        setIsOverrideMode(false);
        onUpdate(); // Refresh plan data
      } else {
        toast.error(result.error || 'Failed to save override');
      }
    } catch (error) {
      console.error('Error saving override:', error);
      toast.error('Failed to save override');
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Main Row - Enhanced with Visual Badges */}
      <div
        className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <div>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Store Info with Performance Badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.store_number} - {item.store_name}</span>
            {performanceBadge && PerformanceIcon && (
              <Badge className={`${performanceBadge.color} border text-xs flex items-center gap-1 px-2 py-0.5`}>
                <PerformanceIcon className="h-3 w-3" />
                {performanceBadge.label}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {item.city}, {item.state}
          </div>
        </div>

        {/* Campaign with Override Badge */}
        <div className="w-48">
          <div className="text-sm font-medium">{item.campaign_name}</div>
          {isOverridden && (
            <Badge variant="outline" className="text-xs mt-1 bg-yellow-50 border-yellow-400 text-yellow-800">
              User Override
            </Badge>
          )}
        </div>

        {/* Expected Conversions - NEW */}
        <div className="w-28 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="font-bold text-blue-600">
              {item.ai_expected_conversions?.toFixed(1) ?? '0'}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">expected</div>
        </div>

        {/* Quantity */}
        <div className="w-24 text-right">
          <div className="font-medium">{item.quantity}</div>
          <div className="text-xs text-muted-foreground">pieces</div>
        </div>

        {/* AI Confidence */}
        <div className="w-28 text-right">
          {item.ai_confidence !== null && item.ai_confidence_level !== null ? (
            <AIConfidenceScore
              confidence={item.ai_confidence}
              level={item.ai_confidence_level}
            />
          ) : (
            <span className="text-sm text-muted-foreground">N/A</span>
          )}
        </div>
      </div>

      {/* Expanded: Performance Comparison + AI Reasoning OR Override Panel */}
      {expanded && (
        <div className="border-t bg-muted/20 p-6">
          {isOverrideMode ? (
            <OverridePanel
              item={item}
              onSave={handleOverrideSave}
              onCancel={() => setIsOverrideMode(false)}
            />
          ) : (
            <>
              {/* Visual Performance Comparison */}
              <div className="mb-6">
                <StorePerformanceComparison
                  store={{
                    aiConfidence: item.ai_confidence ?? 0,
                    expectedConversions: item.ai_expected_conversions ?? 0,
                    quantity: item.quantity ?? 0,
                    costPerPiece: planAverage.avgCostPerPiece,
                  }}
                  planAverage={planAverage}
                  planStats={planStats}
                />
              </div>

              {/* AI Reasoning Panel */}
              <AIReasoningPanel
                confidence={item.ai_confidence}
                confidenceLevel={item.ai_confidence_level}
                scores={{
                  store_performance: item.ai_score_store_performance,
                  creative_performance: item.ai_score_creative_performance,
                  geographic_fit: item.ai_score_geographic_fit,
                  timing_alignment: item.ai_score_timing_alignment,
                }}
                reasoning={item.ai_reasoning}
                risks={item.ai_risk_factors}
                expectedConversions={item.ai_expected_conversions}
              />

              {/* Override Button */}
              {canEdit && (
                <div className="mt-4 pt-4 border-t flex justify-end">
                  <Button
                    onClick={() => setIsOverrideMode(true)}
                    variant="outline"
                    className="bg-yellow-50 hover:bg-yellow-100 border-yellow-300 text-yellow-900"
                  >
                    Override AI Recommendation
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
