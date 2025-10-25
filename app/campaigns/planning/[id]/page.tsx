/**
 * Planning Workspace - Plan Editor
 * Edit campaign plan with AI-driven recommendations
 * Path: /campaigns/planning/[id]
 */

'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import type { PlanSummary, PlanItemWithStoreDetails } from '@/types/planning';
import { AI

ReasoningPanel } from '@/components/planning/ai-reasoning';
import { AIConfidenceScore } from '@/components/planning/ai-confidence-badge';

interface PlanEditorPageProps {
  params: { id: string };
}

export default function PlanEditorPage({ params }: PlanEditorPageProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [items, setItems] = useState<PlanItemWithStoreDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (params.id === 'new') {
      // TODO: Create new plan flow
      toast.error('Create new plan flow not yet implemented');
      router.push('/campaigns/planning');
      return;
    }

    fetchPlanData();
  }, [params.id]);

  async function fetchPlanData() {
    try {
      setLoading(true);

      // Fetch plan summary
      const planResponse = await fetch(`/api/campaigns/plans/${params.id}?summary=true`);
      const planData = await planResponse.json();

      if (!planData.success) {
        toast.error('Failed to load plan');
        router.push('/campaigns/planning');
        return;
      }

      setPlan(planData.data);

      // Fetch plan items with store details
      const itemsResponse = await fetch(`/api/campaigns/plans/${params.id}/items?includeStoreDetails=true`);
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
      const response = await fetch(`/api/campaigns/plans/${params.id}/approve`, {
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
      const response = await fetch(`/api/campaigns/plans/${params.id}/execute`, {
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.total_stores}</div>
            <p className="text-xs text-muted-foreground">
              {plan.included_stores} included
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${plan.estimated_cost.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {plan.total_quantity.toLocaleString()} pieces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.avg_confidence.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              {plan.high_confidence_stores} high confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Conv.</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plan.expected_conversions.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">predicted</p>
          </CardContent>
        </Card>
      </div>

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
                  expanded={expandedRows.has(item.id)}
                  onToggle={() => toggleRowExpanded(item.id)}
                  canEdit={canEdit}
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
 * Individual Store Row with expandable AI reasoning
 */
function StoreRow({
  item,
  expanded,
  onToggle,
  canEdit,
}: {
  item: PlanItemWithStoreDetails;
  expanded: boolean;
  onToggle: () => void;
  canEdit: boolean;
}) {
  const isOverridden = item.is_overridden;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Main Row */}
      <div
        className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
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

        {/* Store Info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium">{item.store_number} - {item.store_name}</div>
          <div className="text-sm text-muted-foreground">
            {item.city}, {item.state}
          </div>
        </div>

        {/* Campaign */}
        <div className="w-48">
          <div className="text-sm font-medium">{item.campaign_name}</div>
          {isOverridden && (
            <Badge variant="outline" className="text-xs mt-1">
              User Override
            </Badge>
          )}
        </div>

        {/* Quantity */}
        <div className="w-24 text-right">
          <div className="font-medium">{item.quantity}</div>
          <div className="text-xs text-muted-foreground">pieces</div>
        </div>

        {/* AI Confidence */}
        <div className="w-24 text-right">
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

      {/* Expanded: AI Reasoning Panel */}
      {expanded && (
        <div className="border-t bg-muted/20 p-6">
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
        </div>
      )}
    </div>
  );
}
