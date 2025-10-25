"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

/**
 * Breadcrumbs - Smart navigation breadcrumb trail
 * Part of Improvement #6: Smart Navigation Breadcrumbs
 *
 * Provides context-aware breadcrumb navigation showing the current page hierarchy.
 * Helps users understand their location and navigate back easily.
 *
 * Features:
 * - Auto-generates breadcrumbs from current pathname
 * - Readable labels for all routes
 * - Abbreviated IDs for long identifiers
 * - Home icon for dashboard
 * - Last segment is non-clickable and bold
 * - Mobile responsive (horizontal scroll)
 *
 * Usage:
 * ```tsx
 * <Breadcrumbs />
 * ```
 *
 * Example output:
 * Home / Campaigns / Orders / ORD-2025-10-001
 */
export function Breadcrumbs() {
  const pathname = usePathname();

  const segments = generateBreadcrumbs(pathname);

  // Don't show breadcrumbs on homepage or if no segments
  if (segments.length === 0 || pathname === '/') {
    return null;
  }

  return (
    <nav
      className="flex items-center text-sm text-slate-600 mb-6 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        className="hover:text-slate-900 transition-colors flex items-center gap-1 flex-shrink-0"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {segments.map((segment, index) => (
        <Fragment key={segment.href}>
          <ChevronRight className="h-4 w-4 mx-2 text-slate-400 flex-shrink-0" />

          {index === segments.length - 1 ? (
            // Last segment: non-clickable, bold
            <span className="font-medium text-slate-900 flex-shrink-0">
              {segment.label}
            </span>
          ) : (
            // Clickable segments
            <Link
              href={segment.href}
              className="hover:text-slate-900 transition-colors flex-shrink-0"
            >
              {segment.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/**
 * Generate breadcrumb segments from pathname
 */
function generateBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [];
  const parts = pathname.split('/').filter(Boolean);

  let currentPath = '';

  // Route mapping for readable labels
  const routeLabels: Record<string, string> = {
    // Main sections
    'copywriting': 'Copywriting',
    'dm-creative': 'DM Creative',
    'editor': 'Editor',
    'analytics': 'Analytics',
    'campaigns': 'Campaigns',
    'orders': 'Orders',
    'retail': 'Retail',
    'stores': 'Stores',
    'store-groups': 'Store Groups',
    'settings': 'Settings',

    // Actions
    'new': 'New',
    'edit': 'Edit',
    'duplicate': 'Duplicate',

    // Detail pages
    'details': 'Details',
    'templates': 'Templates',
    'landing-pages': 'Landing Pages',
    'assets': 'Assets',
  };

  parts.forEach((part, index) => {
    currentPath += `/${part}`;

    // Check if this is an ID (nanoid pattern: 16 chars, or ORD- pattern, or other ID patterns)
    const isId = part.length === 16 || part.startsWith('ORD-') || part.startsWith('STR-');

    if (isId) {
      // For order numbers, show full ID
      if (part.startsWith('ORD-')) {
        segments.push({
          label: part,
          href: currentPath,
        });
      } else if (part.startsWith('STR-')) {
        // Store numbers
        segments.push({
          label: part,
          href: currentPath,
        });
      } else {
        // For other IDs (nanoid), show abbreviated form
        segments.push({
          label: `...${part.slice(-6)}`,
          href: currentPath,
        });
      }
    } else {
      // For route segments, use mapped label or capitalize
      segments.push({
        label: routeLabels[part] || capitalize(part),
        href: currentPath,
      });
    }
  });

  return segments;
}

/**
 * Capitalize and format string for display
 */
function capitalize(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
