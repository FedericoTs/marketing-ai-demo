'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Search, CheckCircle2 } from 'lucide-react';
import type { DesignTemplate } from '@/lib/database/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Step1TemplateProps {
  selectedTemplate: DesignTemplate | null;
  onTemplateSelect: (template: DesignTemplate) => void;
  onNext: () => void;
}

export function Step1Template({ selectedTemplate, onTemplateSelect, onNext }: Step1TemplateProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // 4 columns × 3 rows

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('design_templates')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as DesignTemplate[]) || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTemplates = filteredTemplates.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Choose Your Template</h2>
        <p className="text-slate-600 mt-2">
          Select a design template to personalize for your campaign
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-600 text-center">
              {searchQuery ? 'No templates match your search' : 'No templates found. Create one first in the Templates page.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Templates Grid - 4 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedTemplates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <Card
                key={template.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg relative overflow-hidden',
                  isSelected && 'ring-4 ring-blue-500 shadow-xl'
                )}
                onClick={() => onTemplateSelect(template)}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}

                {/* Thumbnail - Compact aspect ratio */}
                <div className="relative aspect-[4/3] bg-slate-100 rounded-t-lg overflow-hidden">
                  {template.thumbnail_url ? (
                    <Image
                      src={template.thumbnail_url}
                      alt={template.name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                </div>

                {/* Content - More compact */}
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm text-slate-900 truncate">{template.name}</h3>
                  {template.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{template.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {template.format_type.replace('_', ' ')}
                    </span>
                    {Object.keys(template.variable_mappings || {}).length > 0 && (
                      <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        {Object.keys(template.variable_mappings).length} vars
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-slate-600">
                Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredTemplates.length)} of {filteredTemplates.length} templates
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-8 h-8 p-0',
                        currentPage === page && 'bg-blue-600 hover:bg-blue-700'
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-6 border-t">
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          size="lg"
          className="min-w-[200px]"
        >
          Continue to Audience Selection
          <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
}
