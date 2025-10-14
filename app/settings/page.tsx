"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/lib/contexts/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentManager } from "@/components/settings/agent-manager";
import { BrandProfileManager } from "@/components/settings/brand-profile-manager";
import { toast } from "sonner";
import { Save, Building2, Key } from "lucide-react";
import { ElevenLabsAgent } from "@/types/settings";

export default function SettingsPage() {
  const { settings, updateSettings, isLoaded } = useSettings();
  const [formData, setFormData] = useState(settings);

  useEffect(() => {
    if (isLoaded) {
      setFormData(settings);
    }
  }, [settings, isLoaded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      updateSettings(formData);
      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings. Please try again.");
      console.error("Error saving settings:", error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-slate-600">
          Configure your platform settings, company information, and integrations.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-auto p-1">
            <TabsTrigger value="company" className="gap-2 py-3">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">Company & Brand</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 py-3">
              <Key className="h-4 w-4" />
              <span className="font-medium">Integrations</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Company & Brand */}
          <TabsContent value="company" className="space-y-6 mt-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xl">Company Information</CardTitle>
                <CardDescription>
                  This information will be used to personalize AI-generated content across all features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-sm font-medium">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      placeholder="Enter company name"
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry" className="text-sm font-medium">
                      Industry <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="industry"
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      placeholder="e.g., Technology, Healthcare, Finance"
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandVoice" className="text-sm font-medium">
                    Brand Voice <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="brandVoice"
                    name="brandVoice"
                    value={formData.brandVoice}
                    onChange={handleChange}
                    placeholder="e.g., Professional and innovative, Friendly and approachable, Bold and confident"
                    rows={3}
                    required
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Describe how your brand communicates with customers
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience" className="text-sm font-medium">
                    Target Audience <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="targetAudience"
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleChange}
                    placeholder="e.g., Business professionals, Decision makers, C-suite executives"
                    rows={3}
                    required
                    className="resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Define the primary audience for your marketing content
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Brand Intelligence - Only show if company name and API key are set */}
            {formData.companyName && formData.openaiApiKey && (
              <BrandProfileManager
                companyName={formData.companyName}
                apiKey={formData.openaiApiKey}
              />
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="gap-2 px-8">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Integrations */}
          <TabsContent value="integrations" className="space-y-6 mt-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xl">API Keys</CardTitle>
                <CardDescription>
                  Configure your API keys to enable AI-powered features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="openaiApiKey" className="text-sm font-medium">
                    OpenAI API Key
                  </Label>
                  <Input
                    id="openaiApiKey"
                    name="openaiApiKey"
                    type="password"
                    value={formData.openaiApiKey}
                    onChange={handleChange}
                    placeholder="sk-..."
                    className="h-11 font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Used for copywriting, content generation, and brand intelligence
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="space-y-2">
                    <Label htmlFor="elevenlabsApiKey" className="text-sm font-medium">
                      ElevenLabs API Key
                    </Label>
                    <Input
                      id="elevenlabsApiKey"
                      name="elevenlabsApiKey"
                      type="password"
                      value={formData.elevenlabsApiKey}
                      onChange={handleChange}
                      placeholder="Enter ElevenLabs API key"
                      className="h-11 font-mono"
                    />
                    <p className="text-xs text-slate-500">
                      Used for voice AI and phone call operations
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabsAgentId" className="text-sm font-medium">
                    ElevenLabs Agent ID <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <Input
                    id="elevenlabsAgentId"
                    name="elevenlabsAgentId"
                    value={formData.elevenlabsAgentId || ""}
                    onChange={handleChange}
                    placeholder="Agent ID for phone calls"
                    className="h-11 font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Pre-configured agent for call center operations
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="elevenlabsPhoneNumberId" className="text-sm font-medium">
                    ElevenLabs Phone Number ID <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <Input
                    id="elevenlabsPhoneNumberId"
                    name="elevenlabsPhoneNumberId"
                    value={formData.elevenlabsPhoneNumberId || ""}
                    onChange={handleChange}
                    placeholder="Phone Number ID from ElevenLabs"
                    className="h-11 font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Required for making outbound phone calls
                  </p>
                </div>
              </CardContent>
            </Card>

            <AgentManager
              agents={formData.elevenlabsAgents || []}
              onUpdate={(agents: ElevenLabsAgent[]) =>
                setFormData((prev) => ({ ...prev, elevenlabsAgents: agents }))
              }
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="gap-2 px-8">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
