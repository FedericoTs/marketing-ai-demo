"use client";

import { useState } from 'react';
import { useIndustryModule } from '@/lib/contexts/industry-module-context';
import {
  industryModules,
  IndustryModuleType,
  defaultRetailConfig,
  defaultHealthcareConfig,
  defaultRealEstateConfig,
  RetailModuleConfig,
} from '@/types/industry-modules';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, Info } from 'lucide-react';
import { toast } from 'sonner';

export function IndustryModuleSettings() {
  const { settings, updateSettings } = useIndustryModule();
  const [selectedType, setSelectedType] = useState<IndustryModuleType>(settings.type);
  const [showConfig, setShowConfig] = useState(false);

  const handleModuleSelect = (type: IndustryModuleType) => {
    setSelectedType(type);
    setShowConfig(false);
  };

  const handleActivateModule = () => {
    if (!selectedType) {
      toast.error('Please select an industry module');
      return;
    }

    // Get default config for selected module
    let moduleConfig = {};
    switch (selectedType) {
      case 'retail':
        moduleConfig = { retail: defaultRetailConfig };
        break;
      case 'healthcare':
        moduleConfig = { healthcare: defaultHealthcareConfig };
        break;
      case 'realestate':
        moduleConfig = { realestate: defaultRealEstateConfig };
        break;
    }

    updateSettings({
      enabled: true,
      type: selectedType,
      ...moduleConfig,
    });

    setShowConfig(true);
    toast.success(`${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} module activated!`, {
      description: 'You can now configure advanced features',
    });
  };

  const handleDeactivateModule = () => {
    updateSettings({
      enabled: false,
      type: null,
    });
    setSelectedType(null);
    setShowConfig(false);
    toast.info('Industry module deactivated', {
      description: 'Platform reverted to core functionality',
    });
  };

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    if (settings.type === 'retail' && settings.retail) {
      updateSettings({
        ...settings,
        retail: {
          ...settings.retail,
          [feature]: enabled,
        },
      });
      toast.success(enabled ? 'Feature enabled' : 'Feature disabled');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Industry-Specific Features</h2>
        <p className="text-slate-600">
          Activate an industry module to unlock advanced features optimized for your business type.
        </p>
      </div>

      {/* Module Selection */}
      {(!settings.enabled || !settings.type) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Choose Your Industry Module</h3>

          <div className="space-y-3">
            {/* None Option */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedType === null
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => handleModuleSelect(null)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚙️</span>
                    <span className="font-semibold">None (Core Platform Only)</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    Use the platform without industry-specific features
                  </p>
                </div>
                {selectedType === null && (
                  <div className="h-5 w-5 rounded-full bg-slate-900 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Industry Modules */}
            {industryModules.map((module) => (
              <Card
                key={module.id}
                className={`cursor-pointer transition-all ${
                  selectedType === module.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                } ${module.comingSoon ? 'opacity-60' : ''}`}
                onClick={() => !module.comingSoon && handleModuleSelect(module.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{module.icon}</span>
                        <span className="font-semibold">{module.name}</span>
                        {module.comingSoon && (
                          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {module.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {module.bestFor.map((item) => (
                          <Badge key={item} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-3 space-y-1">
                        {module.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedType === module.id && !module.comingSoon && (
                      <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 ml-2">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedType && selectedType !== null && (
            <Button onClick={handleActivateModule} className="w-full" size="lg">
              Activate {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Module
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}

      {/* Active Module Configuration */}
      {settings.enabled && settings.type && (
        <div className="space-y-4">
          <Card className="border-blue-600 bg-blue-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {industryModules.find((m) => m.id === settings.type)?.icon}
                  </span>
                  <div>
                    <CardTitle>
                      {industryModules.find((m) => m.id === settings.type)?.name}
                    </CardTitle>
                    <CardDescription>
                      Module is active and running
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-600">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleDeactivateModule} size="sm">
                Deactivate Module
              </Button>
            </CardContent>
          </Card>

          {/* Retail Module Configuration */}
          {settings.type === 'retail' && settings.retail && (
            <Card>
              <CardHeader>
                <CardTitle>Retail Module Features</CardTitle>
                <CardDescription>
                  Configure which features are enabled for your retail operations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Features */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    Basic Features
                    <Badge variant="secondary">Ready</Badge>
                  </h4>
                  <div className="space-y-4">
                    <FeatureToggle
                      label="Multi-Store Campaigns"
                      description="Deploy campaigns to specific store locations"
                      checked={settings.retail.enableMultiStore}
                      onCheckedChange={(checked) => handleFeatureToggle('enableMultiStore', checked)}
                    />
                    <FeatureToggle
                      label="Age Group Targeting"
                      description="Segment campaigns by customer age ranges"
                      checked={settings.retail.enableAgeTargeting}
                      onCheckedChange={(checked) => handleFeatureToggle('enableAgeTargeting', checked)}
                    />
                    <FeatureToggle
                      label="Creative Variant Testing"
                      description="Test multiple versions of your creatives (A/B/C testing)"
                      checked={settings.retail.enableCreativeVariants}
                      onCheckedChange={(checked) => handleFeatureToggle('enableCreativeVariants', checked)}
                    />
                  </div>
                </div>

                {/* Advanced AI Features - NOW AVAILABLE! */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    Advanced AI Features
                    <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                      ✨ Now Available
                    </Badge>
                  </h4>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-purple-900">
                        <p className="font-medium">AI-Powered Intelligence Layer (Phase 10)</p>
                        <p className="text-purple-700 mt-1">
                          Smart campaign optimization, pattern recognition, and AI insights now ready to use.
                          Works with your existing campaign data.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <FeatureToggle
                      label="AI Recommendations"
                      description="Get AI-powered store recommendations for optimal campaign deployment"
                      checked={settings.retail.enableAIRecommendations}
                      onCheckedChange={(checked) => handleFeatureToggle('enableAIRecommendations', checked)}
                    />
                    <FeatureToggle
                      label="Pattern Recognition"
                      description="Statistical analysis to identify performance patterns across stores and demographics"
                      checked={settings.retail.enablePatternRecognition}
                      onCheckedChange={(checked) => handleFeatureToggle('enablePatternRecognition', checked)}
                    />
                    <FeatureToggle
                      label="Auto-Optimization"
                      description="AI-generated insights and recommendations for campaign improvement"
                      checked={settings.retail.enableAutoOptimization}
                      onCheckedChange={(checked) => handleFeatureToggle('enableAutoOptimization', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

interface FeatureToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

function FeatureToggle({ label, description, checked, onCheckedChange, disabled }: FeatureToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <Label htmlFor={label} className={`font-medium ${disabled ? 'text-slate-400' : ''}`}>
          {label}
        </Label>
        <p className={`text-sm mt-1 ${disabled ? 'text-slate-400' : 'text-slate-600'}`}>
          {description}
        </p>
      </div>
      <Switch
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
