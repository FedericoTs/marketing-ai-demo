'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, FileText } from 'lucide-react';
import type { Campaign } from '@/lib/database/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  campaign: Campaign;
  onClick: () => void;
}

export function KanbanCard({ campaign, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: campaign.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50'
      )}
    >
      <Card
        className="group cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200 hover:border-slate-300 mb-2"
        onClick={onClick}
      >
        <CardContent className="p-2">
          {/* Campaign Info */}
          <div className="space-y-2">
            {/* Thumbnail */}
            <div className="relative w-full aspect-video bg-gradient-to-br from-slate-100 to-slate-50 rounded overflow-hidden">
              {campaign.template?.thumbnail_url ? (
                <Image
                  src={campaign.template.thumbnail_url}
                  alt={campaign.template.name || 'Template'}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-slate-300" />
                </div>
              )}
            </div>

            {/* Campaign Details */}
            <div className="space-y-1">
              <h4 className="font-medium text-xs text-slate-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                {campaign.name}
              </h4>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-slate-400" />
                  <span>{campaign.total_recipients.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  <span>
                    {new Date(campaign.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
