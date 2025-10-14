"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FileText, Mail, Phone, Settings } from "lucide-react";

const navigation = [
  { name: "Copywriting", href: "/copywriting", icon: FileText },
  { name: "DM Creative", href: "/dm-creative", icon: Mail },
  { name: "CC Operations", href: "/cc-operations", icon: Phone },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-slate-50">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-slate-900">AI Marketing</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
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
      </nav>
      <div className="border-t p-4">
        <p className="text-xs text-slate-500">
          AI Marketing Platform Demo
        </p>
      </div>
    </div>
  );
}
