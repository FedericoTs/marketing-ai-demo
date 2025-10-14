"use client";

import { useState } from "react";
import { CallInitiator } from "@/components/cc-operations/call-initiator";
import { CallStatus } from "@/components/cc-operations/call-status";
import { AgentWidget } from "@/components/cc-operations/agent-widget";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Zap, BarChart3 } from "lucide-react";

export default function CCOperationsPage() {
  const [callData, setCallData] = useState<Record<string, unknown> | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Call Center Operations</h1>
        <p className="text-slate-600 mb-6">
          Initiate AI-powered phone calls with personalized assistance using ElevenLabs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Voice Calls</h3>
                  <p className="text-sm text-slate-600">
                    Real-time conversational AI agents
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Personalized</h3>
                  <p className="text-sm text-slate-600">
                    Context-aware conversations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Trackable</h3>
                  <p className="text-sm text-slate-600">
                    Monitor call status and metrics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <CallInitiator
          onCallInitiated={setCallData}
          onAgentSelected={setSelectedAgentId}
        />

        {callData ? (
          <CallStatus callData={callData} />
        ) : (
          <AgentWidget selectedAgentId={selectedAgentId} />
        )}
      </div>
    </div>
  );
}
