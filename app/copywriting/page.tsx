"use client";

import { CopyGenerator } from "@/components/copywriting/copy-generator";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Target, Zap } from "lucide-react";

export default function CopywritingPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Copywriting</h1>
        <p className="text-slate-600 mb-6">
          Generate marketing copy variations optimized for different audiences and platforms
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Multi-Platform</h3>
                  <p className="text-sm text-slate-600">
                    Optimized for email, social, web, and print
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Audience-Tailored</h3>
                  <p className="text-sm text-slate-600">
                    Variations for B2B, B2C, enterprise, and more
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Brand-Consistent</h3>
                  <p className="text-sm text-slate-600">
                    Uses your company voice and style
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <CopyGenerator />
    </div>
  );
}
