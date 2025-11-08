'use client';

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import type { Campaign } from '@/lib/database/types';
import {
  Clock,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface KanbanBoardProps {
  campaigns: Campaign[];
  onCampaignClick: (campaignId: string) => void;
  onStatusChange: (campaignId: string, newStatus: string) => Promise<void>;
  updatingCampaignId?: string | null;
}

const STATUS_COLUMNS = [
  {
    status: 'draft',
    label: 'Draft',
    icon: Clock,
    colorClass: 'text-slate-600 bg-slate-100',
  },
  {
    status: 'scheduled',
    label: 'Scheduled',
    icon: Calendar,
    colorClass: 'text-blue-600 bg-blue-100',
  },
  {
    status: 'sending',
    label: 'In Progress',
    icon: Send,
    colorClass: 'text-orange-600 bg-orange-100',
  },
  {
    status: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    colorClass: 'text-green-600 bg-green-100',
  },
  {
    status: 'failed',
    label: 'Issues',
    icon: AlertCircle,
    colorClass: 'text-red-600 bg-red-100',
  },
];

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['scheduled'],
  scheduled: ['sending', 'draft'],
  sending: ['completed', 'failed'],
  sent: ['completed', 'failed'],
  paused: ['sending', 'draft'],
  completed: [],
  failed: ['sending', 'draft'],
};

export function KanbanBoard({
  campaigns,
  onCampaignClick,
  onStatusChange,
  updatingCampaignId,
}: KanbanBoardProps) {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  function handleDragStart(event: DragStartEvent) {
    const campaign = campaigns.find((c) => c.id === event.active.id);
    setActiveCampaign(campaign || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setActiveCampaign(null);

    if (!over) return;

    const campaignId = active.id as string;
    const newStatus = over.id as string;

    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    const currentStatus = campaign.status || 'draft';

    // Check if status actually changed
    if (currentStatus === newStatus) return;

    // Validate transition
    const validNextStates = VALID_TRANSITIONS[currentStatus] || [];
    if (!validNextStates.includes(newStatus)) {
      const currentLabel = STATUS_COLUMNS.find((s) => s.status === currentStatus)?.label || currentStatus;
      const newLabel = STATUS_COLUMNS.find((s) => s.status === newStatus)?.label || newStatus;
      toast.error(
        `Cannot move "${campaign.name}" from ${currentLabel} to ${newLabel}`
      );
      return;
    }

    try {
      await onStatusChange(campaignId, newStatus);
      const statusLabel = STATUS_COLUMNS.find((s) => s.status === newStatus)?.label;
      toast.success(`"${campaign.name}" moved to ${statusLabel}`);
    } catch (error) {
      console.error('Failed to update campaign status:', error);
      toast.error(`Failed to update "${campaign.name}"`);
    }
  }

  // Group campaigns by status
  const campaignsByStatus = STATUS_COLUMNS.reduce(
    (acc, { status }) => {
      acc[status] = campaigns.filter((c) => (c.status || 'draft') === status);
      return acc;
    },
    {} as Record<string, Campaign[]>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            icon={column.icon}
            colorClass={column.colorClass}
            campaigns={campaignsByStatus[column.status] || []}
            onCampaignClick={onCampaignClick}
            updatingCampaignId={updatingCampaignId}
          />
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCampaign ? (
          <div className="opacity-90 rotate-3 scale-105">
            <KanbanCard
              campaign={activeCampaign}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
