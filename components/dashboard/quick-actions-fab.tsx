"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  FileText,
  Store,
  Users,
  ShoppingCart,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { QuickStartWizard } from "@/components/campaigns/quick-start-wizard";

/**
 * Quick Actions FAB - Floating Action Button
 *
 * Provides global access to primary actions from any page.
 * Impact: 2 clicks from anywhere to start any action
 *
 * Features:
 * - Fixed bottom-right position
 * - Dropdown menu with quick actions
 * - Keyboard shortcut: Cmd+K
 * - Responsive design
 * - Quick Start Campaign Wizard integration
 */
export function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const router = useRouter();

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd+K: Open FAB menu
      if (cmdKey && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }

      // Escape: Close menu
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const actions = [
    {
      icon: Zap,
      label: 'Quick Start Campaign',
      description: '3-step wizard for rapid setup',
      onClick: () => {
        setOpen(false);
        setShowWizard(true);
      },
      color: 'text-yellow-600',
      highlight: true, // Featured action
    },
    {
      icon: ShoppingCart,
      label: 'New Order',
      description: 'Create campaign order',
      onClick: () => {
        setOpen(false);
        router.push('/campaigns/orders/new');
      },
      color: 'text-purple-600',
    },
    {
      icon: FileText,
      label: 'New Template',
      description: 'Design DM template',
      onClick: () => {
        setOpen(false);
        router.push('/dm-creative/editor');
      },
      color: 'text-orange-600',
    },
    {
      icon: Store,
      label: 'Add Store',
      description: 'Add retail location',
      onClick: () => {
        setOpen(false);
        router.push('/retail/stores?action=add');
      },
      color: 'text-green-600',
    },
    {
      icon: Users,
      label: 'New Store Group',
      description: 'Create store collection',
      onClick: () => {
        setOpen(false);
        router.push('/store-groups?action=create');
      },
      color: 'text-indigo-600',
    },
  ];

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 z-50"
            data-fab-trigger
            aria-label="Quick actions"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 mb-2 mr-2"
          sideOffset={8}
        >
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span>Quick Actions</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {actions.map((action, index) => (
            <div key={index}>
              <DropdownMenuItem
                onClick={action.onClick}
                className={`cursor-pointer py-3 focus:bg-slate-50 ${
                  action.highlight
                    ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-l-2 border-yellow-500'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  <action.icon className={`h-5 w-5 mt-0.5 ${action.color}`} />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 flex items-center gap-2">
                      {action.label}
                      {action.highlight && (
                        <span className="text-[10px] font-semibold bg-yellow-500 text-white px-1.5 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {action.description}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
              {action.highlight && <DropdownMenuSeparator />}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickStartWizard
        open={showWizard}
        onOpenChange={setShowWizard}
      />
    </>
  );
}
