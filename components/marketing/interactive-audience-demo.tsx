/**
 * Interactive Audience Builder Demo
 *
 * Dynamic filter builder with real-time calculations
 * Phase 9.2.15 - Landing Page Enhancement
 */

'use client';

import { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp } from 'lucide-react';

interface Filter {
  id: string;
  label: string;
  color: string;
  impact: number; // multiplier effect on reach
  active: boolean;
}

export function InteractiveAudienceDemo() {
  const [filters, setFilters] = useState<Filter[]>([
    { id: 'age', label: 'Age: 35-65', color: 'bg-indigo-500', impact: 1.0, active: true },
    { id: 'income', label: 'Income: $75K+', color: 'bg-purple-500', impact: 0.6, active: true },
    { id: 'location', label: 'California', color: 'bg-blue-500', impact: 0.4, active: true },
    { id: 'homeowners', label: 'Homeowners', color: 'bg-green-500', impact: 0.7, active: true },
    { id: 'interests', label: 'Tech Enthusiasts', color: 'bg-orange-500', impact: 0.5, active: false },
    { id: 'married', label: 'Married w/ Kids', color: 'bg-pink-500', impact: 0.6, active: false },
  ]);

  const [animatedReach, setAnimatedReach] = useState(0);
  const [animatedCost, setAnimatedCost] = useState(0);

  // Calculate reach based on active filters
  const baseReach = 250000;
  const costPerContact = 0.12;

  const calculateReach = () => {
    const activeFilters = filters.filter(f => f.active);
    if (activeFilters.length === 0) return baseReach;

    let multiplier = 1;
    activeFilters.forEach(f => {
      multiplier *= f.impact;
    });

    return Math.floor(baseReach * multiplier);
  };

  const targetReach = calculateReach();
  const targetCost = targetReach * costPerContact;

  // Animate numbers
  useEffect(() => {
    const duration = 800;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3); // Easing function

      setAnimatedReach(Math.floor(targetReach * easeOut));
      setAnimatedCost(targetCost * easeOut);

      if (currentStep >= steps) {
        clearInterval(interval);
        setAnimatedReach(targetReach);
        setAnimatedCost(targetCost);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [targetReach, targetCost]);

  const toggleFilter = (id: string) => {
    setFilters(prev =>
      prev.map(f => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Build Your Audience
        </h4>
        <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
          👆 Click filters below
        </div>
      </div>

      {/* Interactive Filters */}
      <div className="space-y-2">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Active Filters</p>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => toggleFilter(filter.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all transform hover:scale-105 ${
                filter.active
                  ? `${filter.color} text-white shadow-md`
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${filter.active ? 'bg-white' : 'bg-slate-400'}`}></div>
              <span>{filter.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Live Results */}
      <div className="pt-3 border-t space-y-3">
        {/* Estimated Reach */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Estimated Reach:
          </span>
          <span className="text-3xl font-bold text-indigo-600 tabular-nums">
            {animatedReach.toLocaleString()}
          </span>
        </div>

        {/* Cost Calculation */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Cost per contact:
            </span>
            <span className="text-xs font-semibold text-slate-900">${costPerContact.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Total Campaign Cost:</span>
            <span className="text-xl font-bold text-indigo-600 tabular-nums">
              ${animatedCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Active Filters Count */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-semibold text-green-900">
              {filters.filter(f => f.active).length} filters active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
