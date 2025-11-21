'use client';

import { useState, useEffect } from 'react';
import { CanvasEditor } from '@/components/design/canvas-editor';
import { TemplateLibrary } from '@/components/templates/template-library';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { PrintFormat } from '@/lib/design/print-formats';
import { DEFAULT_FORMAT, getFormat } from '@/lib/design/print-formats';
import type { DesignTemplate } from '@/lib/database/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBillingStatus } from '@/lib/hooks/use-billing-status';
import { FeatureLocked } from '@/components/billing/feature-locked';
import { Loader2, Lock } from 'lucide-react';

export default function TemplatesPage() {
  const { isFeatureLocked, isLoading: billingLoading } = useBillingStatus();
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [currentFormat, setCurrentFormat] = useState<PrintFormat>(DEFAULT_FORMAT);
  const [initialData, setInitialData] = useState<{
    canvasJSON?: string;
    variableMappings?: Record<string, any>;
    format?: PrintFormat;
  } | undefined>(undefined);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0); // Force canvas re-mount on load
  const [organizationId, setOrganizationId] = useState<string>('');
  const router = useRouter();

  // Fetch organization ID on mount
  useEffect(() => {
    async function fetchOrganizationId() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single();

        if (profile) {
          setOrganizationId(profile.organization_id);
        }
      }
    }

    fetchOrganizationId();
  }, []);

  const handleLoadTemplate = async (template: DesignTemplate) => {
    try {
      // Find the corresponding print format
      let format: PrintFormat;
      try {
        format = getFormat(template.format_type);
      } catch {
        // Fallback to default format if format not found
        format = DEFAULT_FORMAT;
        console.warn(`Format ${template.format_type} not found, using default format`);
      }

      // Multi-surface support: Extract from surfaces[0] for current single-surface UI
      // If surfaces array exists, use it; otherwise fall back to canvas_json (old templates)
      const canvasData = template.surfaces && template.surfaces.length > 0
        ? template.surfaces[0].canvas_json
        : template.canvas_json;

      const variableData = template.surfaces && template.surfaces.length > 0
        ? template.surfaces[0].variable_mappings
        : template.variable_mappings;

      // Prepare initial data for canvas
      const loadedData = {
        canvasJSON: JSON.stringify(canvasData),
        variableMappings: variableData,
        format,
      };

      // Update state
      setInitialData(loadedData);
      setCurrentFormat(format);
      setTemplateName(`${template.name} (Copy)`); // Suggest saving as copy
      setTemplateDescription(template.description || '');

      // Force canvas re-mount to load new data
      setCanvasKey(prev => prev + 1);

      toast.success(`Loaded template: ${template.name}`);
    } catch (error) {
      console.error('❌ Failed to load template:', error);
      toast.error('Failed to load template', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleSave = async (data: {
    canvasJSON: string;
    variableMappings: Record<string, any>;
    preview: string;
    format: PrintFormat;
    surfaces?: any[]; // NEW: Multi-surface support (front + back)
  }) => {
    // Block saving for unpaid users - show prominent modal
    if (isFeatureLocked('templates')) {
      setShowUpgradeModal(true);
      return;
    }

    if (!templateName.trim()) {
      toast.error('Please enter a template name in the layers panel');
      return;
    }

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please sign in to save templates');
        router.push('/login');
        return;
      }

      // Get user's organization
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Profile query error:', profileError);
        toast.error(`Profile error: ${profileError.message}`);
        return;
      }

      if (!profile) {
        toast.error('User profile not found');
        return;
      }

      // Try database first, fallback to localStorage
      let savedToDatabase = false;
      let templateId = '';

      try {
        const response = await fetch('/api/design-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organization_id: profile.organization_id,
            created_by: user.id,
            name: templateName,
            description: templateDescription || null,
            // NEW: Send surfaces array (front + back)
            surfaces: data.surfaces,
            // BACKWARDS COMPATIBLE: Old single-canvas fields (fallback)
            canvas_json: JSON.parse(data.canvasJSON),
            canvas_width: data.format.widthPixels,
            canvas_height: data.format.heightPixels,
            variable_mappings: data.variableMappings,
            thumbnail_url: data.preview,
            format_type: data.format.id,
            status: 'active',
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          savedToDatabase = true;
          templateId = result.template.id;
        } else {
          throw new Error(result.error || 'Database save failed');
        }
      } catch (dbError) {
        console.warn('⚠️ Database save failed, using localStorage fallback:', dbError);

        // Save to localStorage as fallback
        const templates = JSON.parse(localStorage.getItem('design_templates') || '[]');
        templateId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const localTemplate = {
          id: templateId,
          name: templateName,
          description: templateDescription || null,
          // NEW: Multi-surface support
          surfaces: data.surfaces,
          // BACKWARDS COMPATIBLE: Old fields
          canvas_json: JSON.parse(data.canvasJSON),
          canvas_width: data.format.widthPixels,
          canvas_height: data.format.heightPixels,
          variable_mappings: data.variableMappings,
          thumbnail_url: data.preview,
          format_type: data.format.id,
          format_name: data.format.name,
          created_at: new Date().toISOString(),
        };

        templates.push(localTemplate);
        localStorage.setItem('design_templates', JSON.stringify(templates));
      }

      if (savedToDatabase) {
        const surfaceInfo = data.surfaces
          ? `${data.surfaces.length} surface${data.surfaces.length > 1 ? 's' : ''} (${data.surfaces.map((s: any) => s.side).join(', ')})`
          : '1 surface (front)';
        toast.success(`Template "${templateName}" saved to database!`, {
          description: `Format: ${data.format.name} • ${surfaceInfo}`,
        });
      } else {
        toast.success(`Template "${templateName}" saved locally!`, {
          description: `Format: ${data.format.name} • Run migrations to enable database storage`,
        });
      }

      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Failed to save template', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Templates are accessible to all users - they can browse and design
  // Saving is blocked in the handleSave function below
  return (
    <div className="fixed inset-0">
      <CanvasEditor
        key={canvasKey}
        format={currentFormat}
        onFormatChange={setCurrentFormat}
        onSave={handleSave}
        initialData={initialData}
        templateName={templateName}
        templateDescription={templateDescription}
        onTemplateNameChange={setTemplateName}
        onTemplateDescriptionChange={setTemplateDescription}
        organizationId={organizationId}
        templateLibraryTrigger={
          <Dialog open={showTemplateLibrary} onOpenChange={setShowTemplateLibrary}>
            <DialogTrigger asChild>
              <button className="trigger" />
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Template Library</DialogTitle>
                <DialogDescription>
                  Browse and load your saved templates
                </DialogDescription>
              </DialogHeader>
              {organizationId ? (
                <TemplateLibrary
                  organizationId={organizationId}
                  onLoadTemplate={handleLoadTemplate}
                  onClose={() => setShowTemplateLibrary(false)}
                />
              ) : (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  Loading organization...
                </div>
              )}
            </DialogContent>
          </Dialog>
        }
        onOpenTemplateLibrary={() => setShowTemplateLibrary(true)}
      />

      {/* Upgrade Modal - Shown when unpaid user tries to save */}
      <AlertDialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                <Lock className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">
              Subscription Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base">
              You need an active subscription to save templates and use them in campaigns.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-600">
                ✓ Save unlimited templates
              </p>
              <p className="text-sm text-slate-600">
                ✓ Use templates in campaigns
              </p>
              <p className="text-sm text-slate-600">
                ✓ Access all platform features
              </p>
            </div>
          </div>
          <AlertDialogFooter className="sm:flex-col sm:space-x-0 gap-2">
            <AlertDialogAction
              onClick={() => {
                setShowUpgradeModal(false);
                router.push('/dashboard');
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
            >
              Complete Payment Now
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => setShowUpgradeModal(false)}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-3"
            >
              Continue Designing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
