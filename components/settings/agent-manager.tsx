"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Agent Scenarios</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Configure different call scenarios with pre-trained agents
            </p>
          </div>
          <Button
            onClick={() => setIsAdding(!isAdding)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <Card className="bg-slate-50">
            <CardContent className="pt-6 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name *</Label>
                <Input
                  id="agent-name"
                  value={newAgent.name}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, name: e.target.value })
                  }
                  placeholder="e.g., Appointment Confirmation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-description">Description</Label>
                <Textarea
                  id="agent-description"
                  value={newAgent.description}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  placeholder="Brief description of what this agent does..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-id">ElevenLabs Agent ID *</Label>
                <Input
                  id="agent-id"
                  value={newAgent.agentId}
                  onChange={(e) =>
                    setNewAgent({ ...newAgent, agentId: e.target.value })
                  }
                  placeholder="agent_..."
                />
                <p className="text-xs text-slate-500">
                  Copy this from your ElevenLabs dashboard
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setIsAdding(false);
                    setNewAgent({ name: "", description: "", agentId: "" });
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!newAgent.name || !newAgent.agentId}
                  size="sm"
                >
                  Add Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {agents.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-slate-500">
            <Phone className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No agents configured yet</p>
            <p className="text-xs mt-1">
              Add your first agent to enable AI phone calls
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <Card key={agent.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold">{agent.name}</h4>
                      </div>
                      {agent.description && (
                        <p className="text-sm text-slate-600 mt-1">
                          {agent.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2 font-mono">
                        {agent.agentId}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleDelete(agent.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
