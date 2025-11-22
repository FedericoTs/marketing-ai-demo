/**
 * Testimonials Component
 *
 * Customer success stories and reviews.
 *
 * Phase 9.2.15 - Landing Page Completion
 */

import { Star, Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function Testimonials() {
  const testimonials = [
    {
      name: 'Sarah Chen',
      role: 'VP of Marketing',
      company: 'TechFlow Solutions',
      image: '👩‍💼',
      rating: 5,
      quote:
        'DropLab transformed how we measure direct mail ROI. We finally have the same level of attribution as our digital channels. Our board loves the data.',
      metric: '412% ROI increase',
    },
    {
      name: 'Michael Rodriguez',
      role: 'Director of Growth',
      company: 'HealthCare Plus',
      image: '👨‍💼',
      rating: 5,
      quote:
        'The QR code tracking is brilliant. We know exactly which postcards drive conversions. No more guessing with promo codes that nobody uses.',
      metric: '67% response rate',
    },
    {
      name: 'Emily Watson',
      role: 'CMO',
      company: 'RetailHub',
      image: '👩‍💻',
      rating: 5,
      quote:
        'We were spending $50K/month on direct mail with zero attribution. DropLab gave us real-time insights and cut our CAC by 40%.',
      metric: '$120K saved annually',
    },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            Loved by Marketing Teams Everywhere
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            See how companies are using DropLab to finally prove the ROI of their direct mail campaigns.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <Quote className="w-8 h-8 text-indigo-200 mb-4" />

              <p className="text-slate-700 mb-6 leading-relaxed">{testimonial.quote}</p>

              <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
                <div className="text-4xl">{testimonial.image}</div>
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-600">
                    {testimonial.role}, {testimonial.company}
                  </div>
                  <div className="text-sm font-semibold text-indigo-600 mt-1">{testimonial.metric}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-50 border border-green-200 rounded-full">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-green-600 text-green-600" />
              ))}
            </div>
            <span className="text-sm font-semibold text-green-900">
              4.9/5 from 500+ marketing teams
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
