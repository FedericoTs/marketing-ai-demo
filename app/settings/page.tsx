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
import { BrandKitManager } from "@/components/settings/brand-kit-manager";
import { IndustryModuleSettings } from "@/components/settings/industry-module-settings";
import { toast } from "sonner";
import { Save, Building2, Key, Check, Sparkles, Layers, Palette } from "lucide-react";
import { ElevenLabsAgent } from "@/types/settings";

interface ExtractedProfile {
  brandVoice: string;
  tone: string;
  keyPhrases: string[];
  values: string[];
  targetAudience: string;
  industry?: string;
  profileId?: string;
  extractedAt?: string;
}

export default function SettingsPage() {
  const { settings, updateSettings, isLoaded } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [brandProfile, setBrandProfile] = useState<ExtractedProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setFormData(settings);
    }
  }, [settings, isLoaded]);

  // Load brand profile from database when page mounts
  useEffect(() => {
    if (isLoaded && formData.companyName && formData.openaiApiKey) {
      loadBrandProfile(formData.companyName);
    }
  }, [isLoaded, formData.companyName, formData.openaiApiKey]);

  async function loadBrandProfile(companyName: string) {
    setIsLoadingProfile(true);
    try {
      const response = await fetch(
        `/api/brand/profile?companyName=${encodeURIComponent(companyName)}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const profile = result.data;
          setBrandProfile({
            brandVoice: profile.brand_voice || profile.brandVoice,
            tone: profile.tone,
            keyPhrases: profile.keyPhrases || [],
            values: profile.values || [],
            targetAudience: profile.target_audience || profile.targetAudience,
            industry: profile.industry,
            extractedAt: profile.extracted_at || profile.extractedAt,
          });

          // Auto-fill form with profile data (only if fields are empty or match defaults)
          setFormData(prev => ({
            ...prev,
            brandVoice: profile.brand_voice || profile.brandVoice || prev.brandVoice,
            tone: profile.tone || prev.tone,
            targetAudience: profile.target_audience || profile.targetAudience || prev.targetAudience,
            industry: profile.industry || prev.industry,
          }));

          console.log("✅ Brand profile loaded from database");
        }
      }
    } catch (error) {
      console.error("Error loading brand profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }

  const handleProfileExtracted = (profile: ExtractedProfile) => {
    // Update brand profile state
    setBrandProfile(profile);

    // Auto-fill form fields
    setFormData(prev => ({
      ...prev,
      brandVoice: profile.brandVoice || prev.brandVoice,
      tone: profile.tone || prev.tone,
      targetAudience: profile.targetAudience || prev.targetAudience,
      industry: profile.industry || prev.industry,
    }));

    toast.info("✨ Form auto-filled with brand intelligence! Review and save changes.");
  };

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
          <TabsList className="grid w-full max-w-4xl grid-cols-4 h-auto p-1">
            <TabsTrigger value="company" className="gap-2 py-3">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">Company & Brand</span>
            </TabsTrigger>
            <TabsTrigger value="brandkit" className="gap-2 py-3">
              <Palette className="h-4 w-4" />
              <span className="font-medium">Brand Kit</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2 py-3">
              <Key className="h-4 w-4" />
              <span className="font-medium">Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="industry" className="gap-2 py-3">
              <Layers className="h-4 w-4" />
              <span className="font-medium">Industry Modules</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Company & Brand */}
          <TabsContent value="company" className="space-y-6 mt-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Company Information</CardTitle>
                    <CardDescription>
                      This information will be used to personalize AI-generated content across all features
                    </CardDescription>
                  </div>

                  {/* Profile Status Badge */}
                  {brandProfile && !isLoadingProfile && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-900">Profile Loaded</span>
                    </div>
                  )}
                </div>
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

                <div className="space-y-2">
                  <Label htmlFor="tone" className="text-sm font-medium">
                    Brand Tone <span className="text-slate-400">(Optional)</span>
                  </Label>
                  <Input
                    id="tone"
                    name="tone"
                    value={formData.tone || ""}
                    onChange={handleChange}
                    placeholder="e.g., Warm and empathetic, Bold and authoritative, Professional and reassuring"
                    className="h-11"
                  />
                  <p className="text-xs text-slate-500">
                    The emotional quality of your brand communication
                  </p>
                </div>

                {/* AI-Extracted Brand Elements */}
                {brandProfile && (brandProfile.keyPhrases.length > 0 || brandProfile.values.length > 0) && (
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h4 className="text-sm font-semibold text-slate-900">AI-Extracted Brand Elements</h4>
                      {brandProfile.extractedAt && (
                        <span className="text-xs text-slate-500">
                          • Updated {new Date(brandProfile.extractedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {brandProfile.keyPhrases.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Key Brand Phrases</Label>
                        <div className="flex flex-wrap gap-2">
                          {brandProfile.keyPhrases.map((phrase, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full text-xs text-purple-900"
                            >
                              {phrase}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          These phrases will be automatically incorporated into AI-generated content
                        </p>
                      </div>
                    )}

                    {brandProfile.values.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Core Brand Values</Label>
                        <div className="flex flex-wrap gap-2">
                          {brandProfile.values.map((value, index) => (
                            <span
                              key={index}
                              className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-900"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          Core values that guide your brand messaging
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Brand Intelligence - Only show if company name and API key are set */}
            {formData.companyName && formData.openaiApiKey && (
              <BrandProfileManager
                companyName={formData.companyName}
                apiKey={formData.openaiApiKey}
                onProfileExtracted={handleProfileExtracted}
              />
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="gap-2 px-8">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Brand Kit */}
          <TabsContent value="brandkit" className="space-y-6 mt-6">
            <div className="space-y-4 mb-6">
              <h2 className="text-2xl font-bold">Brand Kit</h2>
              <p className="text-slate-600">
                Customize your brand identity with logo, colors, and fonts.
                All marketing materials will automatically use these settings.
              </p>
            </div>

            <BrandKitManager companyName={formData.companyName || "Your Company"} />
          </TabsContent>

          {/* Tab 3: Integrations */}
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

          {/* Tab 4: Industry Modules */}
          <TabsContent value="industry" className="space-y-6 mt-6">
            <IndustryModuleSettings />
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
}
