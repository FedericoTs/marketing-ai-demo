# Detailed Implementation Plan - 8 Workflow Improvements

**Created**: October 25, 2025
**Purpose**: Ultra-detailed technical specifications for implementing 3-click workflow optimizations
**Total Effort**: 32 hours
**Impact**: 67-93% reduction in click counts across core workflows

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Improvement #1: Campaign Quick Start Wizard](#improvement-1-campaign-quick-start-wizard)
3. [Improvement #2: Rerun Order Button](#improvement-2-rerun-order-button)
4. [Improvement #3: Send to Stores Quick Action](#improvement-3-send-to-stores-quick-action)
5. [Improvement #4: Dashboard Quick Actions FAB](#improvement-4-dashboard-quick-actions-fab)
6. [Improvement #5: Contextual Quick Actions](#improvement-5-contextual-quick-actions)
7. [Improvement #6: Smart Navigation Breadcrumbs](#improvement-6-smart-navigation-breadcrumbs)
8. [Improvement #7: Recent Items Sidebar](#improvement-7-recent-items-sidebar)
9. [Improvement #8: Command Palette (Cmd+K)](#improvement-8-command-palette-cmdk)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Testing Strategy](#testing-strategy)
12. [Rollback Plan](#rollback-plan)

---

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.5.4 (App Router), React 19.1.0, TypeScript
- **UI Library**: shadcn/ui (Radix UI primitives), Tailwind CSS v4
- **Database**: SQLite (better-sqlite3)
- **State Management**: React hooks (useState, useEffect), localStorage
- **ID Generation**: nanoid(16)
- **Icons**: lucide-react

### Design Principles
1. **Modal-First**: Use dialogs for quick actions (avoid page navigation)
2. **Progressive Disclosure**: Show only necessary fields initially
3. **Smart Defaults**: Pre-fill with last used values or AI suggestions
4. **Optimistic Updates**: Update UI immediately, sync in background
5. **Keyboard-First**: All actions accessible via keyboard shortcuts

### Shared Utilities

#### API Response Utilities
```typescript
// lib/utils/api-response.ts (EXISTING)
export function successResponse<T>(data: T, message?: string) {
  return { success: true, data, message };
}

export function errorResponse(message: string, code?: string) {
  return { success: false, error: { message, code } };
}
```

#### Local Storage Utilities (NEW)
```typescript
// lib/utils/recent-items.ts
export interface RecentItem {
  id: string;
  type: 'campaign' | 'order' | 'template' | 'store-group';
  name: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export function addRecentItem(item: Omit<RecentItem, 'timestamp'>) {
  const items = getRecentItems();
  const newItem: RecentItem = { ...item, timestamp: new Date().toISOString() };

  // Remove duplicates
  const filtered = items.filter(i => !(i.id === item.id && i.type === item.type));

  // Add to front, limit to 20 items
  const updated = [newItem, ...filtered].slice(0, 20);

  localStorage.setItem('recent-items', JSON.stringify(updated));
  return newItem;
}

export function getRecentItems(type?: RecentItem['type']): RecentItem[] {
  const stored = localStorage.getItem('recent-items');
  if (!stored) return [];

  const items: RecentItem[] = JSON.parse(stored);
  return type ? items.filter(i => i.type === type) : items;
}

export function clearRecentItems() {
  localStorage.removeItem('recent-items');
}
```

#### Keyboard Shortcut Manager (NEW)
```typescript
// lib/utils/keyboard-shortcuts.ts
export type ShortcutKey = 'cmd+k' | 'cmd+n' | 'cmd+shift+n' | 'cmd+r' | '/' | 'esc';

export interface ShortcutHandler {
  key: ShortcutKey;
  description: string;
  handler: () => void;
  preventDefault?: boolean;
}

class KeyboardShortcutManager {
  private handlers: Map<string, ShortcutHandler[]> = new Map();

  register(scopeId: string, shortcuts: ShortcutHandler[]) {
    this.handlers.set(scopeId, shortcuts);
  }

  unregister(scopeId: string) {
    this.handlers.delete(scopeId);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    // Build key string
    let key = '';
    if (cmdKey) key += 'cmd+';
    if (e.shiftKey && cmdKey) key += 'shift+';
    key += e.key.toLowerCase();

    // Find matching handlers
    for (const [_, shortcuts] of this.handlers) {
      const handler = shortcuts.find(h => h.key === key);
      if (handler) {
        if (handler.preventDefault) {
          e.preventDefault();
        }
        handler.handler();
        break;
      }
    }
  };

  init() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

export const keyboardManager = new KeyboardShortcutManager();
```

---

## Improvement #1: Campaign Quick Start Wizard

**Effort**: 8 hours
**Impact**: 12+ clicks → 3 clicks (75% reduction)
**Priority**: High

### Problem Statement
Creating a first campaign requires:
1. Dashboard → Settings (configure company) → 3-5 form fields → Save
2. → Copywriting → Enter message → Generate → Copy
3. → DM Creative → Paste → Configure → Generate
4. → Orders → New Order → Select everything again

**Total**: 12+ clicks, 4 page navigations, high cognitive load

### Solution: Multi-Step Wizard Modal

#### User Flow
```
1. Dashboard → "Quick Start Campaign" button (1 click)
2. Wizard opens (modal):
   - Step 1: Campaign Name + Message (AI-assisted)
   - Step 2: Select Template
   - Step 3: Preview + Confirm
3. Click "Create Campaign" → Done! (1 click)

Total: 3 clicks, 0 page navigations
```

### Technical Specification

#### 1. Component Structure
```
components/
  campaigns/
    quick-start-wizard.tsx         # Main wizard component
    wizard-step-campaign.tsx        # Step 1: Campaign info
    wizard-step-template.tsx        # Step 2: Template selection
    wizard-step-preview.tsx         # Step 3: Preview
```

#### 2. Data Flow
```typescript
// components/campaigns/quick-start-wizard.tsx
"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { WizardStepCampaign } from "./wizard-step-campaign";
import { WizardStepTemplate } from "./wizard-step-template";
import { WizardStepPreview } from "./wizard-step-preview";
import { nanoid } from "nanoid";

export interface QuickStartWizardData {
  // Step 1: Campaign Info
  campaignName: string;
  message: string;
  companyName: string;

  // Step 2: Template Selection
  templateId: string;

  // Step 3: Preview (derived)
  previewUrl?: string;
}

interface QuickStartWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: (campaignId: string) => void;
}

export function QuickStartWizard({ open, onOpenChange, onComplete }: QuickStartWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [wizardData, setWizardData] = useState<Partial<QuickStartWizardData>>({});

  // Auto-suggest campaign name based on company + current month
  useEffect(() => {
    if (open && !wizardData.campaignName) {
      const companyName = localStorage.getItem('companyName') || 'My Company';
      const now = new Date();
      const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      setWizardData(prev => ({
        ...prev,
        campaignName: `${companyName} Campaign - ${monthYear}`,
        companyName,
      }));
    }
  }, [open]);

  const handleNext = () => {
    // Validate current step
    if (step === 1) {
      if (!wizardData.campaignName || !wizardData.message) {
        toast.error('Please fill in campaign name and message');
        return;
      }
    } else if (step === 2) {
      if (!wizardData.templateId) {
        toast.error('Please select a template');
        return;
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Step 1: Create campaign
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wizardData.campaignName,
          message: wizardData.message,
          companyName: wizardData.companyName,
        }),
      });

      const campaignResult = await campaignResponse.json();

      if (!campaignResult.success) {
        throw new Error(campaignResult.error?.message || 'Failed to create campaign');
      }

      const campaignId = campaignResult.data.id;

      // Step 2: Link template to campaign (optional)
      if (wizardData.templateId) {
        await fetch(`/api/campaigns/templates/${wizardData.templateId}/use`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId }),
        });
      }

      // Step 3: Add to recent items
      const { addRecentItem } = await import('@/lib/utils/recent-items');
      addRecentItem({
        id: campaignId,
        type: 'campaign',
        name: wizardData.campaignName!,
        metadata: { templateId: wizardData.templateId },
      });

      toast.success('Campaign created successfully!');
      onOpenChange(false);

      if (onComplete) {
        onComplete(campaignId);
      }

      // Reset wizard
      setStep(1);
      setWizardData({});

    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Start Campaign Wizard</DialogTitle>
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3].map(num => (
              <div
                key={num}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  num <= step ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600 mt-2">
            Step {step} of 3: {
              step === 1 ? 'Campaign Details' :
              step === 2 ? 'Template Selection' :
              'Preview & Confirm'
            }
          </p>
        </DialogHeader>

        <div className="py-6">
          {step === 1 && (
            <WizardStepCampaign
              data={wizardData}
              onChange={setWizardData}
            />
          )}

          {step === 2 && (
            <WizardStepTemplate
              data={wizardData}
              onChange={setWizardData}
            />
          )}

          {step === 3 && (
            <WizardStepPreview
              data={wizardData as QuickStartWizardData}
            />
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || loading}
          >
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            {step < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading}>
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Wizard Step Components

**Step 1: Campaign Details**
```typescript
// components/campaigns/wizard-step-campaign.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useState } from "react";

interface WizardStepCampaignProps {
  data: Partial<QuickStartWizardData>;
  onChange: (data: Partial<QuickStartWizardData>) => void;
}

export function WizardStepCampaign({ data, onChange }: WizardStepCampaignProps) {
  const [generatingCopy, setGeneratingCopy] = useState(false);

  const handleAIGenerate = async () => {
    setGeneratingCopy(true);

    try {
      const response = await fetch('/api/copywriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: data.message || 'Generate marketing copy for my campaign',
          companyName: data.companyName,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.variations?.length > 0) {
        // Use first variation
        const firstVariation = result.data.variations[0];
        onChange({
          ...data,
          message: firstVariation.copy,
        });
      }
    } catch (error) {
      console.error('Error generating copy:', error);
    } finally {
      setGeneratingCopy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="campaign-name">Campaign Name</Label>
        <Input
          id="campaign-name"
          value={data.campaignName || ''}
          onChange={(e) => onChange({ ...data, campaignName: e.target.value })}
          placeholder="e.g., Summer Sale 2025"
          className="mt-2"
        />
        <p className="text-xs text-slate-500 mt-1">
          This will help you identify the campaign later
        </p>
      </div>

      <div>
        <Label htmlFor="company-name">Company Name</Label>
        <Input
          id="company-name"
          value={data.companyName || ''}
          onChange={(e) => onChange({ ...data, companyName: e.target.value })}
          placeholder="e.g., Acme Corp"
          className="mt-2"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="message">Marketing Message</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAIGenerate}
            disabled={generatingCopy}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {generatingCopy ? 'Generating...' : 'AI Generate'}
          </Button>
        </div>
        <Textarea
          id="message"
          value={data.message || ''}
          onChange={(e) => onChange({ ...data, message: e.target.value })}
          placeholder="Enter your marketing message or click AI Generate"
          rows={6}
        />
      </div>
    </div>
  );
}
```

**Step 2: Template Selection**
```typescript
// components/campaigns/wizard-step-template.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";
import { CampaignTemplate } from "@/lib/database/campaign-management";

interface WizardStepTemplateProps {
  data: Partial<QuickStartWizardData>;
  onChange: (data: Partial<QuickStartWizardData>) => void;
}

export function WizardStepTemplate({ data, onChange }: WizardStepTemplateProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
        {filteredTemplates.map(template => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              data.templateId === template.id
                ? 'border-blue-500 border-2 bg-blue-50'
                : 'border-slate-200'
            }`}
            onClick={() => onChange({ ...data, templateId: template.id })}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{template.name}</h4>
                  {template.description && (
                    <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      Used {template.use_count} times
                    </span>
                  </div>
                </div>

                {data.templateId === template.id && (
                  <div className="ml-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-500">
            No templates found
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Preview**
```typescript
// components/campaigns/wizard-step-preview.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Building2, MessageSquare, Layout } from "lucide-react";
import { QuickStartWizardData } from "./quick-start-wizard";

interface WizardStepPreviewProps {
  data: QuickStartWizardData;
}

export function WizardStepPreview({ data }: WizardStepPreviewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          🎉 Ready to Create Your Campaign!
        </h3>
        <p className="text-sm text-slate-700">
          Review the details below. You can edit or add stores after creation.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Campaign Name
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-slate-900">{data.campaignName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-slate-900">{data.companyName}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Marketing Message
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.message}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">
            {data.templateId ? `Template ID: ${data.templateId}` : 'No template selected'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 4. Integration with Dashboard

**Update Dashboard Page**
```typescript
// app/page.tsx (or app/dashboard/page.tsx)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { QuickStartWizard } from "@/components/campaigns/quick-start-wizard";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();

  const handleWizardComplete = (campaignId: string) => {
    // Navigate to campaign detail or orders
    router.push(`/campaigns/${campaignId}`);
  };

  return (
    <div>
      {/* Quick Start Button */}
      <Button
        size="lg"
        className="gap-2"
        onClick={() => setShowWizard(true)}
      >
        <Rocket className="h-5 w-5" />
        Quick Start Campaign
      </Button>

      {/* Wizard Modal */}
      <QuickStartWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
    </div>
  );
}
```

#### 5. Database Schema (No Changes Needed)
All existing tables are sufficient:
- `campaigns` (id, name, message, company_name, status, created_at)
- `campaign_templates` (id, name, description, category, template_data, use_count)

#### 6. Testing Checklist
- [ ] Wizard opens from dashboard
- [ ] Step 1: Auto-suggests campaign name (Company + Month Year)
- [ ] Step 1: AI Generate creates marketing copy
- [ ] Step 1: Validation prevents next without required fields
- [ ] Step 2: Templates load and display correctly
- [ ] Step 2: Search filters templates
- [ ] Step 2: Selection highlights chosen template
- [ ] Step 3: Preview shows all details correctly
- [ ] Complete: Campaign is created in database
- [ ] Complete: Template use count incremented
- [ ] Complete: Recent items updated
- [ ] Complete: User redirected to campaign detail
- [ ] Error handling: Network failure shows toast
- [ ] Error handling: Wizard resets on close
- [ ] Keyboard: ESC closes wizard
- [ ] Keyboard: Enter advances to next step

---

## Improvement #2: Rerun Order Button

**Effort**: 2 hours
**Impact**: 15+ clicks → 1 click (93% reduction)
**Priority**: HIGHEST

### Problem Statement
Monthly recurring campaigns require manually:
1. Orders page → View previous order
2. Note stores and quantities
3. → New Order → Select campaign
4. → Manually re-select all stores
5. → Manually re-enter quantities
6. → Generate

**Total**: 15+ clicks, manual data re-entry, error-prone

### Solution: One-Click Order Replication

#### User Flow
```
1. Orders page → Previous order → "Rerun Order" button (1 click)
2. Confirmation dialog: "Rerun order ORD-2025-10-001? This will create an identical order."
3. Click "Confirm" → Done! New order created with same stores/quantities

Total: 1 click (or 2 with confirmation)
```

### Technical Specification

#### 1. Component Structure
```
components/
  orders/
    order-list-item.tsx             # Updated: Add "Rerun" button
    rerun-order-dialog.tsx          # NEW: Confirmation dialog
```

#### 2. Database Function (NEW)

```typescript
// lib/database/order-queries.ts (ADD THIS FUNCTION)

/**
 * Duplicate an existing order with new order number
 * Creates identical order items with same stores and quantities
 */
export function duplicateOrder(originalOrderId: string): CampaignOrder {
  const db = getDatabase();

  // Get original order
  const originalOrder = getOrderById(originalOrderId);
  if (!originalOrder) {
    throw new Error(`Order ${originalOrderId} not found`);
  }

  // Get original order items
  const originalItems = getOrderItems(originalOrderId);

  // Create new order with same parameters
  const newOrderId = nanoid();
  const newOrderNumber = generateOrderNumber();
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // Insert new order
    db.prepare(`
      INSERT INTO campaign_orders (
        id, order_number, created_at, updated_at, status,
        total_stores, total_quantity, estimated_cost,
        notes, supplier_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newOrderId,
      newOrderNumber,
      now,
      now,
      'draft', // Always start as draft
      originalOrder.total_stores,
      originalOrder.total_quantity,
      originalOrder.estimated_cost,
      `Rerun of ${originalOrder.order_number}${originalOrder.notes ? `\n\n${originalOrder.notes}` : ''}`,
      originalOrder.supplier_email
    );

    // Insert order items (duplicate with same quantities)
    const insertItem = db.prepare(`
      INSERT INTO campaign_order_items (
        id, order_id, store_id, campaign_id,
        recommended_quantity, approved_quantity,
        unit_cost, total_cost, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of originalItems) {
      insertItem.run(
        nanoid(),
        newOrderId,
        item.store_id,
        item.campaign_id,
        item.recommended_quantity,
        item.approved_quantity,
        item.unit_cost,
        item.total_cost,
        item.notes,
        now
      );
    }
  });

  transaction();

  return getOrderById(newOrderId)!;
}
```

#### 3. API Route (NEW)

```typescript
// app/api/campaigns/orders/[id]/duplicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { duplicateOrder } from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

/**
 * POST /api/campaigns/orders/[id]/duplicate
 * Duplicate an existing order with identical stores and quantities
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    console.log('🔁 [Duplicate Order API] Duplicating order:', orderId);

    // Duplicate the order
    const newOrder = duplicateOrder(orderId);

    console.log('✅ [Duplicate Order API] Order duplicated:', newOrder.order_number);

    return NextResponse.json(
      successResponse(
        { order: newOrder },
        `Order duplicated successfully: ${newOrder.order_number}`
      )
    );
  } catch (error) {
    console.error('❌ [Duplicate Order API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate order';

    return NextResponse.json(
      errorResponse(errorMessage, 'DUPLICATE_ERROR'),
      { status: 500 }
    );
  }
}
```

#### 4. Rerun Dialog Component (NEW)

```typescript
// components/orders/rerun-order-dialog.tsx
"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw, Store, Package, DollarSign } from "lucide-react";
import { CampaignOrder } from "@/lib/database/order-queries";
import { toast } from "sonner";

interface RerunOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CampaignOrder;
  onSuccess?: (newOrder: CampaignOrder) => void;
}

export function RerunOrderDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: RerunOrderDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleRerun = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/campaigns/orders/${order.id}/duplicate`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to duplicate order');
      }

      toast.success(`Order ${result.data.order.order_number} created successfully!`);
      onOpenChange(false);

      if (onSuccess) {
        onSuccess(result.data.order);
      }
    } catch (error) {
      console.error('Error duplicating order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCw className="h-5 w-5" />
            Rerun Order {order.order_number}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new order with identical stores and quantities.
            The new order will be saved as "draft" for your review.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Total Stores</span>
            </div>
            <span className="text-lg font-bold text-purple-900">
              {order.total_stores}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Total Quantity</span>
            </div>
            <span className="text-lg font-bold text-green-900">
              {order.total_quantity.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Estimated Cost</span>
            </div>
            <span className="text-lg font-bold text-orange-900">
              ${order.estimated_cost.toFixed(2)}
            </span>
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRerun}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4" />
                Rerun Order
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### 5. Integration with Orders List

**Update Order List Item Component**
```typescript
// components/orders/order-list-item.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";
import { CampaignOrder } from "@/lib/database/order-queries";
import { RerunOrderDialog } from "./rerun-order-dialog";
import { useRouter } from "next/navigation";

interface OrderListItemProps {
  order: CampaignOrder;
  onUpdate?: () => void;
}

export function OrderListItem({ order, onUpdate }: OrderListItemProps) {
  const [showRerunDialog, setShowRerunDialog] = useState(false);
  const router = useRouter();

  const handleRerunSuccess = (newOrder: CampaignOrder) => {
    // Navigate to new order detail page
    router.push(`/orders/${newOrder.id}`);

    // Refresh orders list
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <div className="border rounded-lg p-4">
      {/* Existing order display */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{order.order_number}</h3>
          <p className="text-sm text-slate-600">
            {order.total_stores} stores • {order.total_quantity} pieces
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* Existing buttons (View, Edit, etc.) */}

          {/* NEW: Rerun button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRerunDialog(true)}
            className="gap-2"
          >
            <RotateCw className="h-4 w-4" />
            Rerun
          </Button>
        </div>
      </div>

      {/* Rerun Dialog */}
      <RerunOrderDialog
        open={showRerunDialog}
        onOpenChange={setShowRerunDialog}
        order={order}
        onSuccess={handleRerunSuccess}
      />
    </div>
  );
}
```

#### 6. Testing Checklist
- [ ] "Rerun" button appears on all order list items
- [ ] Clicking button opens confirmation dialog
- [ ] Dialog shows correct order details (stores, quantity, cost)
- [ ] Clicking "Cancel" closes dialog without action
- [ ] Clicking "Rerun Order" creates duplicate
- [ ] New order has different order number (auto-generated)
- [ ] New order has status "draft"
- [ ] New order has note "Rerun of ORD-XXXX-XX-XXX"
- [ ] New order has identical stores
- [ ] New order has identical quantities
- [ ] New order items correctly linked to stores and campaigns
- [ ] Success toast shows new order number
- [ ] User redirected to new order detail page
- [ ] Original order unchanged
- [ ] Orders list refreshes automatically
- [ ] Error handling: Missing original order shows error
- [ ] Error handling: Database failure shows toast

#### 7. Performance Considerations
- **Transaction**: Entire duplication in single database transaction (atomic)
- **No AI Calls**: Pure database operations (< 100ms)
- **Optimistic UI**: Could add optimistic update before API call (future enhancement)

---

## Improvement #3: Send to Stores Quick Action

**Effort**: 4 hours
**Impact**: 9+ clicks → 3 clicks (67% reduction)
**Priority**: High

### Problem Statement
Using a template to create orders requires:
1. Template Library → Select template
2. → "Use Template" → DM Creative page
3. → Manually configure campaign
4. → Navigate to Orders
5. → New Order → Select campaign again
6. → Select stores → Configure

**Total**: 9+ clicks, repeated data entry

### Solution: Direct Template-to-Order Flow

#### User Flow
```
1. Template Library → Template card → "Send to Stores" button (1 click)
2. Modal opens: Select stores (quick picker with store groups support)
3. Click "Create Order" → Done! (1 click)

Total: 3 clicks
```

### Technical Specification

#### 1. Component Structure
```
components/
  templates/
    send-to-stores-dialog.tsx       # NEW: Quick order creation modal
    store-quick-picker.tsx          # NEW: Simplified store selection
```

#### 2. Send to Stores Dialog Component (NEW)

```typescript
// components/templates/send-to-stores-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Store, Users } from "lucide-react";
import { CampaignTemplate } from "@/lib/database/campaign-management";
import { toast } from "sonner";
import { StoreQuickPicker } from "./store-quick-picker";

interface SendToStoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: CampaignTemplate;
  onSuccess?: (orderId: string) => void;
}

export function SendToStoresDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: SendToStoresDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'group'>('group');
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [quantityPerStore, setQuantityPerStore] = useState<number>(100);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedStoreIds(new Set());
      setSelectedGroupId('');
      setQuantityPerStore(100);
    }
  }, [open]);

  const handleCreateOrder = async () => {
    // Validate selection
    if (selectionMode === 'manual' && selectedStoreIds.size === 0) {
      toast.error('Please select at least one store');
      return;
    }

    if (selectionMode === 'group' && !selectedGroupId) {
      toast.error('Please select a store group');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Get template data
      const templateData = JSON.parse(template.template_data) as {
        message: string;
        targetAudience?: string;
      };

      // Step 2: Create campaign from template
      const campaignResponse = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} - ${new Date().toLocaleDateString()}`,
          message: templateData.message,
          companyName: localStorage.getItem('companyName') || 'My Company',
        }),
      });

      const campaignResult = await campaignResponse.json();

      if (!campaignResult.success) {
        throw new Error('Failed to create campaign');
      }

      const campaignId = campaignResult.data.id;

      // Step 3: Get final store list
      let finalStoreIds: string[];

      if (selectionMode === 'group') {
        // Get stores from group
        const groupResponse = await fetch(`/api/store-groups/${selectedGroupId}`);
        const groupResult = await groupResponse.json();

        if (!groupResult.success) {
          throw new Error('Failed to load store group');
        }

        finalStoreIds = groupResult.data.group.stores.map((s: any) => s.id);
      } else {
        finalStoreIds = Array.from(selectedStoreIds);
      }

      // Step 4: Create order with items
      const orderItems = finalStoreIds.map(storeId => ({
        storeId,
        campaignId,
        recommendedQuantity: quantityPerStore,
        approvedQuantity: quantityPerStore,
      }));

      const orderResponse = await fetch('/api/campaigns/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItems,
          notes: `Created from template: ${template.name}`,
        }),
      });

      const orderResult = await orderResponse.json();

      if (!orderResult.success) {
        throw new Error('Failed to create order');
      }

      // Step 5: Increment template use count
      await fetch(`/api/campaigns/templates/${template.id}/use`, {
        method: 'POST',
      });

      toast.success(`Order ${orderResult.data.order.order_number} created successfully!`);
      onOpenChange(false);

      if (onSuccess) {
        onSuccess(orderResult.data.order.id);
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = selectionMode === 'manual' ? selectedStoreIds.size : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send "{template.name}" to Stores
          </DialogTitle>
          <DialogDescription>
            Select stores and create an order using this template
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quantity Per Store */}
          <div>
            <Label htmlFor="quantity">Quantity Per Store</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantityPerStore}
              onChange={(e) => setQuantityPerStore(parseInt(e.target.value) || 100)}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Each store will receive this many pieces
            </p>
          </div>

          {/* Store Selection Tabs */}
          <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="group" className="gap-2">
                <Users className="h-4 w-4" />
                Store Groups
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Store className="h-4 w-4" />
                Manual Selection
              </TabsTrigger>
            </TabsList>

            <TabsContent value="group" className="mt-4">
              <StoreGroupPicker
                selectedGroupId={selectedGroupId}
                onSelect={setSelectedGroupId}
              />
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <StoreQuickPicker
                selectedStoreIds={selectedStoreIds}
                onChange={setSelectedStoreIds}
              />
            </TabsContent>
          </Tabs>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Order Summary</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-blue-700">Template:</span>
                <span className="ml-2 font-medium text-blue-900">{template.name}</span>
              </div>
              <div>
                <span className="text-blue-700">Stores:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {selectionMode === 'manual'
                    ? `${selectedCount} selected`
                    : selectedGroupId
                    ? 'Group selected'
                    : 'None selected'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Quantity/Store:</span>
                <span className="ml-2 font-medium text-blue-900">{quantityPerStore}</span>
              </div>
              <div>
                <span className="text-blue-700">Total Pieces:</span>
                <span className="ml-2 font-medium text-blue-900">
                  {selectionMode === 'manual'
                    ? selectedCount * quantityPerStore
                    : 'TBD'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrder}
            disabled={loading || (selectionMode === 'manual' && selectedCount === 0)}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Order...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Create Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. Store Quick Picker Component (NEW)

```typescript
// components/templates/store-quick-picker.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";

interface StoreQuickPickerProps {
  selectedStoreIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

export function StoreQuickPicker({ selectedStoreIds, onChange }: StoreQuickPickerProps) {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/retail/stores?pageSize=1000&isActive=true');
      const result = await response.json();

      if (result.success) {
        setStores(result.data.stores || []);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store =>
    store.store_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (store.city && store.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleStore = (storeId: string) => {
    const newSelection = new Set(selectedStoreIds);
    if (newSelection.has(storeId)) {
      newSelection.delete(storeId);
    } else {
      newSelection.add(storeId);
    }
    onChange(newSelection);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by store number, name, or city..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Store List */}
      <div className="border rounded-lg max-h-[400px] overflow-y-auto">
        {filteredStores.map(store => (
          <div
            key={store.id}
            className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer"
            onClick={() => toggleStore(store.id)}
          >
            <Checkbox
              checked={selectedStoreIds.has(store.id)}
              onCheckedChange={() => toggleStore(store.id)}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">#{store.store_number}</span>
                <span className="text-sm text-slate-700">{store.name}</span>
              </div>
              {(store.city || store.state) && (
                <p className="text-xs text-slate-500">
                  {store.city}{store.city && store.state ? ', ' : ''}{store.state}
                </p>
              )}
            </div>
          </div>
        ))}

        {filteredStores.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No stores found
          </div>
        )}
      </div>

      {/* Selection Count */}
      <div className="text-sm text-slate-600">
        {selectedStoreIds.size} store{selectedStoreIds.size !== 1 ? 's' : ''} selected
      </div>
    </div>
  );
}
```

#### 4. Store Group Picker Component (NEW)

```typescript
// components/templates/store-group-picker.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Check, Users } from "lucide-react";

interface StoreGroupPickerProps {
  selectedGroupId: string;
  onSelect: (groupId: string) => void;
}

export function StoreGroupPicker({ selectedGroupId, onSelect }: StoreGroupPickerProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/store-groups');
      const result = await response.json();

      if (result.success) {
        setGroups(result.data.groups || []);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">No Store Groups</p>
        <p className="text-sm text-slate-500 mt-1">
          Create groups in Store Groups page to use quick selection
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
      {groups.map(group => (
        <Card
          key={group.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedGroupId === group.id
              ? 'border-blue-500 border-2 bg-blue-50'
              : 'border-slate-200'
          }`}
          onClick={() => onSelect(group.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">{group.name}</h4>
                {group.description && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {group.store_count} stores
                  </span>
                </div>
              </div>

              {selectedGroupId === group.id && (
                <div className="ml-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### 5. Integration with Template Library

**Update Template Card Component**
```typescript
// components/analytics/template-library.tsx (or wherever templates are displayed)
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { SendToStoresDialog } from "@/components/templates/send-to-stores-dialog";
import { CampaignTemplate } from "@/lib/database/campaign-management";
import { useRouter } from "next/navigation";

interface TemplateCardProps {
  template: CampaignTemplate;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const router = useRouter();

  const handleSendSuccess = (orderId: string) => {
    // Navigate to order detail
    router.push(`/orders/${orderId}`);
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{template.name}</h3>

      {/* Existing template info */}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        {/* Existing buttons (Use Template, etc.) */}

        {/* NEW: Send to Stores button */}
        <Button
          variant="default"
          size="sm"
          onClick={() => setShowSendDialog(true)}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Send to Stores
        </Button>
      </div>

      {/* Send to Stores Dialog */}
      <SendToStoresDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        template={template}
        onSuccess={handleSendSuccess}
      />
    </div>
  );
}
```

#### 6. API Route for Order Creation (UPDATE EXISTING)

**Update Existing Route or Create New**
```typescript
// app/api/campaigns/orders/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/database/order-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { orderItems, notes, supplierEmail } = body;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        errorResponse('Order items are required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const order = createOrder({ orderItems, notes, supplierEmail });

    return NextResponse.json(
      successResponse({ order }, 'Order created successfully')
    );
  } catch (error) {
    console.error('❌ [Create Order API] Error:', error);

    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to create order',
        'CREATE_ERROR'
      ),
      { status: 500 }
    );
  }
}
```

#### 7. Testing Checklist
- [ ] "Send to Stores" button appears on template cards
- [ ] Clicking button opens modal
- [ ] Store Groups tab displays all groups
- [ ] Manual Selection tab displays all active stores
- [ ] Search filters stores correctly
- [ ] Clicking store row toggles checkbox
- [ ] Checkbox state matches selection
- [ ] Selection count updates in real-time
- [ ] Quantity per store input works
- [ ] Order summary shows correct totals
- [ ] "Create Order" disabled when no stores selected
- [ ] Order creation succeeds (manual mode)
- [ ] Order creation succeeds (group mode)
- [ ] Campaign created with template data
- [ ] Order items linked to campaign
- [ ] Template use count incremented
- [ ] Success toast shows order number
- [ ] User redirected to order detail
- [ ] Error handling: No stores shows validation
- [ ] Error handling: API failure shows toast

---

## Improvement #4: Dashboard Quick Actions FAB

**Effort**: 3 hours
**Impact**: Always-accessible primary actions
**Priority**: Medium

### Problem Statement
Common actions require navigating to specific pages:
- Create campaign: Dashboard → Copywriting or Campaigns
- Create order: Dashboard → Orders → New Order
- Add store: Dashboard → Retail → Stores → Add Store

**Pain Point**: No global access to frequent actions

### Solution: Floating Action Button (FAB) with Quick Actions Menu

#### User Flow
```
1. From ANY page → Click FAB (bottom-right corner)
2. Menu opens: "New Campaign", "New Order", "Add Store", etc.
3. Click action → Modal opens inline (no navigation)

Result: 2 clicks from anywhere to start any action
```

### Technical Specification

#### 1. Component Structure
```
components/
  dashboard/
    quick-actions-fab.tsx           # NEW: Main FAB component
    quick-actions-menu.tsx          # NEW: Actions menu
```

#### 2. FAB Component (NEW)

```typescript
// components/dashboard/quick-actions-fab.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Rocket,
  FileText,
  Store,
  Users,
  ShoppingCart,
} from "lucide-react";
import { QuickStartWizard } from "@/components/campaigns/quick-start-wizard";
import { useRouter } from "next/navigation";

export function QuickActionsFAB() {
  const [showCampaignWizard, setShowCampaignWizard] = useState(false);
  const router = useRouter();

  const actions = [
    {
      icon: Rocket,
      label: 'Quick Start Campaign',
      description: 'Create campaign in 3 steps',
      onClick: () => setShowCampaignWizard(true),
      color: 'text-blue-600',
    },
    {
      icon: ShoppingCart,
      label: 'New Order',
      description: 'Create a new campaign order',
      onClick: () => router.push('/orders/new'),
      color: 'text-purple-600',
    },
    {
      icon: FileText,
      label: 'New Template',
      description: 'Design a new DM template',
      onClick: () => router.push('/dm-creative/editor'),
      color: 'text-orange-600',
    },
    {
      icon: Store,
      label: 'Add Store',
      description: 'Add a new retail store',
      onClick: () => router.push('/retail/stores?action=add'),
      color: 'text-green-600',
    },
    {
      icon: Users,
      label: 'New Store Group',
      description: 'Create a store group',
      onClick: () => router.push('/store-groups?action=create'),
      color: 'text-purple-600',
    },
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-72"
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-sm font-semibold">
              Quick Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {actions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                className="p-3 cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <action.icon className={`h-5 w-5 mt-0.5 ${action.color}`} />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {action.label}
                    </div>
                    <div className="text-xs text-slate-500">
                      {action.description}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Campaign Wizard Modal */}
      <QuickStartWizard
        open={showCampaignWizard}
        onOpenChange={setShowCampaignWizard}
      />
    </>
  );
}
```

#### 3. Integration with Root Layout

```typescript
// app/layout.tsx
import { QuickActionsFAB } from "@/components/dashboard/quick-actions-fab";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Existing layout */}
        <Sidebar />
        <main>{children}</main>

        {/* NEW: Quick Actions FAB (available on all pages) */}
        <QuickActionsFAB />

        {/* Toaster for notifications */}
        <Toaster />
      </body>
    </html>
  );
}
```

#### 4. Keyboard Shortcut Support

**Update Keyboard Manager**
```typescript
// lib/utils/keyboard-shortcuts.ts (ADD GLOBAL SHORTCUT)

// In your main layout or top-level component:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd+K: Open command palette
    if (cmdKey && e.key === 'k') {
      e.preventDefault();
      // Open FAB menu or command palette
      document.querySelector('[data-fab-trigger]')?.click();
    }

    // Cmd+Shift+N: Quick start campaign
    if (cmdKey && e.shiftKey && e.key === 'n') {
      e.preventDefault();
      setShowCampaignWizard(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

#### 5. Testing Checklist
- [ ] FAB appears in bottom-right on all pages
- [ ] FAB has shadow and hover effects
- [ ] Clicking FAB opens actions menu
- [ ] Menu displays all quick actions
- [ ] Each action has icon, label, and description
- [ ] "Quick Start Campaign" opens wizard modal
- [ ] "New Order" navigates to orders page
- [ ] "New Template" navigates to editor
- [ ] "Add Store" navigates to stores page with add action
- [ ] "New Store Group" navigates to store groups page
- [ ] Menu closes after selecting action
- [ ] FAB doesn't overlap important content
- [ ] FAB is accessible via keyboard (Tab key)
- [ ] Keyboard shortcut (Cmd+K) triggers menu
- [ ] Mobile: FAB scales appropriately
- [ ] Mobile: Menu aligns correctly

---

## Improvement #5: Contextual Quick Actions

**Effort**: 6 hours
**Impact**: Inline actions on every entity
**Priority**: Medium

### Problem Statement
Editing or taking actions on entities requires navigation:
- Campaign list → Click campaign → Edit page
- Store list → Click store → Edit page
- Order list → Click order → View page → Edit

**Pain Point**: No inline editing, too much navigation

### Solution: Hover Actions + Inline Modals

#### User Flow
```
1. Hover over campaign/store/order card
2. Action buttons appear (Edit, Duplicate, Delete, etc.)
3. Click "Edit" → Modal opens inline (no navigation)
4. Make changes → Save → Done!

Result: 2-3 clicks, no page changes
```

### Technical Specification

#### 1. Pattern: Hover Actions

**Generic Hover Actions Component**
```typescript
// components/shared/entity-hover-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Edit, Copy, Trash2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EntityAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface EntityHoverActionsProps {
  actions: EntityAction[];
  showOnHover?: boolean;
}

export function EntityHoverActions({
  actions,
  showOnHover = true,
}: EntityHoverActionsProps) {
  if (actions.length <= 3) {
    // Show all actions as buttons
    return (
      <div
        className={`flex gap-2 ${
          showOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
        }`}
      >
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="gap-2"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>
    );
  }

  // Show dropdown menu for many actions
  return (
    <div
      className={`${
        showOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className={action.variant === 'destructive' ? 'text-red-600' : ''}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

#### 2. Example: Campaign Card with Contextual Actions

```typescript
// components/campaigns/campaign-card.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityHoverActions } from "@/components/shared/entity-hover-actions";
import { Edit, Copy, Trash2 } from "lucide-react";
import { Campaign } from "@/lib/database/tracking-queries";
import { EditCampaignDialog } from "./edit-campaign-dialog";
import { DeleteCampaignDialog } from "./delete-campaign-dialog";

interface CampaignCardProps {
  campaign: Campaign;
  onUpdate?: () => void;
}

export function CampaignCard({ campaign, onUpdate }: CampaignCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDuplicate = async () => {
    const response = await fetch(`/api/campaigns/${campaign.id}/duplicate`, {
      method: 'POST',
    });

    if (response.ok) {
      toast.success('Campaign duplicated successfully');
      onUpdate?.();
    }
  };

  const actions = [
    {
      icon: Edit,
      label: 'Edit',
      onClick: () => setShowEditDialog(true),
    },
    {
      icon: Copy,
      label: 'Duplicate',
      onClick: handleDuplicate,
    },
    {
      icon: Trash2,
      label: 'Delete',
      onClick: () => setShowDeleteDialog(true),
      variant: 'destructive' as const,
    },
  ];

  return (
    <>
      <Card className="group relative hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{campaign.name}</CardTitle>

            {/* Hover Actions */}
            <EntityHoverActions actions={actions} />
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-slate-600">{campaign.message}</p>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <EditCampaignDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        campaign={campaign}
        onSuccess={onUpdate}
      />

      {/* Delete Dialog */}
      <DeleteCampaignDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        campaign={campaign}
        onSuccess={onUpdate}
      />
    </>
  );
}
```

#### 3. Edit Campaign Dialog (NEW)

```typescript
// components/campaigns/edit-campaign-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Campaign } from "@/lib/database/tracking-queries";
import { toast } from "sonner";

interface EditCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onSuccess?: () => void;
}

export function EditCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: EditCampaignDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: campaign.name,
    message: campaign.message,
    status: campaign.status,
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: campaign.name,
        message: campaign.message,
        status: campaign.status,
      });
    }
  }, [open, campaign]);

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to update campaign');
      }

      toast.success('Campaign updated successfully');
      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Campaign</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="mt-2"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4. API Route for Campaign Update (NEW)

```typescript
// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateCampaign } from '@/lib/database/tracking-queries';
import { successResponse, errorResponse } from '@/lib/utils/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, message, status } = body;

    // Update campaign (add this function to tracking-queries.ts)
    const updated = updateCampaign(params.id, { name, message, status });

    if (!updated) {
      return NextResponse.json(
        errorResponse('Campaign not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(
      successResponse({ campaign: updated }, 'Campaign updated successfully')
    );
  } catch (error) {
    console.error('❌ [Update Campaign API] Error:', error);

    return NextResponse.json(
      errorResponse(
        error instanceof Error ? error.message : 'Failed to update campaign',
        'UPDATE_ERROR'
      ),
      { status: 500 }
    );
  }
}
```

#### 5. Database Function for Campaign Update (NEW)

```typescript
// lib/database/tracking-queries.ts (ADD THIS FUNCTION)

/**
 * Update campaign details
 */
export function updateCampaign(
  id: string,
  updates: {
    name?: string;
    message?: string;
    status?: Campaign['status'];
  }
): Campaign | null {
  const db = getDatabase();

  const updateFields: string[] = [];
  const params: any[] = [];

  if (updates.name !== undefined) {
    updateFields.push('name = ?');
    params.push(updates.name);
  }

  if (updates.message !== undefined) {
    updateFields.push('message = ?');
    params.push(updates.message);
  }

  if (updates.status !== undefined) {
    updateFields.push('status = ?');
    params.push(updates.status);
  }

  if (updateFields.length === 0) {
    return getCampaignById(id);
  }

  params.push(id);

  const result = db.prepare(`
    UPDATE campaigns
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...params);

  if (result.changes === 0) {
    return null;
  }

  return getCampaignById(id);
}
```

#### 6. Apply Pattern to Other Entities

**Store Cards**
- Edit inline (name, address, status)
- Duplicate store
- Delete store

**Order Cards**
- Edit order details (notes, supplier email)
- Duplicate/Rerun order (already implemented in #2)
- Cancel order
- Change status

**Template Cards**
- Edit template (name, description)
- Duplicate template
- Delete template
- Send to Stores (already implemented in #3)

#### 7. Testing Checklist
- [ ] Hover over card shows action buttons
- [ ] Actions appear smoothly (opacity transition)
- [ ] Clicking action doesn't trigger card click
- [ ] Edit button opens modal with current data
- [ ] Edit modal pre-fills all fields
- [ ] Saving edits updates database
- [ ] Success toast shows after save
- [ ] Card updates without page reload
- [ ] Duplicate action creates copy
- [ ] Delete action shows confirmation
- [ ] Delete confirmation prevents accidental deletion
- [ ] Actions work on mobile (tap instead of hover)
- [ ] Keyboard navigation works (Tab to focus actions)

---

## Improvement #6: Smart Navigation Breadcrumbs

**Effort**: 2 hours
**Impact**: Easy navigation back through context
**Priority**: Low

### Problem Statement
Users lose context when navigating deep:
- Dashboard → Orders → Order Detail → Order Item
- No easy way to go back to Orders list
- Browser back button may skip pages

**Pain Point**: Context loss, difficult navigation

### Solution: Breadcrumb Trail with Context

#### User Flow
```
Dashboard / Orders / ORD-2025-10-001 / Edit

Click "Orders" → Returns to orders list (filtered/sorted as before)
Click "ORD-2025-10-001" → Returns to order detail
```

### Technical Specification

#### 1. Breadcrumb Component (NEW)

```typescript
// components/shared/breadcrumbs.tsx
"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = generateBreadcrumbs(pathname);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center text-sm text-slate-600 mb-6">
      <Link
        href="/"
        className="hover:text-slate-900 transition-colors flex items-center gap-1"
      >
        <Home className="h-4 w-4" />
      </Link>

      {segments.map((segment, index) => (
        <Fragment key={segment.href}>
          <ChevronRight className="h-4 w-4 mx-2 text-slate-400" />

          {index === segments.length - 1 ? (
            <span className="font-medium text-slate-900">
              {segment.label}
            </span>
          ) : (
            <Link
              href={segment.href}
              className="hover:text-slate-900 transition-colors"
            >
              {segment.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  const parts = pathname.split('/').filter(Boolean);

  let currentPath = '';

  // Route mapping for readable labels
  const routeLabels: Record<string, string> = {
    'copywriting': 'Copywriting',
    'dm-creative': 'DM Creative',
    'editor': 'Editor',
    'analytics': 'Analytics',
    'campaigns': 'Campaigns',
    'orders': 'Orders',
    'new': 'New',
    'retail': 'Retail',
    'stores': 'Stores',
    'store-groups': 'Store Groups',
    'settings': 'Settings',
  };

  parts.forEach((part, index) => {
    currentPath += `/${part}`;

    // Check if this is an ID (nanoid pattern or ORD- pattern)
    const isId = part.length === 16 || part.startsWith('ORD-');

    if (isId) {
      // For IDs, fetch display name from context or use abbreviated ID
      segments.push({
        label: part.startsWith('ORD-') ? part : `...${part.slice(-6)}`,
        href: currentPath,
      });
    } else {
      // For route segments, use mapped label
      segments.push({
        label: routeLabels[part] || capitalize(part),
        href: currentPath,
      });
    }
  });

  return segments;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}
```

#### 2. Integration with Layout

```typescript
// app/layout.tsx or page-specific layouts
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <Breadcrumbs />
      {children}
    </div>
  );
}
```

#### 3. Context-Aware Breadcrumbs (Advanced)

**Store breadcrumb context in URL params**
```typescript
// When navigating to order detail, include return context
router.push(`/orders/${orderId}?from=orders&filter=draft`);

// Breadcrumb component reads context from URL
const searchParams = useSearchParams();
const returnHref = searchParams.get('from') === 'orders'
  ? `/orders?status=${searchParams.get('filter')}`
  : '/orders';
```

#### 4. Testing Checklist
- [ ] Breadcrumbs appear on all deep pages
- [ ] Home icon links to dashboard
- [ ] Each segment is clickable except last
- [ ] Last segment is non-clickable and bold
- [ ] Clicking segment navigates correctly
- [ ] IDs show abbreviated form (e.g., "...abc123")
- [ ] Order numbers show full (e.g., "ORD-2025-10-001")
- [ ] Breadcrumbs update on navigation
- [ ] Mobile: Breadcrumbs wrap or scroll horizontally

---

## Improvement #7: Recent Items Sidebar

**Effort**: 3 hours
**Impact**: Quick access to recently viewed items
**Priority**: Medium

### Problem Statement
Users frequently switch between a few campaigns, orders, or templates.
Current: Must navigate back to list page, search/scroll to find item.

**Pain Point**: Repetitive navigation for frequently accessed items

### Solution: Recent Items Widget in Sidebar

#### User Flow
```
Sidebar shows:
- Recent Campaigns (last 5)
- Recent Orders (last 5)
- Recent Templates (last 5)

Click any item → Navigate directly
```

### Technical Specification

#### 1. Recent Items Component (NEW)

```typescript
// components/sidebar/recent-items.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, FileText, ShoppingCart, Layout } from "lucide-react";
import { getRecentItems, RecentItem } from "@/lib/utils/recent-items";

export function RecentItems() {
  const [recentCampaigns, setRecentCampaigns] = useState<RecentItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentItem[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<RecentItem[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    loadRecentItems();
  }, [pathname]); // Reload when pathname changes

  const loadRecentItems = () => {
    setRecentCampaigns(getRecentItems('campaign').slice(0, 5));
    setRecentOrders(getRecentItems('order').slice(0, 5));
    setRecentTemplates(getRecentItems('template').slice(0, 5));
  };

  const hasRecentItems =
    recentCampaigns.length > 0 ||
    recentOrders.length > 0 ||
    recentTemplates.length > 0;

  if (!hasRecentItems) {
    return null;
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 px-3 mb-2">
        <Clock className="h-4 w-4 text-slate-500" />
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Recent
        </h3>
      </div>

      <div className="space-y-3">
        {recentCampaigns.length > 0 && (
          <RecentItemsList
            title="Campaigns"
            icon={FileText}
            items={recentCampaigns}
            basePath="/campaigns"
          />
        )}

        {recentOrders.length > 0 && (
          <RecentItemsList
            title="Orders"
            icon={ShoppingCart}
            items={recentOrders}
            basePath="/orders"
          />
        )}

        {recentTemplates.length > 0 && (
          <RecentItemsList
            title="Templates"
            icon={Layout}
            items={recentTemplates}
            basePath="/dm-creative/templates"
          />
        )}
      </div>
    </div>
  );
}

interface RecentItemsListProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: RecentItem[];
  basePath: string;
}

function RecentItemsList({ title, icon: Icon, items, basePath }: RecentItemsListProps) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 mb-1">
        <Icon className="h-3 w-3 text-slate-400" />
        <span className="text-xs font-medium text-slate-600">{title}</span>
      </div>

      <div className="space-y-1">
        {items.map(item => (
          <Link
            key={item.id}
            href={`${basePath}/${item.id}`}
            className="block px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors truncate"
          >
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
```

#### 2. Integration with Sidebar

```typescript
// components/sidebar.tsx
import { RecentItems } from "./sidebar/recent-items";

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-white h-screen flex flex-col">
      {/* Logo */}
      <div className="p-4">
        <h1 className="text-xl font-bold">DropLab</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {/* Existing navigation items */}
      </nav>

      {/* Recent Items (NEW) */}
      <div className="px-3 pb-4">
        <RecentItems />
      </div>
    </aside>
  );
}
```

#### 3. Track Recent Items on Page Views

**Utility Hook**
```typescript
// hooks/use-track-recent.ts
"use client";

import { useEffect } from "react";
import { addRecentItem } from "@/lib/utils/recent-items";

export function useTrackRecent(
  type: 'campaign' | 'order' | 'template' | 'store-group',
  id: string,
  name: string,
  metadata?: Record<string, any>
) {
  useEffect(() => {
    if (id && name) {
      addRecentItem({ type, id, name, metadata });

      // Trigger custom event to update sidebar
      window.dispatchEvent(new Event('recent-items-updated'));
    }
  }, [type, id, name, metadata]);
}
```

**Usage in Pages**
```typescript
// app/campaigns/[id]/page.tsx
"use client";

import { useTrackRecent } from "@/hooks/use-track-recent";

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  // Track this page view
  useTrackRecent(
    'campaign',
    params.id,
    campaign?.name || 'Loading...'
  );

  // Rest of component...
}
```

#### 4. Listen for Updates in Sidebar

```typescript
// components/sidebar/recent-items.tsx
useEffect(() => {
  const handleUpdate = () => {
    loadRecentItems();
  };

  window.addEventListener('recent-items-updated', handleUpdate);

  return () => {
    window.removeEventListener('recent-items-updated', handleUpdate);
  };
}, []);
```

#### 5. Testing Checklist
- [ ] Recent items appear in sidebar
- [ ] Items grouped by type (Campaigns, Orders, Templates)
- [ ] Maximum 5 items per type
- [ ] Most recent items appear first
- [ ] Clicking item navigates correctly
- [ ] Items update when viewing new pages
- [ ] localStorage persists recent items
- [ ] Items truncate if name is too long
- [ ] No recent items: Widget hidden
- [ ] Scrollable if many recent items

---

## Improvement #8: Command Palette (Cmd+K)

**Effort**: 4 hours
**Impact**: Global search + quick actions from anywhere
**Priority**: High

### Problem Statement
Finding specific items requires:
- Navigating to correct page
- Scrolling through lists
- Using page-specific search

**Pain Point**: No global search across all entities

### Solution: Cmd+K Command Palette (like Spotlight)

#### User Flow
```
1. Press Cmd+K (or Ctrl+K on Windows) from anywhere
2. Type search query (e.g., "Summer Sale")
3. Results show: Campaigns, Orders, Templates, Stores matching query
4. Press Enter or click result → Navigate to item
5. Or select quick action (e.g., "Create new campaign")

Result: Access anything in 2 keystrokes + search
```

### Technical Specification

#### 1. Install cmdk Library

```bash
npm install cmdk
```

#### 2. Command Palette Component (NEW)

```typescript
// components/shared/command-palette.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import {
  FileText,
  ShoppingCart,
  Layout,
  Store,
  Users,
  Search,
  Rocket,
  Plus,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: 'campaign' | 'order' | 'template' | 'store' | 'store-group';
  title: string;
  subtitle?: string;
  href: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Toggle palette with Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      if (cmdKey && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search across all entities
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Parallel search across all entity types
      const [campaigns, orders, templates, stores, groups] = await Promise.all([
        searchCampaigns(query),
        searchOrders(query),
        searchTemplates(query),
        searchStores(query),
        searchStoreGroups(query),
      ]);

      const allResults: SearchResult[] = [
        ...campaigns,
        ...orders,
        ...templates,
        ...stores,
        ...groups,
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      performSearch(search);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, performSearch]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setSearch('');
    router.push(href);
  };

  // Quick actions (always available)
  const quickActions = [
    {
      icon: Rocket,
      label: 'Quick Start Campaign',
      href: '/?action=quick-start',
    },
    {
      icon: ShoppingCart,
      label: 'New Order',
      href: '/orders/new',
    },
    {
      icon: Layout,
      label: 'New Template',
      href: '/dm-creative/editor',
    },
    {
      icon: Store,
      label: 'Add Store',
      href: '/retail/stores?action=add',
    },
  ];

  const groupedResults = groupResultsByType(results);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search campaigns, orders, templates, stores..."
        value={search}
        onValueChange={setSearch}
      />

      <CommandList>
        {loading && (
          <div className="py-6 text-center text-sm text-slate-500">
            Searching...
          </div>
        )}

        {!loading && search.length >= 2 && results.length === 0 && (
          <CommandEmpty>No results found</CommandEmpty>
        )}

        {/* Quick Actions (always visible) */}
        {search.length < 2 && (
          <CommandGroup heading="Quick Actions">
            {quickActions.map((action) => (
              <CommandItem
                key={action.href}
                onSelect={() => handleSelect(action.href)}
                className="flex items-center gap-3"
              >
                <action.icon className="h-4 w-4 text-blue-600" />
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Search Results */}
        {groupedResults.campaigns.length > 0 && (
          <CommandGroup heading="Campaigns">
            {groupedResults.campaigns.map((result) => (
              <ResultItem key={result.id} result={result} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        )}

        {groupedResults.orders.length > 0 && (
          <CommandGroup heading="Orders">
            {groupedResults.orders.map((result) => (
              <ResultItem key={result.id} result={result} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        )}

        {groupedResults.templates.length > 0 && (
          <CommandGroup heading="Templates">
            {groupedResults.templates.map((result) => (
              <ResultItem key={result.id} result={result} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        )}

        {groupedResults.stores.length > 0 && (
          <CommandGroup heading="Stores">
            {groupedResults.stores.map((result) => (
              <ResultItem key={result.id} result={result} onSelect={handleSelect} />
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

function ResultItem({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: (href: string) => void;
}) {
  const icons = {
    campaign: FileText,
    order: ShoppingCart,
    template: Layout,
    store: Store,
    'store-group': Users,
  };

  const Icon = icons[result.type];

  return (
    <CommandItem
      onSelect={() => onSelect(result.href)}
      className="flex items-center gap-3"
    >
      <Icon className="h-4 w-4 text-slate-500" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{result.title}</div>
        {result.subtitle && (
          <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
        )}
      </div>
    </CommandItem>
  );
}

function groupResultsByType(results: SearchResult[]) {
  return {
    campaigns: results.filter(r => r.type === 'campaign'),
    orders: results.filter(r => r.type === 'order'),
    templates: results.filter(r => r.type === 'template'),
    stores: results.filter(r => r.type === 'store'),
    storeGroups: results.filter(r => r.type === 'store-group'),
  };
}

// Search functions
async function searchCampaigns(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/campaigns?search=${encodeURIComponent(query)}`);
  const result = await response.json();

  if (!result.success) return [];

  return result.data.campaigns.map((c: any) => ({
    id: c.id,
    type: 'campaign',
    title: c.name,
    subtitle: c.message.slice(0, 60) + '...',
    href: `/campaigns/${c.id}`,
  }));
}

async function searchOrders(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/campaigns/orders?search=${encodeURIComponent(query)}`);
  const result = await response.json();

  if (!result.success) return [];

  return result.data.orders.map((o: any) => ({
    id: o.id,
    type: 'order',
    title: o.order_number,
    subtitle: `${o.total_stores} stores • ${o.total_quantity} pieces`,
    href: `/orders/${o.id}`,
  }));
}

async function searchTemplates(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/campaigns/templates?search=${encodeURIComponent(query)}`);
  const result = await response.json();

  if (!result.success) return [];

  return result.data.templates.map((t: any) => ({
    id: t.id,
    type: 'template',
    title: t.name,
    subtitle: t.description || `Used ${t.use_count} times`,
    href: `/dm-creative/templates/${t.id}`,
  }));
}

async function searchStores(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/retail/stores?search=${encodeURIComponent(query)}`);
  const result = await response.json();

  if (!result.success) return [];

  return result.data.stores.slice(0, 5).map((s: any) => ({
    id: s.id,
    type: 'store',
    title: `#${s.store_number} - ${s.name}`,
    subtitle: `${s.city}, ${s.state}`,
    href: `/retail/stores/${s.id}`,
  }));
}

async function searchStoreGroups(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/store-groups?search=${encodeURIComponent(query)}`);
  const result = await response.json();

  if (!result.success) return [];

  return result.data.groups.map((g: any) => ({
    id: g.id,
    type: 'store-group',
    title: g.name,
    subtitle: `${g.store_count} stores`,
    href: `/store-groups/${g.id}`,
  }));
}
```

#### 3. Integration with Layout

```typescript
// app/layout.tsx
import { CommandPalette } from "@/components/shared/command-palette";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main>{children}</main>

        {/* Command Palette (NEW) */}
        <CommandPalette />

        <QuickActionsFAB />
        <Toaster />
      </body>
    </html>
  );
}
```

#### 4. Update API Routes for Search Support

**Add search parameter support to existing routes**

```typescript
// app/api/campaigns/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const searchQuery = searchParams.get('search') || undefined;

  const campaigns = getAllCampaigns({ searchQuery }); // Update function to support search

  return NextResponse.json(successResponse({ campaigns }));
}
```

**Update Database Functions**
```typescript
// lib/database/tracking-queries.ts
export function getAllCampaigns(options?: {
  searchQuery?: string;
}): Campaign[] {
  const db = getDatabase();

  let query = 'SELECT * FROM campaigns';
  const params: any[] = [];

  if (options?.searchQuery) {
    query += ' WHERE name LIKE ? OR message LIKE ?';
    const searchPattern = `%${options.searchQuery}%`;
    params.push(searchPattern, searchPattern);
  }

  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params) as Campaign[];
}
```

#### 5. Keyboard Shortcuts Display

**Help Dialog showing all shortcuts**
```typescript
// components/shared/keyboard-shortcuts-help.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const shortcuts = [
  { key: 'Cmd+K', description: 'Open command palette' },
  { key: 'Cmd+Shift+N', description: 'Quick start campaign' },
  { key: 'Cmd+/', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Close dialogs' },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 6. Testing Checklist
- [ ] Cmd+K (Ctrl+K on Windows) opens palette
- [ ] ESC closes palette
- [ ] Search input is auto-focused on open
- [ ] Typing triggers search with 300ms debounce
- [ ] Results appear grouped by type
- [ ] Campaigns search works (name and message)
- [ ] Orders search works (order number)
- [ ] Templates search works (name and description)
- [ ] Stores search works (number, name, city)
- [ ] Store groups search works (name)
- [ ] Quick actions shown when search is empty
- [ ] Clicking result navigates correctly
- [ ] Pressing Enter on selected result navigates
- [ ] Arrow keys navigate through results
- [ ] Search across all types returns combined results
- [ ] No results shows "No results found"
- [ ] Loading state shows "Searching..."
- [ ] Search is case-insensitive
- [ ] Palette resets search on close

---

## Implementation Roadmap

### Week 1: Core Workflows (Sprint 1)

**Day 1-2: Improvement #2 - Rerun Order Button (2h)**
- ✅ HIGHEST PRIORITY
- Implement `duplicateOrder()` database function
- Create API route `/api/campaigns/orders/[id]/duplicate`
- Build `RerunOrderDialog` component
- Integrate with order list items
- Test: Duplicate orders successfully

**Day 2-3: Improvement #4 - Dashboard Quick Actions FAB (3h)**
- Create `QuickActionsFAB` component
- Integrate with root layout
- Add keyboard shortcut (Cmd+K triggers)
- Test: FAB accessible from all pages

**Day 3-4: Improvement #3 - Send to Stores Quick Action (4h)**
- Build `SendToStoresDialog` component
- Create `StoreQuickPicker` and `StoreGroupPicker`
- Integrate with template cards
- Test: Template → Order in 3 clicks

**Day 5: Testing & Polish (2h)**
- End-to-end testing of Week 1 features
- Bug fixes
- Performance optimization
- Documentation updates

**Total Week 1**: 11 hours

---

### Week 2: Advanced Features (Sprint 2)

**Day 1-3: Improvement #1 - Campaign Quick Start Wizard (8h)**
- Build wizard component with 3 steps
- Create step sub-components
- Integrate AI copy generation
- Add template selection
- Test: Full wizard flow

**Day 4-5: Improvement #8 - Command Palette (4h)**
- Install and configure cmdk
- Build `CommandPalette` component
- Add search functions for all entities
- Update API routes for search support
- Test: Global search and navigation

**Day 5: Testing & Polish (2h)**
- End-to-end testing of Week 2 features
- Bug fixes
- Documentation

**Total Week 2**: 14 hours

---

### Week 3: Polish & UX Enhancements (Sprint 3)

**Day 1-2: Improvement #5 - Contextual Quick Actions (6h)**
- Create `EntityHoverActions` component
- Build edit dialogs for campaigns, orders, stores
- Update database functions for updates
- Create API routes for PATCH operations
- Test: Inline editing across all entities

**Day 3: Improvement #6 - Smart Breadcrumbs (2h)**
- Build `Breadcrumbs` component
- Integrate with page layouts
- Test: Navigation context preserved

**Day 3-4: Improvement #7 - Recent Items Sidebar (3h)**
- Create `RecentItems` component
- Build `useTrackRecent` hook
- Integrate with sidebar
- Test: Recent items tracking and display

**Day 5: Final Testing & Launch (2h)**
- Full platform testing
- Performance profiling
- Bug fixes
- Launch preparation

**Total Week 3**: 13 hours

---

### Total Implementation Time: 38 hours (≈5 days)

---

## Testing Strategy

### Unit Testing
- All database functions (CRUD operations)
- Utility functions (recent-items, keyboard-shortcuts)
- API routes (mocked database)

### Integration Testing
- Wizard flows (multi-step completion)
- Order duplication (database transactions)
- Template to order flow
- Search across entities

### E2E Testing (Manual)
**Critical User Paths:**
1. New user creates first campaign (Quick Start Wizard)
2. User reruns monthly order (Rerun Order)
3. User sends template to stores (Send to Stores)
4. User searches for campaign via Cmd+K
5. User edits campaign inline (Contextual Actions)

### Performance Testing
- Command palette search response time (< 500ms)
- Order duplication time (< 200ms)
- FAB menu open time (< 100ms)
- Recent items load time (< 50ms)

### Browser Testing
- Chrome (primary)
- Safari (macOS/iOS)
- Edge (Windows)
- Mobile Safari (iOS)
- Mobile Chrome (Android)

---

## Rollback Plan

### Feature Flags (Optional Enhancement)
```typescript
// lib/utils/feature-flags.ts
export const FEATURE_FLAGS = {
  quickStartWizard: true,
  rerunOrder: true,
  sendToStores: true,
  commandPalette: true,
  quickActionsFAB: true,
  contextualActions: true,
  recentItems: true,
  breadcrumbs: true,
};

export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}
```

### Database Rollback
All improvements use existing tables, no schema changes required.
If rollback needed:
- No database migrations to reverse
- LocalStorage can be cleared manually

### Code Rollback
- Each improvement is self-contained
- Can be disabled by removing component imports
- No breaking changes to existing features

---

## Success Metrics

### Click Reduction
- ✅ Create First Campaign: 75% reduction (12 → 3 clicks)
- ✅ Recurring Order: 93% reduction (15 → 1 click)
- ✅ Template to Order: 67% reduction (9 → 3 clicks)

### Time Savings
- Campaign creation: 10 minutes → 2 minutes (80% faster)
- Order duplication: 5 minutes → 10 seconds (97% faster)
- Template usage: 8 minutes → 1 minute (87% faster)

### User Engagement
- Increase in daily active campaigns created (+50% expected)
- Increase in order frequency (+40% expected)
- Decrease in support tickets about navigation (-60% expected)

### Technical Performance
- All workflows < 3 seconds total time
- Search results < 500ms
- Zero navigation page loads for modal actions

---

## Future Enhancements (Post-MVP)

1. **Workflow Templates**: Save custom workflows
2. **Batch Quick Actions**: Select multiple items, apply action
3. **Smart Suggestions**: AI-powered next action recommendations
4. **Workflow Analytics**: Track which workflows users complete most
5. **Custom Keyboard Shortcuts**: User-configurable shortcuts
6. **Workflow Automation**: Trigger actions based on events
7. **Mobile App**: Native mobile experience with touch-optimized workflows

---

**END OF DETAILED IMPLEMENTATION PLAN**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
