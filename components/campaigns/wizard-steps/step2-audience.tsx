'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Users, Search, CheckCircle2, Upload, Target } from 'lucide-react';
import type { RecipientList } from '@/lib/database/types';
import { cn } from '@/lib/utils';

interface Step2AudienceProps {
  selectedRecipientList: RecipientList | null;
  audienceSource: 'data_axle' | 'csv' | null;
  onRecipientListSelect: (list: RecipientList) => void;
  onAudienceSourceSelect: (source: 'data_axle' | 'csv') => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Audience({
  selectedRecipientList,
  audienceSource,
  onRecipientListSelect,
  onAudienceSourceSelect,
  onNext,
  onBack,
}: Step2AudienceProps) {
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadRecipientLists();
  }, []);

  async function loadRecipientLists() {
    try {
      // Use API route instead of direct Supabase query to bypass RLS issues
      const response = await fetch('/api/audience/recipient-lists');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          console.log('Not authenticated - showing empty state');
          setRecipientLists([]);
          return;
        }

        console.error('Failed to fetch recipient lists:', errorData);
        throw new Error(errorData.error || 'Failed to fetch recipient lists');
      }

      const data = await response.json();
      setRecipientLists((data.lists as RecipientList[]) || []);
    } catch (error: any) {
      console.error('Failed to load recipient lists:', error?.message || error);
      // Set empty array on error so UI shows "no audiences" state
      setRecipientLists([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredLists = recipientLists.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group lists by source
  const dataAxleLists = filteredLists.filter((list) => list.source === 'data_axle');
  const csvLists = filteredLists.filter((list) => list.source === 'csv' || list.source === 'manual');

  const renderSourceSection = (
    source: 'data_axle' | 'csv',
    lists: RecipientList[],
    icon: React.ComponentType<any>,
    title: string,
    description: string,
    emptyMessage: string
  ) => {
    const Icon = icon;
    const isSourceSelected = audienceSource === source;

    return (
      <div className="space-y-4">
        {/* Source Header */}
        <div
          className={cn(
            'p-4 border-2 rounded-lg cursor-pointer transition-all',
            isSourceSelected
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          )}
          onClick={() => onAudienceSourceSelect(source)}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                isSourceSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600">{description}</p>
            </div>
            {isSourceSelected && (
              <CheckCircle2 className="h-6 w-6 text-blue-600" />
            )}
          </div>
        </div>

        {/* Lists Grid */}
        {isSourceSelected && (
          <div className="pl-4 space-y-3">
            {lists.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-10 w-10 text-slate-400 mb-3" />
                  <p className="text-slate-600 text-center text-sm">
                    {emptyMessage}
                  </p>
                  {source === 'data_axle' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open('/audiences', '_blank')}
                    >
                      Browse Data Axle Audiences
                    </Button>
                  )}
                  {source === 'csv' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open('/audiences', '_blank')}
                    >
                      Upload CSV Audience
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lists.map((list) => {
                  const isSelected = selectedRecipientList?.id === list.id;

                  return (
                    <Card
                      key={list.id}
                      className={cn(
                        'cursor-pointer transition-all hover:shadow-md relative',
                        isSelected && 'ring-2 ring-blue-500 shadow-lg'
                      )}
                      onClick={() => onRecipientListSelect(list)}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 z-10 bg-blue-600 text-white rounded-full p-1 shadow-lg">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}

                      <CardContent className="p-4">
                        <h4 className="font-semibold text-slate-900 truncate pr-8">
                          {list.name}
                        </h4>
                        {list.description && (
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {list.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <div className="flex items-center gap-1 text-sm">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="font-medium text-slate-900">
                              {list.total_recipients.toLocaleString()}
                            </span>
                            <span className="text-slate-500">recipients</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Created {new Date(list.created_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Choose Your Audience</h2>
        <p className="text-slate-600 mt-2">
          Select a recipient list for your campaign
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search recipient lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Data Axle Section */}
          {renderSourceSection(
            'data_axle',
            dataAxleLists,
            Target,
            'Data Axle Audiences',
            'Professional audience targeting with 250M+ verified contacts',
            'No Data Axle audiences yet. Browse and purchase from the Audiences page.'
          )}

          {/* CSV/Manual Section */}
          {renderSourceSection(
            'csv',
            csvLists,
            Upload,
            'Uploaded Audiences',
            'Your custom CSV uploads and manually created lists',
            'No uploaded audiences yet. Upload a CSV from the Audiences page.'
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          onClick={onBack}
          variant="outline"
          size="lg"
        >
          ← Back to Templates
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedRecipientList}
          size="lg"
          className="min-w-[200px]"
        >
          Continue to Variable Mapping
          <span className="ml-2">→</span>
        </Button>
      </div>
    </div>
  );
}
