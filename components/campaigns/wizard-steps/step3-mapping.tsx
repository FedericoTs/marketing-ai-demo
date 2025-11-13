'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Wand2, ArrowRight } from 'lucide-react';
import type { DesignTemplate, VariableMapping } from '@/lib/database/types';
import { cn } from '@/lib/utils';

interface Step3MappingProps {
  selectedTemplate: DesignTemplate | null;
  variableMappings: VariableMapping[];
  onVariableMappingsChange: (mappings: VariableMapping[]) => void;
  onNext: () => void;
  onBack: () => void;
}

// Available recipient fields from the recipients table schema
const RECIPIENT_FIELDS = [
  { value: 'first_name', label: 'First Name', type: 'text' },
  { value: 'last_name', label: 'Last Name', type: 'text' },
  { value: 'email', label: 'Email', type: 'email' },
  { value: 'phone', label: 'Phone', type: 'phone' },
  { value: 'address_line1', label: 'Address Line 1', type: 'address' },
  { value: 'address_line2', label: 'Address Line 2', type: 'address' },
  { value: 'city', label: 'City', type: 'text' },
  { value: 'state', label: 'State', type: 'text' },
  { value: 'zip_code', label: 'ZIP Code', type: 'text' },
  { value: 'country', label: 'Country', type: 'text' },
];

// Auto-suggest intelligent mappings based on variable names
function getAutoSuggestedMapping(variableName: string): string {
  // Normalize the variable name to lowercase for matching
  const normalized = variableName.toLowerCase().replace(/[_\s-]/g, '');

  // Smart matching based on common variable name patterns
  if (normalized.includes('first') && normalized.includes('name')) return 'first_name';
  if (normalized === 'firstname') return 'first_name';
  if (normalized === 'fname') return 'first_name';

  if (normalized.includes('last') && normalized.includes('name')) return 'last_name';
  if (normalized === 'lastname') return 'last_name';
  if (normalized === 'lname') return 'last_name';
  if (normalized === 'surname') return 'last_name';

  if (normalized.includes('email') || normalized === 'mail') return 'email';

  if (normalized.includes('phone') || normalized.includes('mobile') || normalized === 'tel') return 'phone';

  if (normalized.includes('address') && !normalized.includes('2')) return 'address_line1';
  if (normalized.includes('address') && normalized.includes('2')) return 'address_line2';
  if (normalized === 'street') return 'address_line1';

  if (normalized === 'city') return 'city';
  if (normalized === 'state') return 'state';
  if (normalized === 'zip' || normalized === 'zipcode' || normalized === 'postal') return 'zip_code';
  if (normalized === 'country') return 'country';

  // No match found
  return '';
}

