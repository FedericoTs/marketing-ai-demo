/**
 * How It Works Component
 *
 * 3-step visual flow showing the process:
 * 1. Design - Choose template or start from scratch
 * 2. Personalize - Upload contacts, AI personalizes
 * 3. Send & Track - Print, ship, track in real-time
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

import { Palette, Users, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Palette,
    title: 'Design',
    description: 'Choose a template or start from scratch. AI suggests copy and layouts that convert.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    number: '02',
    icon: Users,
    title: 'Personalize',
    description: 'Upload your contacts. AI personalizes every piece with names, offers, and QR codes.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Send & Track',
    description: 'We print and ship. You track scans, clicks, and conversions in real-time.',
    gradient: 'from-orange-500 to-red-500',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-base font-semibold text-indigo-600 mb-2 uppercase tracking-wide">
            Simple Process
          </h2>
          <p className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            From Design to Attribution<br />in Three Steps
          </p>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            No technical skills required. No minimum order. Start tracking offline marketing in minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting Line (desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-orange-200 -translate-y-1/2 -z-10" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Step Card */}
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-indigo-100">
                    {/* Number Badge */}
                    <div className="absolute -top-4 -left-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {step.number}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="mb-6 mt-4">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${step.gradient}`}>
                        <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow (mobile) */}
                  {index < steps.length - 1 && (
                    <div className="flex justify-center my-6 md:hidden">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-slate-600 mb-4">
            Ready to see it in action?
          </p>
          <button className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all">
            Try Interactive Demo
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
