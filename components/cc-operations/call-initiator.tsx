"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/lib/contexts/settings-context";

interface CallInitiatorProps {
  onCallInitiated: (callData: Record<string, unknown>) => void;
  onAgentSelected?: (agentId: string) => void;
}

export function CallInitiator({ onCallInitiated, onAgentSelected }: CallInitiatorProps) {
  const { settings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const handleAgentChange = (agentId: string) => {
    setSelectedAgentId(agentId);
    if (onAgentSelected) {
      onAgentSelected(agentId);
    }
  };

  // Get available agents from settings
  const availableAgents = settings.elevenlabsAgents || [];

  const handleInitiateCall = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber) {
      toast.error("Please enter a phone number");
      return;
    }

    if (!selectedAgentId) {
      toast.error("Please select an agent");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/call/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          callObjective: "Making a call", // Simple placeholder
          customerContext: {},
          apiKey: settings.elevenlabsApiKey,
          agentId: selectedAgentId, // Use selected agent ID from dropdown
          phoneNumberId: settings.elevenlabsPhoneNumberId, // UNCHANGED - always from settings
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Call initiated successfully!");
        onCallInitiated(data);
        setPhoneNumber("");
      } else {
        toast.warning(data.error || "Call initiation failed");
        if (data.message) {
          onCallInitiated(data);
        }
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error("An error occurred while initiating the call");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Initiate AI Phone Call</CardTitle>
        <CardDescription>
          Select an agent and enter phone number to initiate a call
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInitiateCall} className="space-y-4" suppressHydrationWarning>
          <div className="space-y-2">
            <Label htmlFor="agent">Select Agent *</Label>
            <Select value={selectedAgentId} onValueChange={handleAgentChange}>
              <SelectTrigger id="agent">
                <SelectValue placeholder="Choose an agent for this call" />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.length > 0 ? (
                  availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.agentId}>
                      <div className="flex flex-col">
                        <span className="font-medium">{agent.name}</span>
                        {agent.description && (
                          <span className="text-xs text-slate-500">{agent.description}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-agents" disabled>
                    No agents configured
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {availableAgents.length === 0 && (
              <p className="text-xs text-amber-600">
                Add agents in Settings → AI Agent Scenarios
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              required
            />
            <p className="text-xs text-slate-500">
              International format starting with + (e.g., +1234567890)
            </p>
          </div>

          {!settings.elevenlabsApiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Configuration Required:</strong> Add ElevenLabs API key and Phone Number ID in Settings.
              </p>
            </div>
          )}

          {selectedAgentId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Ready:</strong> Call will use the selected agent. Manage agents in Settings → AI Agent Scenarios.
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !settings.elevenlabsApiKey || !settings.elevenlabsPhoneNumberId || availableAgents.length === 0}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Initiating Call...
              </>
            ) : (
              <>
                <Phone className="h-5 w-5" />
                Initiate Call
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
