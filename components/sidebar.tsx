"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIndustryModule } from "@/lib/contexts/industry-module-context";
import { FileText, Mail, Phone, Settings, BarChart3, Home, Sparkles, Bell, Store, Target, TrendingUp, Brain, Menu, X, Library, Layers } from "lucide-react";

const navigation = [
  { name: "Home", href: "/", icon: Home, section: "main" },
  { name: "Settings", href: "/settings", icon: Settings, section: "main" },
  { name: "Templates", href: "/templates", icon: Library, section: "create" },
  { name: "Copywriting", href: "/copywriting", icon: FileText, section: "create" },
  { name: "DM Creative", href: "/dm-creative", icon: Mail, section: "create" },
  { name: "Batch Jobs", href: "/batch-jobs", icon: Layers, section: "analyze" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, section: "analyze" },
  { name: "Campaign Matrix", href: "/campaigns/matrix", icon: Sparkles, section: "analyze" },
  { name: "Notifications", href: "/notifications", icon: Bell, section: "analyze" },
  { name: "CC Operations", href: "/cc-operations", icon: Phone, section: "advanced" },
];

const sections = [
  { id: "main", label: "Getting Started" },
  { id: "create", label: "Create" },
  { id: "analyze", label: "Analyze" },
  { id: "advanced", label: "Advanced" },
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
    activeSections.push({ id: "retail", label: "🏪 Retail Module" });
  }

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

          return (
            <div key={section.id} className="mb-6">
              <h3 className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {section.label}
              </h3>
              <div className="space-y-1">
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
                      {item.name}
                    </Link>
                  );
                })}
              </div>
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
