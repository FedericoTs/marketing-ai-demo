'use client';

import { useState } from 'react';
import { CanvasEditor } from '@/components/design/canvas-editor';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function TemplatesPage() {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const router = useRouter();

  const handleSave = async (data: {
    canvasJSON: string;
    variableMappings: Record<string, any>;
    preview: string;
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
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        toast.error('User profile not found');
        return;
      }

      // Save template to database
      const { error } = await supabase
        .from('design_templates')
        .insert({
          organization_id: profile.organization_id,
          name: templateName,
          description: templateDescription || null,
          canvas_json: data.canvasJSON,
          variable_mappings: data.variableMappings,
          preview_image_url: data.preview,
          template_type: 'postcard',
          canvas_dimensions: {
            width: 1800,
            height: 1200,
            dpi: 300,
            inches: { width: 6, height: 4 }
          },
          is_public: false,
        });

      if (error) {
        console.error('Save error:', error);
        toast.error('Failed to save template: ' + error.message);
        return;
      }

      toast.success('Template saved to database!');
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('An error occurred while saving');
    }
  };

  return (
    <div className="fixed inset-0">
      <CanvasEditor
        onSave={handleSave}
        templateName={templateName}
        templateDescription={templateDescription}
        onTemplateNameChange={setTemplateName}
        onTemplateDescriptionChange={setTemplateDescription}
      />
    </div>
  );
}
