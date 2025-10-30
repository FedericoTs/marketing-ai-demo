"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIndustryModule } from "@/lib/contexts/industry-module-context";
import {
  FileText, Mail, Phone, Settings, BarChart3, Home, Sparkles, Bell,
  Store, Target, TrendingUp, Brain, Menu, X, Library, Layers,
  ShoppingCart, Users, Plus, ChevronDown, ChevronRight, LayoutDashboard
} from "lucide-react";

// DropLab Direct Mail Platform - Simplified Navigation (Phase 1-2)
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home, section: "main" },
  { name: "Design Templates", href: "/templates", icon: Library, section: "main", badge: "NEW" },
  { name: "Settings", href: "/settings", icon: Settings, section: "main" },
];

const sections = [
  { id: "main", label: "", collapsible: false },
];

// Retail module navigation items (conditionally shown)
const retailNavigation = [
  { name: "Stores", href: "/retail/stores", icon: Store, section: "retail", requiresFeature: "enableMultiStore" },
  { name: "Deployments", href: "/retail/deployments", icon: Target, section: "retail", requiresFeature: "enableMultiStore" },
  { name: "Performance", href: "/retail/performance", icon: TrendingUp, section: "retail", requiresFeature: "enableMultiStore" },
  { name: "AI Insights", href: "/retail/insights", icon: Brain, section: "retail", requiresFeature: "enableAIRecommendations" },
];

export function Sidebar() {
  const pathname = usePathname();
  const industryModule = useIndustryModule();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Build navigation items based on active modules
  const allNavigation = [...navigation];

  // Add retail navigation if module is enabled
  if (industryModule.isModuleEnabled() && industryModule.getModuleType() === 'retail') {
    const enabledRetailItems = retailNavigation.filter(item => {
      if (item.requiresFeature) {
        return industryModule.isFeatureEnabled(item.requiresFeature);
      }
      return true;
    });
    allNavigation.push(...enabledRetailItems);
  }

  // Build sections array (add retail section if module is active)
  const activeSections = [...sections];
  if (industryModule.isModuleEnabled() && industryModule.getModuleType() === 'retail') {
    activeSections.push({ id: "retail", label: "Retail Module", collapsible: true });
  }

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
    const currentItem = allNavigation.find(item => item.href === pathname);
    if (currentItem && collapsedSections.has(currentItem.section)) {
      setCollapsedSections(prev => {
        const next = new Set(prev);
        next.delete(currentItem.section);
        return next;
      });
    }
  }, [pathname]);

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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg hover:bg-slate-800 transition-colors"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r bg-slate-50 transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <img
            src="/images/logo_icon_tbg.png"
            alt="DropLab"
            className="h-6 w-auto object-contain"
          />
          <h1 className="text-xl font-bold text-slate-900">DropLab</h1>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {activeSections.map((section) => {
          const sectionItems = allNavigation.filter((item) => item.section === section.id);
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
      <div className="border-t p-4">
        <p className="text-xs text-slate-500">
          DropLab Platform
        </p>
      </div>
    </div>
    </>
  );
}
