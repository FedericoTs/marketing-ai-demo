/**
 * Interactive Analytics Demo
 *
 * Animated dashboard with live-updating metrics and charts
 * Phase 9.2.15 - Landing Page Enhancement
 */

'use client';

import { useState, useEffect } from 'react';
import { Mail, TrendingUp, BarChart3, Check, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Metric {
  label: string;
  value: number;
  target: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

export function InteractiveAnalyticsDemo() {
  const [metrics, setMetrics] = useState<Metric[]>([
    { label: 'Sent', value: 0, target: 1247, icon: Mail, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
    { label: 'Scans', value: 0, target: 423, icon: TrendingUp, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { label: 'Response', value: 0, target: 33.9, icon: BarChart3, color: 'text-green-600', bgColor: 'bg-green-50' },
    { label: 'Conversions', value: 0, target: 87, icon: Check, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ]);

  const [chartData, setChartData] = useState([
    { time: 'Day 1', sent: 0, scans: 0, conversions: 0 },
    { time: 'Day 3', sent: 0, scans: 0, conversions: 0 },
    { time: 'Day 5', sent: 0, scans: 0, conversions: 0 },
    { time: 'Day 7', sent: 0, scans: 0, conversions: 0 },
    { time: 'Day 10', sent: 0, scans: 0, conversions: 0 },
    { time: 'Day 14', sent: 0, scans: 0, conversions: 0 },
  ]);

  const [isAnimating, setIsAnimating] = useState(true);

  // Animate metrics counting up
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setMetrics(prev =>
        prev.map(m => ({
          ...m,
          value: m.target * easeOut,
        }))
      );

      if (currentStep >= steps) {
        clearInterval(interval);
        setMetrics(prev =>
          prev.map(m => ({
            ...m,
            value: m.target,
          }))
        );
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, []);

  // Animate chart data - Reveal from left to right
  useEffect(() => {
    const targetData = [
      { time: 'Day 1', sent: 250, scans: 0, conversions: 0 },
      { time: 'Day 3', sent: 780, scans: 142, conversions: 8 },
      { time: 'Day 5', sent: 1050, scans: 268, conversions: 28 },
      { time: 'Day 7', sent: 1180, scans: 351, conversions: 52 },
      { time: 'Day 10', sent: 1235, scans: 401, conversions: 73 },
      { time: 'Day 14', sent: 1247, scans: 423, conversions: 87 },
    ];

    const duration = 2000;
    const totalPoints = targetData.length;
    const delayPerPoint = duration / totalPoints;

    let pointsRevealed = 0;
    setChartData([]); // Start with empty chart

    const interval = setInterval(() => {
      pointsRevealed++;
      setChartData(targetData.slice(0, pointsRevealed));

      if (pointsRevealed >= totalPoints) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, delayPerPoint);

    return () => clearInterval(interval);
  }, []);

  // Periodic pulse effect after initial animation
  useEffect(() => {
    if (isAnimating) return;

    const pulseInterval = setInterval(() => {
      setMetrics(prev =>
        prev.map(m => ({
          ...m,
          value: m.target + (Math.random() - 0.5) * (m.target * 0.02), // ±2% variation
        }))
      );
    }, 3000);

    return () => clearInterval(pulseInterval);
  }, [isAnimating]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b">
        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-green-600" />
          Live Campaign Performance
        </h4>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-semibold text-green-900">Live Data</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const displayValue = metric.label === 'Response'
            ? `${metric.value.toFixed(1)}%`
            : Math.floor(metric.value).toLocaleString();

          return (
            <div key={metric.label} className={`${metric.bgColor} p-3 rounded-lg transition-all hover:scale-105`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${metric.color}`} />
                <span className="text-xs text-slate-600">{metric.label}</span>
              </div>
              <div className={`text-2xl font-bold ${metric.color} tabular-nums`}>
                {displayValue}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attribution Funnel Chart */}
      <div className="pt-2">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Campaign Attribution Funnel</p>
        <div className="h-32 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#fff',
                }}
              />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ r: 3, fill: '#6366f1' }}
                isAnimationActive={false}
                name="Mail Sent"
              />
              <Line
                type="monotone"
                dataKey="scans"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 3, fill: '#8b5cf6' }}
                isAnimationActive={false}
                name="QR Scans"
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 3, fill: '#22c55e' }}
                isAnimationActive={false}
                name="Conversions"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-3 border border-green-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-slate-900">Campaign ROI:</span>
          </div>
          <span className="text-xl font-bold text-green-600">412%</span>
        </div>
        <p className="text-xs text-slate-600 mt-1">Above industry average of 287%</p>
      </div>
    </div>
  );
}
