/**
 * Terms of Service Page
 *
 * Legal terms of service for DropLab platform
 * Phase 9.2.15 - Marketing Homepage Completion
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MarketingFooter } from '@/components/marketing/marketing-footer';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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

      {/* Terms of Service Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">Terms of Service</h1>
        <p className="text-slate-600 mb-8">Last updated: November 22, 2025</p>

        <div className="prose prose-slate max-w-none">
          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="text-slate-600 mb-4">
            By accessing or using DropLab's marketing automation platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Description of Service</h2>
          <p className="text-slate-600 mb-4">
            DropLab provides an AI-powered marketing automation platform that enables users to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Create personalized direct mail campaigns with AI-generated content</li>
            <li>Target audiences using Data Axle's 250M+ contact database</li>
            <li>Track campaign performance through QR codes and landing pages</li>
            <li>Automate fulfillment through PostGrid integration</li>
            <li>Generate AI-powered copywriting and designs</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Account Registration</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.1 Eligibility</h3>
          <p className="text-slate-600 mb-4">
            You must be at least 18 years old and have the legal capacity to enter into binding contracts to use our Service.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">3.2 Account Security</h3>
          <p className="text-slate-600 mb-4">
            You are responsible for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Subscription and Billing</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.1 Pricing</h3>
          <p className="text-slate-600 mb-4">
            Subscription fees are charged monthly or annually based on your selected plan:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li><strong>Starter:</strong> $49/month - 500 pieces/month, basic features</li>
            <li><strong>Professional:</strong> $199/month - 5,000 pieces/month, advanced features</li>
            <li><strong>Enterprise:</strong> Custom pricing - unlimited campaigns, dedicated support</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.2 Usage-Based Charges</h3>
          <p className="text-slate-600 mb-4">
            Additional charges apply for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Direct mail printing and postage ($0.75 - $2.50 per piece)</li>
            <li>Data Axle audience list purchases ($0.12 per contact)</li>
            <li>AI-generated images ($0.048 per image via DALL-E)</li>
            <li>Voice AI calls ($0.15 - $0.50 per minute)</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.3 Payment Terms</h3>
          <p className="text-slate-600 mb-4">
            Payments are processed via Stripe. You authorize us to charge your payment method for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Recurring subscription fees (auto-renewal)</li>
            <li>Usage-based charges at the end of each billing cycle</li>
            <li>Any applicable taxes</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">4.4 Refunds</h3>
          <p className="text-slate-600 mb-4">
            Subscription fees are non-refundable. Usage-based charges (printing, postage) are non-refundable once campaigns are submitted to fulfillment partners.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Acceptable Use Policy</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.1 Permitted Use</h3>
          <p className="text-slate-600 mb-4">
            You may use the Service for lawful business marketing purposes only.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">5.2 Prohibited Activities</h3>
          <p className="text-slate-600 mb-4">
            You may NOT use the Service to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Send spam, unsolicited commercial messages, or misleading content</li>
            <li>Violate CAN-SPAM Act, GDPR, or other marketing regulations</li>
            <li>Promote illegal products, services, or activities</li>
            <li>Infringe intellectual property rights</li>
            <li>Distribute malware, viruses, or harmful code</li>
            <li>Scrape or harvest data without authorization</li>
            <li>Impersonate others or create fraudulent campaigns</li>
            <li>Bypass rate limits or security measures</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Content and Intellectual Property</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.1 Your Content</h3>
          <p className="text-slate-600 mb-4">
            You retain ownership of content you upload (recipient lists, marketing copy, images). By using the Service, you grant us a license to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Process and store your content to provide the Service</li>
            <li>Use AI to generate designs and copy based on your input</li>
            <li>Display your content to you and your authorized users</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.2 AI-Generated Content</h3>
          <p className="text-slate-600 mb-4">
            AI-generated content (copy, images, designs) created using our platform is owned by you. You are responsible for reviewing and ensuring accuracy before use.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">6.3 Platform Ownership</h3>
          <p className="text-slate-600 mb-4">
            DropLab and our licensors own all rights to the Service, including software, algorithms, design, and branding.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">7. Marketing Compliance</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">7.1 Your Responsibilities</h3>
          <p className="text-slate-600 mb-4">
            As a user of our platform, you are responsible for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Obtaining proper consent from recipients before sending direct mail</li>
            <li>Complying with CAN-SPAM Act, TCPA, GDPR, and other applicable laws</li>
            <li>Providing accurate sender information (company name, address)</li>
            <li>Honoring opt-out requests within legal timeframes</li>
            <li>Maintaining your own suppression/do-not-contact lists</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">7.2 Compliance Tools</h3>
          <p className="text-slate-600 mb-4">
            We provide tools to help you comply, but ultimate responsibility rests with you.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Campaign Fulfillment</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">8.1 Print and Mail Services</h3>
          <p className="text-slate-600 mb-4">
            Direct mail fulfillment is provided by PostGrid. By using our Service, you agree to PostGrid's terms and conditions.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">8.2 Delivery Times</h3>
          <p className="text-slate-600 mb-4">
            Estimated delivery times:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Processing: 1-2 business days after campaign submission</li>
            <li>First Class Mail: 3-5 business days after processing</li>
            <li>Standard Mail: 7-10 business days after processing</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">8.3 No Guarantees</h3>
          <p className="text-slate-600 mb-4">
            We do not guarantee delivery success. Factors beyond our control (incorrect addresses, postal service delays) may affect delivery.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">9. Data and Privacy</h2>
          <p className="text-slate-600 mb-4">
            Your use of the Service is also governed by our <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>. We collect and process data as described in the Privacy Policy.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Warranties and Disclaimers</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">10.1 Service "As-Is"</h3>
          <p className="text-slate-600 mb-4">
            THE SERVICE IS PROVIDED "AS-IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Uninterrupted or error-free operation</li>
            <li>Specific campaign results or response rates</li>
            <li>AI-generated content accuracy</li>
            <li>Third-party API availability (OpenAI, ElevenLabs, PostGrid)</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">10.2 AI Content Disclaimer</h3>
          <p className="text-slate-600 mb-4">
            AI-generated content may contain errors or biases. You are responsible for reviewing and approving all content before use.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Limitation of Liability</h2>
          <p className="text-slate-600 mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>We are not liable for indirect, incidental, or consequential damages</li>
            <li>Our total liability is limited to the amount you paid in the last 12 months</li>
            <li>We are not liable for third-party service failures (PostGrid, Data Axle, etc.)</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">12. Indemnification</h2>
          <p className="text-slate-600 mb-4">
            You agree to indemnify DropLab from claims arising from:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Your violation of these Terms</li>
            <li>Your marketing campaigns (content, compliance, legality)</li>
            <li>Your violation of third-party rights</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">13. Termination</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.1 By You</h3>
          <p className="text-slate-600 mb-4">
            You may cancel your subscription at any time. Access continues until the end of the current billing period.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">13.2 By Us</h3>
          <p className="text-slate-600 mb-4">
            We may suspend or terminate your account for:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-600">
            <li>Violation of these Terms</li>
            <li>Non-payment</li>
            <li>Suspected fraud or abuse</li>
            <li>Legal or regulatory requirements</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">14. Changes to Terms</h2>
          <p className="text-slate-600 mb-4">
            We may modify these Terms at any time. We will notify you of significant changes via email or platform notification. Continued use after changes indicates acceptance.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">15. Dispute Resolution</h2>
          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">15.1 Governing Law</h3>
          <p className="text-slate-600 mb-4">
            These Terms are governed by the laws of the State of California, USA, without regard to conflict of law principles.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">15.2 Arbitration</h3>
          <p className="text-slate-600 mb-4">
            Any disputes will be resolved through binding arbitration in San Francisco, CA, rather than in court.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">16. Contact Information</h2>
          <p className="text-slate-600 mb-4">
            For questions about these Terms, contact us:
          </p>
          <ul className="list-none mb-4 text-slate-600">
            <li><strong>Email:</strong> legal@droplab.com</li>
            <li><strong>Address:</strong> DropLab Inc., 123 Market St, San Francisco, CA 94103</li>
            <li><strong>Support:</strong> support@droplab.com</li>
          </ul>

          <div className="mt-12 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-slate-600">
              <strong>Effective Date:</strong> November 22, 2025<br />
              <strong>Version:</strong> 1.0<br />
              <strong>Previous Versions:</strong> None (initial release)
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}
