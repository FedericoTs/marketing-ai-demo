/**
 * Social Proof Component
 *
 * Customer logos, testimonials, and trust indicators.
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

export function SocialProof() {
  return (
    <section className="py-16 bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Trusted by marketers at
          </p>
        </div>

        {/* Logo Grid (Placeholder) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center justify-items-center opacity-50">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-32 h-12 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs font-semibold"
            >
              LOGO {i}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-slate-900 mb-2">500+</div>
            <div className="text-slate-600">Marketing Teams</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-slate-900 mb-2">2M+</div>
            <div className="text-slate-600">Postcards Tracked</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-slate-900 mb-2">340%</div>
            <div className="text-slate-600">Avg Response Rate Increase</div>
          </div>
        </div>
      </div>
    </section>
  );
}
