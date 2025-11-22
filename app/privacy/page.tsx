/**
 * Privacy Policy Page
 *
 * Legal privacy policy for DropLab platform
 * Phase 9.2.15 - Marketing Homepage Completion
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/images/logo_icon_tbg.png"
                alt="DropLab"
                className="h-6 w-auto object-contain"
              />
              <span className="text-xl font-bold text-slate-900">DropLab</span>
            </Link>

            {/* Back to Home */}
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
        <p className="text-slate-600 mb-8">Last updated: November 22, 2025</p>

        <div className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Introduction</h2>
          <p className="text-slate-600 mb-4">
            DropLab ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our marketing automation platform.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Information We Collect</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.1 Information You Provide</h3>
          <p className="text-slate-600 mb-4">
            We collect information that you voluntarily provide when using our platform, including:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Account information (name, email, company details)</li>
            <li>Campaign data (recipient lists, marketing messages, creative assets)</li>
            <li>Payment information (processed securely through third-party providers)</li>
            <li>Communications with our support team</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">2.2 Automatically Collected Information</h3>
          <p className="text-slate-600 mb-4">
            When you use our platform, we automatically collect:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Device information (IP address, browser type, operating system)</li>
            <li>Usage data (pages visited, features used, time spent)</li>
            <li>Campaign performance metrics (QR code scans, landing page visits)</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. How We Use Your Information</h2>
          <p className="text-slate-600 mb-4">We use the collected information to:</p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Provide, maintain, and improve our platform services</li>
            <li>Process your direct mail campaigns and track performance</li>
            <li>Generate AI-powered marketing content and designs</li>
            <li>Communicate with you about your account and campaigns</li>
            <li>Analyze usage patterns to enhance user experience</li>
            <li>Detect and prevent fraud or security threats</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Data Sharing and Disclosure</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.1 Service Providers</h3>
          <p className="text-slate-600 mb-4">
            We share your information with trusted third-party service providers who help us operate our platform:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>OpenAI (AI-powered copywriting and image generation)</li>
            <li>ElevenLabs (voice AI for call center operations)</li>
            <li>PostGrid (direct mail printing and fulfillment)</li>
            <li>Data Axle (audience targeting data)</li>
            <li>Stripe (payment processing)</li>
            <li>Supabase (data storage and authentication)</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.2 Legal Requirements</h3>
          <p className="text-slate-600 mb-4">
            We may disclose your information if required by law, court order, or government regulation.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Data Security</h2>
          <p className="text-slate-600 mb-4">
            We implement industry-standard security measures to protect your data:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>End-to-end encryption for data transmission (HTTPS/TLS)</li>
            <li>Row-Level Security (RLS) for database access control</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Secure API key management and authentication</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Your Rights</h2>
          <p className="text-slate-600 mb-4">
            Depending on your location, you may have the following rights:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
            <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
            <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Campaign Recipient Privacy</h2>
          <p className="text-slate-600 mb-4">
            As a customer using our platform to send direct mail campaigns:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>You are responsible for obtaining consent from your recipients</li>
            <li>You must comply with applicable marketing regulations (CAN-SPAM, GDPR, etc.)</li>
            <li>We provide tools to help you track opt-outs and manage consent</li>
            <li>Recipient data is stored securely and never shared with third parties without your authorization</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Data Retention</h2>
          <p className="text-slate-600 mb-4">
            We retain your data for as long as necessary to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Provide our services (active accounts)</li>
            <li>Comply with legal obligations (7 years for financial records)</li>
            <li>Resolve disputes and enforce agreements</li>
          </ul>
          <p className="text-slate-600 mb-4">
            Campaign analytics data is retained for 3 years. You can request earlier deletion at any time.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Cookies and Tracking</h2>
          <p className="text-slate-600 mb-4">
            We use cookies and similar technologies for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Authentication and session management</li>
            <li>Analytics and performance monitoring</li>
            <li>Personalized user experience</li>
          </ul>
          <p className="text-slate-600 mb-4">
            You can control cookie preferences through your browser settings.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Children's Privacy</h2>
          <p className="text-slate-600 mb-4">
            Our platform is not intended for users under 18. We do not knowingly collect data from children.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. International Data Transfers</h2>
          <p className="text-slate-600 mb-4">
            Your data may be transferred to and processed in countries outside your jurisdiction. We ensure adequate safeguards through:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Standard contractual clauses (EU)</li>
            <li>Privacy Shield certification (where applicable)</li>
            <li>Encryption and security measures</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Changes to This Policy</h2>
          <p className="text-slate-600 mb-4">
            We may update this Privacy Policy periodically. We will notify you of significant changes via email or platform notification. Continued use of our platform after changes indicates acceptance.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Contact Us</h2>
          <p className="text-slate-600 mb-4">
            For privacy-related questions or to exercise your rights, contact us:
          </p>
          <ul className="list-none mb-4 text-slate-600">
            <li><strong>Email:</strong> privacy@droplab.com</li>
            <li><strong>Address:</strong> DropLab Inc., 123 Market St, San Francisco, CA 94103</li>
            <li><strong>Data Protection Officer:</strong> dpo@droplab.com</li>
          </ul>

          <div className="mt-12 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Effective Date:</strong> November 22, 2025<br />
              <strong>Version:</strong> 1.0
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
