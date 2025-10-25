"use client";

import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface EntityAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

interface EntityHoverActionsProps {
  actions: EntityAction[];
  showOnHover?: boolean;
}

/**
 * EntityHoverActions - Reusable hover actions component
 *
 * Displays action buttons that appear on hover for entity cards.
 * Automatically switches between button layout (≤3 actions) and dropdown menu (>3 actions).
 *
 * Features:
 * - Smooth opacity transition on hover
 * - Event propagation stopped (won't trigger parent card clicks)
 * - Destructive action styling (red color)
 * - Responsive layout
 *
 * Usage:
 * ```tsx
 * <Card className="group">
 *   <EntityHoverActions actions={[
 *     { icon: Edit, label: 'Edit', onClick: () => {} },
 *     { icon: Trash2, label: 'Delete', onClick: () => {}, variant: 'destructive' }
 *   ]} />
 * </Card>
 * ```
 */
export function EntityHoverActions({
  actions,
  showOnHover = true,
}: EntityHoverActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  if (actions.length <= 3) {
    // Show all actions as inline buttons
    return (
      <div
        className={`flex gap-2 ${
          showOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : ''
        }`}
      >
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant === 'destructive' ? 'destructive' : 'ghost'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="gap-2"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>
    );
  }

  // Show dropdown menu for many actions
  return (
    <div
      className={`${
        showOnHover ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-200' : ''
      }`}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
