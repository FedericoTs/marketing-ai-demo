'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './kanban-card';
import type { Campaign } from '@/lib/database/types';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: string;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  campaigns: Campaign[];
  onCampaignClick: (campaignId: string) => void;
}

export function KanbanColumn({
  status,
  label,
  icon: Icon,
  colorClass,
  campaigns,
  onCampaignClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div className="flex flex-col flex-1 min-w-0">
      {/* Column Header */}
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-sm text-slate-700">{label}</h3>
        </div>
        <div className={cn(
          'flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-medium',
          colorClass
        )}>
          {campaigns.length}
        </div>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[300px] bg-slate-50 rounded-lg p-2 transition-colors',
          isOver && 'bg-blue-50 ring-2 ring-blue-300'
        )}
      >
        <SortableContext
          items={campaigns.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No campaigns</p>
            </div>
          ) : (
            campaigns.map((campaign) => (
              <KanbanCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => onCampaignClick(campaign.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
