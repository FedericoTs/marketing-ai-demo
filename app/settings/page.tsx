"use client";

import { useState, useEffect, useRef } from "react";
import { useSettings } from "@/lib/contexts/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentManager } from "@/components/settings/agent-manager";
import { BrandProfileManager } from "@/components/settings/brand-profile-manager";
import { BrandKitManager, BrandKitManagerRef } from "@/components/settings/brand-kit-manager";
import { WebsiteAnalyzer } from "@/components/settings/website-analyzer";
import { IndustryModuleSettings } from "@/components/settings/industry-module-settings";
import { toast } from "sonner";
import { Save, Building2, Key, Check, Sparkles, Layers, Palette, Loader2 } from "lucide-react";
import { ElevenLabsAgent } from "@/types/settings";

interface ExtractedProfile {
  brandVoice: string;
  tone: string;
  keyPhrases: string[];
  values: string[];
  targetAudience: string;
  communicationStyleNotes?: string[];
  industry?: string;
  profileId?: string;
  extractedAt?: string;
}

interface BrandKitData {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
  landingPageTemplate?: string;
}

export default function SettingsPage() {
  const { settings, updateSettings, isLoaded } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [brandProfile, setBrandProfile] = useState<ExtractedProfile | null>(null);
  const [brandKitData, setBrandKitData] = useState<BrandKitData | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const brandKitRef = useRef<BrandKitManagerRef>(null);

  // Load settings ONCE when they first become available
  useEffect(() => {
    if (isLoaded && !profileLoaded) {
      setFormData(settings);
    }
  }, [isLoaded, profileLoaded, settings]);

  // Load brand profile from database ONCE when page mounts
  useEffect(() => {
    if (isLoaded && settings.companyName && settings.openaiApiKey && !profileLoaded) {
      loadBrandProfile(settings.companyName);
      setProfileLoaded(true);
    }
  }, [isLoaded, settings.companyName, settings.openaiApiKey, profileLoaded]);

  async function loadBrandProfile(companyName: string) {
    setIsLoadingProfile(true);
    try {
      // Load brand profile (voice, tone, etc.)
      const profileResponse = await fetch(
        `/api/brand/profile?companyName=${encodeURIComponent(companyName)}`
      );

      if (profileResponse.ok) {
        const profileResult = await profileResponse.json();
        if (profileResult.success && profileResult.data) {
          const profile = profileResult.data;
          setBrandProfile({
            brandVoice: profile.brand_voice || profile.brandVoice,
            tone: profile.tone,
            keyPhrases: profile.keyPhrases || [],
            values: profile.values || [],
            targetAudience: profile.target_audience || profile.targetAudience,
            industry: profile.industry,
            extractedAt: profile.extracted_at || profile.extractedAt,
          });

          // Auto-fill form with profile data
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

      // Brand kit is loaded directly by BrandKitManager component
      // We don't need to load it here to avoid triggering the auto-fill toast
      console.log("✅ Brand profile loaded - brand kit will be loaded by BrandKitManager");
    } catch (error) {
      console.error("Error loading brand data:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }

  const handleWebsiteAnalyzed = (data: any) => {
    // Mark that profile has been loaded so useEffect doesn't override
    setProfileLoaded(true);

    // Update company profile
    setBrandProfile({
      brandVoice: data.brandVoice,
      tone: data.tone,
      keyPhrases: data.keyPhrases || [],
      values: data.brandValues || [],
      communicationStyleNotes: data.communicationStyleNotes || [],
      targetAudience: data.targetAudience,
      industry: data.industry,
      extractedAt: new Date().toISOString(),
    });

    // Auto-fill company profile form fields (merging with existing, not replacing)
    setFormData(prev => ({
      ...prev,
      companyName: data.companyName || prev.companyName,
      industry: data.industry || prev.industry,
      brandVoice: data.brandVoice || prev.brandVoice,
      tone: data.tone || prev.tone,
      targetAudience: data.targetAudience || prev.targetAudience,
    }));

    // Update brand kit data (will be passed to BrandKitManager)
    setBrandKitData({
      logoUrl: data.logoUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      accentColor: data.accentColor,
      headingFont: data.headingFont,
      bodyFont: data.bodyFont,
      landingPageTemplate: data.landingPageTemplate,
    });
  };

  const handleProfileExtracted = (profile: ExtractedProfile) => {
    // Mark that profile has been loaded
    setProfileLoaded(true);

    // Update brand profile state
    setBrandProfile(profile);

    // Auto-fill form fields (merging with existing, not replacing)
    setFormData(prev => ({
      ...prev,
      brandVoice: profile.brandVoice || prev.brandVoice,
      tone: profile.tone || prev.tone,
      targetAudience: profile.targetAudience || prev.targetAudience,
      industry: profile.industry || prev.industry,
    }));

    toast.success("✨ Company profile auto-filled with brand intelligence!");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName) {
      toast.error("Company name is required");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Save Company Profile to database
      const profileResponse = await fetch('/api/brand/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          brandVoice: formData.brandVoice || '',
          tone: formData.tone || '',
          keyPhrases: brandProfile?.keyPhrases || [],
          values: brandProfile?.values || [],
          targetAudience: formData.targetAudience || '',
          industry: formData.industry || '',
        }),
      });

      const profileResult = await profileResponse.json();

      if (!profileResult.success) {
        toast.error(profileResult.error || 'Failed to save company profile');
        setIsSaving(false);
        return;
      }

      // 2. Save Brand Kit to database (via BrandKitManager ref)
      if (brandKitRef.current) {
        const brandKitSaved = await brandKitRef.current.save();
        if (!brandKitSaved) {
          // Brand kit save failed, but company profile was saved
          toast.error('Company profile saved, but brand kit failed to save');
          setIsSaving(false);
          return;
        }
      }

      // 3. Save settings to localStorage (for API keys)
      updateSettings(formData);

      toast.success("✅ All settings saved successfully!");
    } catch (error) {
      toast.error("Failed to save settings. Please try again.");
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
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
        <Tabs defaultValue="brand" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-3 h-auto p-1">
            <TabsTrigger value="brand" className="gap-2 py-3">
              <Sparkles className="h-4 w-4" />
              <span className="font-medium">Brand Intelligence</span>
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

          {/* Tab 1: Brand Intelligence (Unified) */}
          <TabsContent value="brand" className="space-y-6 mt-6">
            {/* AI Website Analyzer - Always show at the top */}
            {formData.openaiApiKey ? (
              <WebsiteAnalyzer onBrandDataExtracted={handleWebsiteAnalyzed} />
            ) : (
              <Card className="border-2 border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                  <p className="text-sm text-orange-900">
                    ⚠️ <strong>OpenAI API Key Required:</strong> Please add your OpenAI API key in the Integrations tab to enable AI Website Analysis.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Section 1: Company Profile */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Company Profile
                    </CardTitle>
                    <CardDescription>
                      Define your company identity and brand voice for AI-generated content
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
                {brandProfile && (brandProfile.keyPhrases.length > 0 || brandProfile.values.length > 0 || (brandProfile.communicationStyleNotes && brandProfile.communicationStyleNotes.length > 0)) && (
                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <h4 className="text-sm font-semibold text-slate-900">AI-Extracted Brand Guidelines</h4>
                      {brandProfile.extractedAt && (
                        <span className="text-xs text-slate-500">
                          • Updated {new Date(brandProfile.extractedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {brandProfile.communicationStyleNotes && brandProfile.communicationStyleNotes.length > 0 && (
                      <div className="space-y-2 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-amber-100 rounded">
                            <Sparkles className="h-3.5 w-3.5 text-amber-700" />
                          </div>
                          <Label className="text-sm font-semibold text-amber-900">Communication Style Guidelines</Label>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-700">
                          {brandProfile.communicationStyleNotes.map((note, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-amber-600 mt-1">▸</span>
                              <span>{note}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-700 italic mt-2">
                          💡 These guidelines will be used to generate marketing campaigns in your brand's voice
                        </p>
                      </div>
                    )}

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

            {/* Section 2: Visual Brand Kit */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Visual Brand Kit
                </CardTitle>
                <CardDescription>
                  Customize your brand identity with logo, colors, and fonts. All marketing materials will automatically use these settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <BrandKitManager
                  ref={brandKitRef}
                  companyName={formData.companyName || "Your Company"}
                  extractedBrandKit={brandKitData}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="lg" className="gap-2 px-8" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save All Changes
                  </>
                )}
              </Button>
            </div>
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
