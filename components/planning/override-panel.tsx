/**
 * Override Panel - Visual side-by-side comparison of AI vs User decisions
 *
 * Design Philosophy:
 * - SIMPLE: One-click to override, clear what you're changing
 * - VISUAL: Side-by-side AI recommendation vs. your override
 * - INFORMATIVE: Shows impact preview as you type
 * - USER-FRIENDLY: No technical jargon, clear reasoning
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Save, X, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { PlanItemWithStoreDetails } from '@/types/planning';
import type { PerformanceComparison } from '@/lib/analytics/performance-predictor';
import { PerformanceComparisonVisual } from './performance-comparison';

interface OverridePanelProps {
  item: PlanItemWithStoreDetails;
  onSave: (updates: OverrideChanges) => Promise<void>;
  onCancel: () => void;
  availableCampaigns?: Array<{ id: string; name: string }>;
}

export interface OverrideChanges {
  campaign_id?: string;
  campaign_name?: string;
  quantity?: number;
  override_notes?: string;
}

export function OverridePanel({ item, onSave, onCancel, availableCampaigns = [] }: OverridePanelProps) {
  const [quantity, setQuantity] = useState(item.quantity);
  const [campaignId, setCampaignId] = useState(item.campaign_id);
  const [notes, setNotes] = useState(item.override_notes || '');
  const [saving, setSaving] = useState(false);
  const [performanceComparison, setPerformanceComparison] = useState<PerformanceComparison | null>(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  // Calculate impact preview (null-safe)
  const quantityDiff = (quantity || 0) - (item.ai_recommended_quantity || item.quantity);
  const costDiff = quantityDiff * (item.unit_cost || 0);
  const campaignChanged = campaignId !== item.ai_recommended_campaign_id;

  const hasChanges = quantityDiff !== 0 || campaignChanged;

  // Fetch performance comparison when quantity changes
  useEffect(() => {
    // Don't fetch if no changes or quantity is invalid
    if (!hasChanges || !quantity || quantity <= 0 || isNaN(quantity)) {
      setPerformanceComparison(null);
      return;
    }

    const fetchComparison = async () => {
      setLoadingComparison(true);
      try {
        const response = await fetch('/api/campaigns/plans/performance-comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiStoreId: item.store_id,
            userStoreId: item.store_id,
            aiOriginalQuantity: item.ai_recommended_quantity || item.quantity, // AI's original recommendation (FIXED)
            userOverrideQuantity: quantity, // User's new quantity (VARIABLE)
            unitCost: item.unit_cost,
            aiExpectedConversions: item.ai_expected_conversions || 0,
            aiExpectedRate: item.ai_expected_conversion_rate || 3.0,
          }),
        });

        const result = await response.json();
        if (result.success) {
          setPerformanceComparison(result.data);
        }
      } catch (error) {
        console.error('Error fetching performance comparison:', error);
      } finally {
        setLoadingComparison(false);
      }
    };

    // Debounce the API call
    const timer = setTimeout(fetchComparison, 300);
    return () => clearTimeout(timer);
  }, [quantity, hasChanges, item.store_id, item.unit_cost, item.ai_expected_conversions, item.ai_expected_conversion_rate]);

  const handleSave = async () => {
    if (!hasChanges && !notes) {
      onCancel();
      return;
    }

    setSaving(true);
    try {
      const updates: OverrideChanges = {};

      if (quantityDiff !== 0) {
        updates.quantity = quantity;
      }

      if (campaignChanged) {
        updates.campaign_id = campaignId;
        const campaign = availableCampaigns.find(c => c.id === campaignId);
        updates.campaign_name = campaign?.name || item.campaign_name;
      }

      if (notes.trim()) {
        updates.override_notes = notes.trim();
      }

      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-slate-900">Override AI Recommendation</h3>
        </div>
        <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-800">
          Manual Override
        </Badge>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: AI Recommendation */}
        <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              AI
            </div>
            <h4 className="font-semibold text-blue-900">AI Recommendation</h4>
          </div>

          {/* Campaign */}
          <div>
            <Label className="text-blue-800">Campaign</Label>
            <div className="mt-1 p-2 bg-white rounded border border-blue-200">
              <div className="font-medium text-slate-900">
                {item.ai_recommended_campaign_name || item.campaign_name}
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-blue-800">Quantity</Label>
            <div className="mt-1 p-2 bg-white rounded border border-blue-200">
              <div className="font-medium text-slate-900">
                {item.ai_recommended_quantity || item.quantity} pieces
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Cost: ${((item.ai_recommended_quantity || item.quantity) * item.unit_cost).toFixed(2)}
              </div>
            </div>
          </div>

          {/* AI Confidence */}
          {item.ai_confidence !== null && (
            <div>
              <Label className="text-blue-800">AI Confidence</Label>
              <div className="mt-1 p-2 bg-white rounded border border-blue-200">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-slate-900">{item.ai_confidence}%</div>
                  <Badge className={
                    item.ai_confidence_level === 'high' ? 'bg-green-100 text-green-800 border-green-300' :
                    item.ai_confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    'bg-slate-100 text-slate-800 border-slate-300'
                  }>
                    {item.ai_confidence_level}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Why AI Chose This */}
          {item.ai_reasoning && item.ai_reasoning.length > 0 && (
            <div>
              <Label className="text-blue-800">AI Reasoning</Label>
              <div className="mt-1 p-2 bg-white rounded border border-blue-200 text-xs space-y-1">
                {item.ai_reasoning.slice(0, 3).map((reason, idx) => (
                  <div key={idx} className="text-slate-700">• {reason}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Your Override */}
        <div className="space-y-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-yellow-600 flex items-center justify-center text-white text-sm font-bold">
              YOU
            </div>
            <h4 className="font-semibold text-yellow-900">Your Override</h4>
          </div>

          {/* Campaign Override */}
          <div>
            <Label htmlFor="override-campaign" className="text-yellow-800">
              Campaign
              {campaignChanged && (
                <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 border-yellow-400">
                  Changed
                </Badge>
              )}
            </Label>
            <Select value={campaignId} onValueChange={setCampaignId} disabled={availableCampaigns.length === 0}>
              <SelectTrigger id="override-campaign" className="mt-1 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCampaigns.length > 0 ? (
                  availableCampaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value={item.campaign_id}>{item.campaign_name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity Override */}
          <div>
            <Label htmlFor="override-quantity" className="text-yellow-800">
              Quantity
              {quantityDiff !== 0 && (
                <Badge variant="outline" className="ml-2 text-xs bg-yellow-100 border-yellow-400">
                  {quantityDiff > 0 ? '+' : ''}{quantityDiff}
                </Badge>
              )}
            </Label>
            <Input
              id="override-quantity"
              type="number"
              min="0"
              step="50"
              value={quantity || ''}
              onChange={(e) => {
                const val = e.target.value;
                setQuantity(val === '' ? 0 : parseInt(val) || 0);
              }}
              className="mt-1 bg-white"
            />
            <div className="text-xs text-slate-600 mt-1">
              Cost: ${((quantity || 0) * item.unit_cost).toFixed(2)}
            </div>
          </div>

          {/* Impact Preview */}
          {hasChanges && (
            <div className="p-3 bg-white rounded border border-yellow-300">
              <Label className="text-yellow-800 text-xs uppercase tracking-wide">Impact Preview</Label>
              <div className="mt-2 space-y-1 text-sm">
                {quantityDiff !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Quantity Change:</span>
                    <div className="flex items-center gap-1">
                      {quantityDiff > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : quantityDiff < 0 ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : (
                        <Minus className="h-3 w-3 text-slate-400" />
                      )}
                      <span className={quantityDiff > 0 ? 'text-green-700 font-medium' : quantityDiff < 0 ? 'text-red-700 font-medium' : ''}>
                        {quantityDiff > 0 ? '+' : ''}{quantityDiff}
                      </span>
                    </div>
                  </div>
                )}
                {costDiff !== 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">Cost Change:</span>
                    <span className={costDiff > 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                      {costDiff > 0 ? '+' : ''}${costDiff.toFixed(2)}
                    </span>
                  </div>
                )}
                {campaignChanged && (
                  <div className="text-xs text-yellow-700 mt-2">
                    ⚠️ Changing campaign may affect performance predictions
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Override Reason */}
          <div>
            <Label htmlFor="override-notes" className="text-yellow-800">
              Reason for Override {!notes && <span className="text-slate-500">(optional)</span>}
            </Label>
            <Textarea
              id="override-notes"
              placeholder="Why are you overriding the AI recommendation?"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 bg-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Scientific Performance Comparison */}
      {hasChanges && performanceComparison && (
        <div className="border-t pt-6">
          {loadingComparison ? (
            <div className="text-center py-8 text-slate-600">
              <div className="animate-pulse">Calculating performance impact...</div>
            </div>
          ) : (
            <PerformanceComparisonVisual comparison={performanceComparison} />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-slate-600">
          {hasChanges ? (
            <span className="text-yellow-700 font-medium">You have unsaved changes</span>
          ) : (
            <span>No changes made</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!hasChanges && !notes)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Override'}
          </Button>
        </div>
      </div>
    </div>
  );
}
