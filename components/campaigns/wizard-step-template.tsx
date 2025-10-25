"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Check, Loader2 } from "lucide-react";
import { QuickStartWizardData } from "./wizard-step-campaign";

interface CampaignTemplate {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  use_count: number;
  template_data: string;
}

interface WizardStepTemplateProps {
  data: Partial<QuickStartWizardData>;
  onChange: (data: Partial<QuickStartWizardData>) => void;
}

export function WizardStepTemplate({ data, onChange }: WizardStepTemplateProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/campaigns/templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates || result.data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    t.category.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
        {filteredTemplates.map(template => {
          // Safely parse template data with fallback
          let templateData = template.template_data;
          if (typeof template.template_data === 'string') {
            try {
              templateData = JSON.parse(template.template_data);
            } catch (error) {
              console.error('Failed to parse template data:', error);
              templateData = {};
            }
          }

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                data.templateId === template.id
                  ? 'border-blue-500 border-2 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
              onClick={() => onChange({ ...data, templateId: template.id })}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{template.name}</h4>
                    {template.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        {template.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        Used {template.use_count} times
                      </span>
                    </div>
                  </div>

                  {data.templateId === template.id && (
                    <div className="ml-2">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-2 text-center py-12 text-slate-500">
            No templates found. {debouncedSearchQuery && 'Try adjusting your search.'}
          </div>
        )}

        {templates.length === 0 && !loading && (
          <div className="col-span-2 text-center py-12 text-slate-500">
            No templates available. Create one first in the Templates section.
          </div>
        )}
      </div>
    </div>
  );
}