export function Step3Mapping({
  selectedTemplate,
  variableMappings,
  onVariableMappingsChange,
  onNext,
  onBack,
}: Step3MappingProps) {
  const [localMappings, setLocalMappings] = useState<VariableMapping[]>(variableMappings);
  const [hasAutoSuggested, setHasAutoSuggested] = useState(false);

  // Extract template variables from ALL surfaces (front + back)
  const templateVariables = useMemo(() => {
    if (!selectedTemplate) return [];

    const allVariables: Array<{
      id: string;
      templateVariable: string;
      variableType: string;
      isReusable: boolean;
      surface: string; // 'front' or 'back'
    }> = [];

    // DUAL SURFACE MODE: Extract from template.surfaces[]
    if (selectedTemplate.surfaces && selectedTemplate.surfaces.length > 0) {
      selectedTemplate.surfaces.forEach((surface: any) => {
        const surfaceSide = surface.side || 'unknown';
        const surfaceMappings = surface.variable_mappings || {};
        const surfaceCanvas = surface.canvas_json;

        Object.entries(surfaceMappings).forEach(([idx, mapping]: [string, any]) => {
          // Get the actual text content from canvas_json for this index
          const canvasObject = surfaceCanvas?.objects?.[parseInt(idx)];
          let displayName = mapping.variableType || `variable_${idx}`;

          // If this is a text object, extract the variable name from {variableName}
          if (canvasObject?.type === 'Textbox' && canvasObject?.text) {
            const textContent = canvasObject.text;
            const match = textContent.match(/\{([^}]+)\}/);
            if (match) {
              displayName = match[1]; // Extract "firstname" from "{firstname}"
            }
          }

          allVariables.push({
            id: `${surfaceSide}_${idx}`, // Unique ID per surface
            templateVariable: displayName,
            variableType: mapping.variableType || 'text',
            isReusable: mapping.isReusable || false,
            surface: surfaceSide,
          });
        });
      });
    }
    // LEGACY SINGLE SURFACE MODE: Extract from template.variable_mappings
    else if (selectedTemplate.variable_mappings) {
      Object.entries(selectedTemplate.variable_mappings).forEach(([idx, mapping]: [string, any]) => {
        const canvasObject = selectedTemplate.canvas_json?.objects?.[parseInt(idx)];
        let displayName = mapping.variableType || `variable_${idx}`;

        if (canvasObject?.type === 'Textbox' && canvasObject?.text) {
          const textContent = canvasObject.text;
          const match = textContent.match(/\{([^}]+)\}/);
          if (match) {
            displayName = match[1];
          }
        }

        allVariables.push({
          id: idx,
          templateVariable: displayName,
          variableType: mapping.variableType || 'text',
          isReusable: mapping.isReusable || false,
          surface: 'front', // Legacy templates are single-sided
        });
      });
    }

    return allVariables;
  }, [selectedTemplate]);

  // Filter out:
  // 1. Reusable variables (logo, message) - don't need mapping
  // 2. QR codes - auto-generated, don't need mapping
  const variablesNeedingMapping = templateVariables.filter((v) =>
    !v.isReusable && v.variableType !== 'qrCode'
  );

  // Auto-suggest mappings on mount
  useEffect(() => {
    if (!hasAutoSuggested && variablesNeedingMapping.length > 0) {
      const autoMappings = variablesNeedingMapping.map((variable) => ({
        templateVariable: variable.templateVariable,
        recipientField: getAutoSuggestedMapping(variable.templateVariable), // Use actual variable name
        variableType: variable.variableType,
        isReusable: false,
      }));
      setLocalMappings(autoMappings);
      setHasAutoSuggested(true);
    }
  }, [variablesNeedingMapping.length, hasAutoSuggested]);

  // Apply auto-suggest manually
  const handleAutoSuggest = () => {
    const autoMappings = variablesNeedingMapping.map((variable) => ({
      templateVariable: variable.templateVariable,
      recipientField: getAutoSuggestedMapping(variable.templateVariable), // Use actual variable name
      variableType: variable.variableType,
      isReusable: false,
    }));
    setLocalMappings(autoMappings);
  };

  // Update a specific mapping
  const handleMappingChange = (templateVariable: string, recipientField: string) => {
    setLocalMappings((prev) => {
      const existing = prev.find((m) => m.templateVariable === templateVariable);
      if (existing) {
        return prev.map((m) =>
          m.templateVariable === templateVariable
            ? { ...m, recipientField }
            : m
        );
      } else {
        const variable = variablesNeedingMapping.find((v) => v.templateVariable === templateVariable);
        return [
          ...prev,
          {
            templateVariable,
            recipientField,
            variableType: variable?.variableType || 'text',
            isReusable: false,
          },
        ];
      }
    });
  };

  // Get current mapping for a variable
  const getCurrentMapping = (templateVariable: string): string => {
    const mapping = localMappings.find((m) => m.templateVariable === templateVariable);
    return mapping?.recipientField || '';
  };

  // Check if all required variables are mapped
  const allMapped = variablesNeedingMapping.every((variable) => {
    const mapping = localMappings.find((m) => m.templateVariable === variable.templateVariable);
    return mapping && mapping.recipientField;
  });

  // Handle continue
  const handleContinue = () => {
    onVariableMappingsChange(localMappings);
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Map Variables to Recipient Data</h2>
        <p className="text-slate-600 mt-2">
          Connect template variables to recipient fields for personalization
        </p>
      </div>

      {/* Auto-suggest button */}
      <div className="flex justify-center">
        <Button
          onClick={handleAutoSuggest}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Wand2 className="h-4 w-4" />
          Auto-suggest Mappings
        </Button>
      </div>

      {/* Reusable variables + QR codes notice */}
      {(templateVariables.filter((v) => v.isReusable).length > 0 ||
        templateVariables.filter((v) => v.variableType === 'qrCode').length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">Auto-Handled Elements</h4>
              <p className="text-sm text-blue-700 mt-1">
                {templateVariables.filter((v) => v.isReusable).length > 0 && (
                  <span>Logo, message, and other template elements will be automatically applied. </span>
                )}
                {templateVariables.filter((v) => v.variableType === 'qrCode').length > 0 && (
                  <span>QR codes will be auto-generated with unique tracking links for each recipient. </span>
                )}
                Only personalized fields need mapping below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Variable mappings */}
      {variablesNeedingMapping.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <p className="text-slate-900 font-semibold">No Variable Mapping Needed</p>
            <p className="text-slate-600 text-sm mt-2">
              This template uses only reusable elements. You can proceed to review.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {variablesNeedingMapping.map((variable) => {
            const currentMapping = getCurrentMapping(variable.templateVariable);
            const isMapped = Boolean(currentMapping);

            return (
              <Card key={variable.id} className={cn(
                'transition-all',
                isMapped && 'border-green-500 bg-green-50/50'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Variable info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-900">
                          {variable.templateVariable}
                        </h4>
                        <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                          {variable.variableType}
                        </span>
                        {variable.surface && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded font-medium",
                            variable.surface === 'front'
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          )}>
                            {variable.surface === 'front' ? '📄 Front' : '📄 Back'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        Will be personalized for each recipient
                      </p>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0" />

                    {/* Recipient field selector */}
                    <div className="w-64">
                      <Select
                        value={currentMapping}
                        onValueChange={(value) => handleMappingChange(variable.templateVariable, value)}
                      >
                        <SelectTrigger className={cn(
                          isMapped && 'border-green-500 bg-green-50'
                        )}>
                          <SelectValue placeholder="Select recipient field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {RECIPIENT_FIELDS.map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status indicator */}
                    {isMapped && (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Validation warning */}
      {!allMapped && variablesNeedingMapping.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-900">Incomplete Mappings</h4>
              <p className="text-sm text-amber-700 mt-1">
                Please map all variables to recipient fields to continue.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
        >
          ← Back to Audience
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!allMapped}
          size="lg"
          className="min-w-[200px]"
        >
          Continue to Review
          <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
}
