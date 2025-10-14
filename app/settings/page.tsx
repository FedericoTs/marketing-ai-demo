"use client";

import { useState, useEffect } from "react";
import { useSettings } from "@/lib/contexts/settings-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AgentManager } from "@/components/settings/agent-manager";
import { toast } from "sonner";
import { Save } from "lucide-react";
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
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-slate-600">
          Configure company information and API keys for personalized outputs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
            <CardDescription>
              This information will be used to personalize AI-generated content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  placeholder="e.g., Technology, Healthcare"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandVoice">Brand Voice</Label>
              <Textarea
                id="brandVoice"
                name="brandVoice"
                value={formData.brandVoice}
                onChange={handleChange}
                placeholder="e.g., Professional and innovative, Friendly and approachable"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience</Label>
              <Textarea
                id="targetAudience"
                name="targetAudience"
                value={formData.targetAudience}
                onChange={handleChange}
                placeholder="e.g., Business professionals, Decision makers"
                rows={2}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Configure your API keys to enable AI features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
              <Input
                id="openaiApiKey"
                name="openaiApiKey"
                type="password"
                value={formData.openaiApiKey}
                onChange={handleChange}
                placeholder="sk-..."
              />
              <p className="text-xs text-slate-500">
                Used for copywriting and content generation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="elevenlabsApiKey">ElevenLabs API Key</Label>
              <Input
                id="elevenlabsApiKey"
                name="elevenlabsApiKey"
                type="password"
                value={formData.elevenlabsApiKey}
                onChange={handleChange}
                placeholder="Enter ElevenLabs API key"
              />
              <p className="text-xs text-slate-500">
                Used for voice AI and phone calls
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="elevenlabsAgentId">
                ElevenLabs Agent ID (Optional)
              </Label>
              <Input
                id="elevenlabsAgentId"
                name="elevenlabsAgentId"
                value={formData.elevenlabsAgentId || ""}
                onChange={handleChange}
                placeholder="Agent ID for phone calls"
              />
              <p className="text-xs text-slate-500">
                Pre-configured agent for call center operations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="elevenlabsPhoneNumberId">
                ElevenLabs Phone Number ID (Optional)
              </Label>
              <Input
                id="elevenlabsPhoneNumberId"
                name="elevenlabsPhoneNumberId"
                value={formData.elevenlabsPhoneNumberId || ""}
                onChange={handleChange}
                placeholder="Phone Number ID from ElevenLabs"
              />
              <p className="text-xs text-slate-500">
                The ID of your configured outbound phone number in ElevenLabs (required for making calls)
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

        <div className="flex justify-end">
          <Button type="submit" size="lg" className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
