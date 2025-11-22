/**
 * Mini Attribution Chart
 *
 * Compact animated attribution funnel for hero section
 * Shows Mail Sent → QR Scans → Conversions customer journey
 */

'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export function MiniAttributionChart() {
  const [chartData, setChartData] = useState<Array<{ sent: number; scans: number; conversions: number }>>([]);

  // Animate chart data - Reveal from left to right
  useEffect(() => {
    const targetData = [
      { sent: 250, scans: 0, conversions: 0 },
      { sent: 780, scans: 142, conversions: 8 },
      { sent: 1050, scans: 268, conversions: 28 },
      { sent: 1180, scans: 351, conversions: 52 },
      { sent: 1235, scans: 401, conversions: 73 },
      { sent: 1247, scans: 423, conversions: 87 },
    ];

    const duration = 1800;
    const totalPoints = targetData.length;
    const delayPerPoint = duration / totalPoints;

    let pointsRevealed = 0;
    setChartData([]); // Start with empty chart

    const interval = setInterval(() => {
      pointsRevealed++;
      setChartData(targetData.slice(0, pointsRevealed));

      if (pointsRevealed >= totalPoints) {
        clearInterval(interval);
      }
    }, delayPerPoint);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-lg" />

      {/* Chart */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="sent"
            stroke="#6366f1"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="scans"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="conversions"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span className="text-indigo-700">Sent</span>
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-purple-700">Scans</span>
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-green-700">Converts</span>
        </span>
      </div>
    </div>
  );
}
