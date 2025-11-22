/**
 * FAQ Component
 *
 * Frequently asked questions about DropLab.
 *
 * Phase 9.2.15 - Landing Page Completion
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How does QR code tracking work?',
      answer:
        'Each postcard gets a unique QR code that links to a personalized landing page. When recipients scan the code, we track the interaction in real-time and attribute all subsequent actions (page views, form fills, conversions) back to that specific postcard.',
    },
    {
      question: 'What integrations does DropLab support?',
      answer:
        'DropLab integrates with professional printing services for automated direct mail fulfillment, audience targeting databases with access to millions of verified contacts, AI services for intelligent copywriting and background generation, and secure payment processing. All integrations work seamlessly within the platform.',
    },
    {
      question: 'What kind of analytics do I get?',
      answer:
        'You get comprehensive real-time analytics including: QR scan rates, landing page visits, time on page, engagement metrics, form submissions, conversion tracking, cost per acquisition, and full attribution from mailbox to conversion. All data is available in an interactive dashboard with trend charts and performance insights.',
    },
    {
      question: 'How much does DropLab cost?',
      answer:
        'DropLab costs $499/month with a unique credit system: Your first month grants you $499 in platform credits (essentially free—you pay $499, receive $499 in credits to spend). Every subsequent month, you receive $99 in credits included with your subscription. Use credits for audience purchases, direct mail printing, and campaign features. No credit card required for the free demo.',
    },
    {
      question: 'Do I need to design postcards from scratch?',
      answer:
        'No! DropLab features a professional design editor with a template library, drag-and-drop design tools, and AI-powered background generation. You can customize templates with your branding or create designs from scratch. Our AI also generates personalized copy for each recipient.',
    },
    {
      question: 'How does audience targeting work?',
      answer:
        'DropLab gives you access to millions of verified contacts through our audience database. Use advanced filtering by demographics, location, income, home ownership, and more. Get FREE count previews before purchasing, and our AI recommends optimal audience segments for your campaign goals.',
    },
    {
      question: 'What about printing and fulfillment?',
      answer:
        'DropLab handles everything end-to-end. Design your postcard in our editor, select your audience from our database, and we automatically send it for professional printing and delivery. No need to manage printers, stamps, or logistics—we handle the complete workflow.',
    },
    {
      question: 'Can I track phone calls too?',
      answer:
        'Yes! DropLab includes optional AI-powered phone tracking. Each postcard can have a unique tracking number connected to a conversational AI agent, providing full attribution from postcard → phone call → conversion. Note: Phone tracking and AI Call Center Agents are currently under development.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-slate-600">
            Everything you need to know about DropLab
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-semibold text-slate-900 pr-4">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">{faq.answer}</div>
              )}
            </Card>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 mb-4">Still have questions?</p>
          <a
            href="mailto:support@droplab.app"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Get in touch with our team →
          </a>
        </div>
      </div>
    </section>
  );
}
