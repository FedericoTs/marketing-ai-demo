"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Phone } from "lucide-react";
import { ElevenLabsAgent } from "@/types/settings";

interface AgentManagerProps {
  agents: ElevenLabsAgent[];
  onUpdate: (agents: ElevenLabsAgent[]) => void;
}

export function AgentManager({ agents, onUpdate }: AgentManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    description: "",
    agentId: "",
  });

  const handleAdd = () => {
    if (!newAgent.name || !newAgent.agentId) {
      return;
    }

    const agent: ElevenLabsAgent = {
      id: `agent_${Date.now()}`,
      name: newAgent.name,
      description: newAgent.description,
      agentId: newAgent.agentId,
    };

    onUpdate([...agents, agent]);
    setNewAgent({ name: "", description: "", agentId: "" });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    onUpdate(agents.filter((a) => a.id !== id));
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              AI Agent Scenarios
            </CardTitle>
            <CardDescription className="mt-2">
              Configure different call scenarios with pre-trained ElevenLabs agents
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsAdding(!isAdding)}
            variant="outline"
            size="default"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {isAdding && (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name" className="text-sm font-medium">
                  Agent Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="agent-name"
                  value={newAgent.name}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, name: e.target.value })
                  }
                  placeholder="e.g., Appointment Confirmation, Customer Support"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="agent-description"
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  placeholder="Brief description of what this agent does..."
                  rows={2}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-id" className="text-sm font-medium">
                  ElevenLabs Agent ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="agent-id"
                  value={newAgent.agentId}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, agentId: e.target.value })
                  }
                  placeholder="agent_..."
                  className="h-11 font-mono"
                />
                <p className="text-xs text-slate-500">
                  📋 Copy this from your ElevenLabs dashboard
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewAgent({ name: "", description: "", agentId: "" });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!newAgent.name || !newAgent.agentId}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {agents.length === 0 && !isAdding ? (
          <div className="text-center py-12 text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            <Phone className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium">No agents configured yet</p>
            <p className="text-xs mt-1 text-slate-400">
              Add your first agent to enable AI phone calls
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-50 rounded">
                          <Phone className="h-4 w-4 text-blue-600" />
                        </div>
                        <h4 className="font-semibold text-slate-900">{agent.name}</h4>
                      </div>
                      {agent.description && (
                        <p className="text-sm text-slate-600 mb-3">
                          {agent.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Agent ID:</span>
                        <code className="text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded font-mono">
                          {agent.agentId}
                        </code>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDelete(agent.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
