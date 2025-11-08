'use client';

import { LayoutGrid, LayoutList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ViewToggleProps {
  view: 'grid' | 'board';
  onViewChange: (view: 'grid' | 'board') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('grid')}
        className={cn(
          'gap-2 px-3',
          view === 'grid' && 'bg-slate-100'
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        Grid
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('board')}
        className={cn(
          'gap-2 px-3',
          view === 'board' && 'bg-slate-100'
        )}
      >
        <LayoutList className="h-4 w-4" />
        Board
      </Button>
    </div>
  );
}
