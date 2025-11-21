/**
 * Demo Form Component
 *
 * Email capture form for interactive demo experience.
 * Triggers demo postcard generation and email delivery.
 *
 * Phase 9.2.15 - Public Marketing Landing Page
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Check } from 'lucide-react';

export function DemoForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/demo/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit demo request');
      }

      setSuccess(true);
      setName('');
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 text-center border-2 border-green-200">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500 mb-4">
          <Check className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          Check Your Inbox!
        </h3>
        <p className="text-slate-600 mb-4">
          Your demo postcard is on its way. Scan the QR code to see the magic.
        </p>
        <Button
          variant="outline"
          onClick={() => setSuccess(false)}
        >
          Send Another Demo
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-200" suppressHydrationWarning>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 mb-4">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          Try DropLab Free
        </h3>
        <p className="text-slate-600">
          We'll send you a simulated postcard via email.<br />
          Scan the QR code to see the attribution magic.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-12"
          />
        </div>

        <div>
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Sending...
            </>
          ) : (
            'Send My Demo Postcard →'
          )}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>No credit card required</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span>Delivered instantly</span>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-slate-500">
        <strong>500+</strong> demos sent this week
      </div>
    </div>
  );
}
