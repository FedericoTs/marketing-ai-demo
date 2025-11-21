"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings, Home, Menu, X, Library, Target, Shield, LogOut, Send, ChevronRight, ChevronDown, BarChart3, Users
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// DropLab Direct Mail Platform - Simplified Navigation (Phase 1-2)
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, section: "main" },
  { name: "Design Templates", href: "/templates", icon: Library, section: "main" },
  { name: "Audiences", href: "/audiences", icon: Target, section: "main" },
  { name: "Campaigns", href: "/campaigns", icon: Send, section: "main" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, section: "main" },
  { name: "Team", href: "/team", icon: Users, section: "main" },
  { name: "Admin", href: "/admin", icon: Shield, section: "main", adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, section: "main" },
];

const sections = [
  { id: "main", label: "", collapsible: false },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  hideButton?: boolean;
  alwaysCollapsible?: boolean; // If true, sidebar is hidden on all screen sizes unless opened
  showCloseButton?: boolean; // If true, show X button inside sidebar
}

export function Sidebar({ isOpen, onClose, hideButton = false, alwaysCollapsible = false, showCloseButton = false }: SidebarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isMobileMenuOpen = isOpen !== undefined ? isOpen : internalMenuOpen;
  const setIsMobileMenuOpen = onClose ? () => onClose() : setInternalMenuOpen;

  // Load collapsed sections from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('collapsedSections');
    if (saved) {
      try {
        setCollapsedSections(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to parse collapsed sections:', e);
      }
    }
  }, []);

  // Save collapsed sections to localStorage
  useEffect(() => {
    localStorage.setItem('collapsedSections', JSON.stringify(Array.from(collapsedSections)));
  }, [collapsedSections]);

  // Auto-expand section containing current page
  useEffect(() => {
    const currentItem = navigation.find(item => item.href === pathname);
    if (currentItem && collapsedSections.has(currentItem.section)) {
      setCollapsedSections(prev => {
        const next = new Set(prev);
        next.delete(currentItem.section);
        return next;
      });
    }
  }, [pathname]);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch('/api/auth/check-admin');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (error) {
        console.error('Failed to check admin status in sidebar:', error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, []);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const closeMobileMenu = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalMenuOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button - Hidden when externally controlled */}
      {!hideButton && (
        <button
          onClick={() => {
            if (isOpen === undefined) {
              setInternalMenuOpen(!internalMenuOpen);
            } else if (onClose) {
              onClose();
            }
          }}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-slate-50 transition-transform duration-300 ease-in-out",
        !alwaysCollapsible && "lg:static",
        isMobileMenuOpen ? "translate-x-0" : alwaysCollapsible ? "-translate-x-full" : "-translate-x-full lg:translate-x-0"
      )}>
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <img
            src="/images/logo_icon_tbg.png"
            alt="DropLab"
            className="h-6 w-auto object-contain"
          />
          <h1 className="text-xl font-bold text-slate-900">DropLab</h1>
        </div>
        {/* Close button - only shown when showCloseButton is true */}
        {showCloseButton && (
          <button
            onClick={closeMobileMenu}
            className="h-8 w-8 rounded-lg hover:bg-slate-200 flex items-center justify-center transition-colors"
            title="Close menu"
          >
            <X className="h-5 w-5 text-slate-700" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map((section) => {
          const sectionItems = navigation.filter((item) => {
            // Filter by section
            if (item.section !== section.id) return false;

            // Filter out admin-only items if user is not admin
            if ((item as any).adminOnly && !isAdmin) return false;

            return true;
          });
          if (sectionItems.length === 0) return null;

          const isCollapsed = collapsedSections.has(section.id);
          const isCollapsible = section.collapsible !== false;

          return (
            <div key={section.id} className="mb-4">
              {isCollapsible ? (
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:bg-slate-100 rounded transition-colors"
                >
                  <span>{section.label}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  ) : (
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  )}
                </button>
              ) : (
                <h3 className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {section.label}
                </h3>
              )}
              {!isCollapsed && (
                <div className="space-y-1 mt-1">
                  {sectionItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={closeMobileMenu}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-900 text-white"
                            : "text-slate-700 hover:bg-slate-200"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.name}</span>
                        {(item as any).badge && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded-full">
                            {(item as any).badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="border-t p-3">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isLoggingOut
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "text-slate-700 hover:bg-red-50 hover:text-red-600"
          )}
        >
          <LogOut className="h-5 w-5" />
          <span>{isLoggingOut ? "Logging out..." : "Logout"}</span>
        </button>
        <p className="text-xs text-slate-500 mt-3 px-3">
          DropLab Platform
        </p>
      </div>
    </div>
    </>
  );
}
