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

export default function TemplatesPage() {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [currentFormat, setCurrentFormat] = useState<PrintFormat>(DEFAULT_FORMAT);
  const [initialData, setInitialData] = useState<{
    canvasJSON?: string;
    variableMappings?: Record<string, any>;
    format?: PrintFormat;
  } | undefined>(undefined);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
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
    console.log('📂 Loading template:', template.name);

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

      // Prepare initial data for canvas
      const loadedData = {
        canvasJSON: JSON.stringify(template.canvas_json),
        variableMappings: template.variable_mappings,
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

      console.log('✅ Template loaded successfully');
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
  }) => {
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

      console.log('💾 Saving template:', {
        name: templateName,
        format: data.format.name,
        organization: profile.organization_id,
      });

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
          console.log('✅ Template saved to database:', templateId);
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

        console.log('✅ Template saved to localStorage:', templateId);
      }

      if (savedToDatabase) {
        toast.success(`Template "${templateName}" saved to database!`, {
          description: `Format: ${data.format.name}`,
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
    </div>
  );
}
