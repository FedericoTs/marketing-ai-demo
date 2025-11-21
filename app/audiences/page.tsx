"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Target,
  Plus,
  Library,
  BarChart3,
  Sparkles,
  Users,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { AudienceFilterBuilder } from "@/components/audiences/audience-filter-builder";
import { SavedAudienceLibrary } from "@/components/audiences/saved-audience-library";
import { AudienceAnalytics } from "@/components/audiences/audience-analytics";
import { useBillingStatus } from "@/lib/hooks/use-billing-status";
import { toast } from "sonner";

/**
 * Standalone Audience Explorer
 *
 * World-class UX for audience targeting with:
 * - Three tabs: Library, Create, Analytics
 * - Three-panel filter builder (Categories, Filters, Live Preview)
 * - Real-time count and cost calculator
 * - AI recommendations
 * - Zero cognitive load design
 */
export default function AudiencesPage() {
  const router = useRouter();
  const { isFeatureLocked } = useBillingStatus();
  const [activeTab, setActiveTab] = useState<string>("create");
  const [showCreate, setShowCreate] = useState(false);

  // TODO: Replace with real auth context when implemented
  // For now using demo values for development
  const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000000";
  const DEMO_USER_ID = "00000000-0000-0000-0000-000000000000";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Audience Explorer</h1>
                <p className="text-sm text-slate-600">
                  Target 250M+ contacts with precision • FREE count preview
                </p>
              </div>
            </div>

            {activeTab === "library" && (
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  // Block audience creation for unpaid users
                  if (isFeatureLocked('audiences')) {
                    toast.error('Upgrade to create audiences', {
                      description: 'Complete payment to build and save custom audiences',
                      action: {
                        label: 'Upgrade',
                        onClick: () => router.push('/dashboard'),
                      },
                    });
                    return;
                  }
                  setActiveTab("create");
                  setShowCreate(true);
                }}
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Audience
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs
          value={activeTab}
          onValueChange={(tab) => {
            // Block switching to "create" tab for unpaid users
            if (tab === "create" && isFeatureLocked('audiences')) {
              toast.error('Upgrade to create audiences', {
                description: 'Complete payment to build and save custom audiences',
                action: {
                  label: 'Upgrade',
                  onClick: () => router.push('/dashboard'),
                },
              });
              return;
            }
            setActiveTab(tab);
          }}
          className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span>Library</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span>Create</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Library - Saved Audiences */}
          <TabsContent value="library" className="space-y-6">
            <SavedAudienceLibrary
              onSelectAudience={(audience) => {
                // TODO: Load audience into filter builder
                setActiveTab("create");
              }}
              onCreateNew={() => {
                // Block audience creation for unpaid users
                if (isFeatureLocked('audiences')) {
                  toast.error('Upgrade to create audiences', {
                    description: 'Complete payment to build and save custom audiences',
                    action: {
                      label: 'Upgrade',
                      onClick: () => router.push('/dashboard'),
                    },
                  });
                  return;
                }
                setActiveTab("create");
                setShowCreate(true);
              }}
            />
          </TabsContent>

          {/* Tab 2: Create - Filter Builder */}
          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Build Your Audience
                    </CardTitle>
                    <CardDescription>
                      Start broad, refine with filters, see real-time results
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">250M+</span> contacts available
                    </div>
                    <div className="flex items-center gap-2 text-green-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-medium">FREE</span> count preview
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <AudienceFilterBuilder
                  mode="standalone"
                  organizationId={DEMO_ORG_ID}
                  userId={DEMO_USER_ID}
                  onSave={(audienceData) => {
                    // Block saving for unpaid users
                    if (isFeatureLocked('audiences')) {
                      toast.error('Upgrade to save audiences', {
                        description: 'Complete payment to build and save custom audiences',
                        action: {
                          label: 'Upgrade',
                          onClick: () => router.push('/dashboard'),
                        },
                      });
                      return;
                    }
                    console.log("Audience saved:", audienceData);
                    // Refresh library when switching tabs
                    setActiveTab("library");
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Analytics - Performance Metrics */}
          <TabsContent value="analytics" className="space-y-6">
            <AudienceAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
