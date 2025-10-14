"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Phone, Clock } from "lucide-react";

interface CallStatusProps {
  callData: Record<string, unknown>;
}

export function CallStatus({ callData }: CallStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Call Initiated</h3>
            <p className="text-sm text-slate-600">
              {(callData.message as string) || "The AI agent is processing your request"}
            </p>
          </div>
        </div>

        {callData.callId ? (
          <div className="space-y-2 bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-slate-600" />
              <span className="font-medium">Call ID:</span>
              <code className="text-xs bg-white px-2 py-1 rounded">
                {String(callData.callId)}
              </code>
            </div>

            {callData.status ? (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-slate-600" />
                <span className="font-medium">Status:</span>
                <span className="capitalize">{String(callData.status)}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2 text-sm">Demo Mode Information</h4>
          <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>This is a demonstration of the call initiation flow</li>
            <li>Real calls require a configured ElevenLabs API key</li>
            <li>The AI agent would use company settings for personalization</li>
            <li>Call metrics and transcripts would be available post-call</li>
          </ul>
        </div>

        {callData.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Error:</strong> {String(callData.error)}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
