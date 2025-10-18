"use client";

import { LayoutTemplate, getLayoutConfig } from "@/lib/dm-image-compositor-browser";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface TemplateSelectorProps {
  selected: LayoutTemplate;
  onSelect: (template: LayoutTemplate) => void;
}

const templates: LayoutTemplate[] = ['classic', 'modern', 'minimal', 'premium'];

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Layout Template</label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {templates.map((template) => {
          const config = getLayoutConfig(template);
          const isSelected = selected === template;

          return (
            <button
              key={template}
              type="button"
              onClick={() => onSelect(template)}
              className={cn(
                "relative group p-3 rounded-lg border-2 transition-all",
                "hover:border-primary/50 hover:bg-slate-50",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-slate-200"
              )}
            >
              {/* Thumbnail Preview */}
              <div className="relative w-full aspect-[3/2] mb-2 bg-gradient-to-br from-slate-100 to-slate-200 rounded overflow-hidden">
                <TemplatePreview template={template} />

                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="text-left">
                <div className="font-medium text-sm">{config.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{config.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Visual thumbnail preview for each template layout
 */
function TemplatePreview({ template }: { template: LayoutTemplate }) {
  const config = getLayoutConfig(template);

  // Render simplified visual representation
  if (config.panelPosition === 'left') {
    return (
      <div className="flex h-full">
        <div
          className="bg-blue-600 flex items-center justify-center"
          style={{ width: `${config.panelSize}%` }}
        >
          <div className="space-y-1">
            {config.logoPosition === 'center' ? (
              <div className="w-8 h-3 bg-white/80 rounded mx-auto" />
            ) : (
              <div className="w-6 h-2 bg-white/80 rounded" />
            )}
            <div className="w-10 h-1 bg-white/60 rounded" />
            <div className="w-8 h-1 bg-white/60 rounded" />
          </div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-orange-200 to-orange-300">
          {config.qrPosition === 'top-right' && (
            <div className="absolute top-1 right-1 w-4 h-4 bg-white/80 rounded" />
          )}
          {config.qrPosition === 'bottom-right' && (
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-white/80 rounded" />
          )}
        </div>
      </div>
    );
  }

  if (config.panelPosition === 'top') {
    return (
      <div className="flex flex-col h-full">
        <div
          className="bg-blue-600 flex items-center justify-center"
          style={{ height: `${config.panelSize}%` }}
        >
          <div className="w-8 h-2 bg-white/80 rounded" />
        </div>
        <div className="flex-1 bg-gradient-to-br from-orange-200 to-orange-300 relative">
          {config.qrPosition === 'bottom-center' && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 rounded" />
          )}
        </div>
      </div>
    );
  }

  // Minimal - no panel
  return (
    <div className="relative h-full bg-gradient-to-br from-orange-200 to-orange-300">
      <div className="absolute top-2 left-2 space-y-1">
        <div className="w-6 h-2 bg-white/90 rounded shadow-sm" />
        <div className="w-10 h-1 bg-white/70 rounded shadow-sm" />
        <div className="w-8 h-1 bg-white/70 rounded shadow-sm" />
      </div>
      <div className="absolute bottom-1 right-1 w-4 h-4 bg-white/90 rounded shadow-sm" />
    </div>
  );
}
