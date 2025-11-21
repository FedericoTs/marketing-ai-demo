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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
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

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/landing-pages" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/campaigns" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
              <li><Link href="/templates" className="hover:text-white transition-colors">Templates</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
          <p>© 2025 DropLab. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-white transition-colors">LinkedIn</Link>
            <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
