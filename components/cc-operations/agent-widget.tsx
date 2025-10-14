"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useSettings } from "@/lib/contexts/settings-context";

interface AgentWidgetProps {
  selectedAgentId?: string;
}

export function AgentWidget({ selectedAgentId }: AgentWidgetProps) {
  const { settings } = useSettings();
  const availableAgents = settings.elevenlabsAgents || [];
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // Use selected agent or fall back to first agent
  const agentId = selectedAgentId || availableAgents[0]?.agentId;
  const selectedAgent = availableAgents.find(a => a.agentId === agentId);

  useEffect(() => {
    // Load the ElevenLabs ConvAI widget script
    if (!document.getElementById('elevenlabs-convai-script')) {
      const script = document.createElement('script');
      script.id = 'elevenlabs-convai-script';
      script.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      script.async = true;
      script.type = 'text/javascript';
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    // Dynamically create the custom element to avoid TypeScript JSX errors
    if (widgetContainerRef.current && agentId) {
      widgetContainerRef.current.innerHTML = '';
      const widgetElement = document.createElement('elevenlabs-convai');
      widgetElement.setAttribute('agent-id', agentId);
      widgetContainerRef.current.appendChild(widgetElement);
    }
  }, [agentId]);

  if (!agentId || availableAgents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Agent Chat</CardTitle>
          <CardDescription>
            Test your AI agent directly in the browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-slate-600 mb-2">No agents configured</p>
            <p className="text-sm text-slate-500">
              Add agents in Settings → AI Agent Scenarios to enable live chat
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Agent Chat</CardTitle>
        <CardDescription>
          {selectedAgent ? (
            <>Test <strong>{selectedAgent.name}</strong> directly in the browser</>
          ) : (
            'Test your AI agent directly in the browser'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-50 rounded-lg p-6 min-h-[400px] flex items-center justify-center">
          <div className="w-full" ref={widgetContainerRef}>
            {/* ElevenLabs ConvAI Widget will be inserted here dynamically */}
          </div>
        </div>
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Click the widget below to start a conversation with your AI agent.
            This uses the same agent as phone calls but in an interactive chat interface.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
