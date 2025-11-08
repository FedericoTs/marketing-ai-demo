'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown, Clock, Calendar, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  {
    value: 'draft',
    label: 'Draft',
    icon: Clock,
    color: 'text-slate-600',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    icon: Calendar,
    color: 'text-blue-600',
  },
  {
    value: 'sending',
    label: 'In Progress',
    icon: Send,
    color: 'text-orange-600',
  },
  {
    value: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'text-green-600',
  },
  {
    value: 'failed',
    label: 'Issues',
    icon: AlertCircle,
    color: 'text-red-600',
  },
];

interface CampaignStatusMenuProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  disabled?: boolean;
}

export function CampaignStatusMenu({
  currentStatus,
  onStatusChange,
  disabled,
}: CampaignStatusMenuProps) {
  const current = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-7 gap-1.5 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <CurrentIcon className={cn('h-3 w-3', current.color)} />
          <span>{current.label}</span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {STATUS_OPTIONS.map((status) => {
          const Icon = status.icon;
          return (
            <DropdownMenuItem
              key={status.value}
              onClick={(e) => {
                e.stopPropagation();
                if (status.value !== currentStatus) {
                  onStatusChange(status.value);
                }
              }}
              disabled={status.value === currentStatus}
            >
              <Icon className={cn('h-4 w-4 mr-2', status.color)} />
              <span>{status.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
