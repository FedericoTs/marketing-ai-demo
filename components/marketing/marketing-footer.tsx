/**
 * Marketing Footer Component
 *
 * Footer for public marketing pages.
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

import Link from 'next/link';

export function MarketingFooter() {
  return (
    <footer className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          {/* Brand */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
              <img
                src="/images/logo_icon_tbg.png"
                alt="DropLab"
                className="h-6 w-auto object-contain brightness-0 invert"
              />
              <span className="text-xl font-bold">DropLab</span>
            </div>
            <p className="text-slate-400 text-sm">
              Offline marketing with online attribution.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 text-sm text-slate-400 justify-center">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
            <Link href="#demo" className="hover:text-white transition-colors">Demo</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
          <p>© 2025 DropLab. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
