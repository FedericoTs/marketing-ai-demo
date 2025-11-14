"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Target, Users, Zap, AlertCircle, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialMetrics {
  totalInvestment: number;
  totalCampaigns: number;
  averageCostPerCampaign: number;
  totalRecipients: number;
  averageCostPerPiece: number;
  totalScans: number;
  averageCostPerScan: number;
  totalConversions: number;
  averageCostPerConversion: number;
  campaignsWithBudget: number;
  totalBudgetAllocated: number;
  budgetUtilization: number;
}

export function InvestmentDashboard() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFinancialMetrics();
  }, []);

  const loadFinancialMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/financial');
      const result = await response.json();

      if (result.success) {
        setMetrics(result.data);
      }
    } catch (error) {
      console.error('Failed to load financial metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyPrecise = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-4 w-4 bg-slate-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-slate-200 rounded mb-2"></div>
              <div className="h-3 w-20 bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-slate-500">No financial data available</p>
        </CardContent>
      </Card>
    );
  }

  const kpiCards = [
    {
      title: "Total Investment",
      value: formatCurrency(metrics.totalInvestment),
      subtitle: `Across ${metrics.totalCampaigns} campaign${metrics.totalCampaigns !== 1 ? 's' : ''}`,
      icon: Wallet,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Cost per Piece",
      value: formatCurrencyPrecise(metrics.averageCostPerPiece),
      subtitle: `${metrics.totalRecipients.toLocaleString()} total pieces`,
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-emerald-100 text-emerald-600",
    },
    {
      title: "Cost per Scan",
      value: metrics.averageCostPerScan > 0 ? formatCurrencyPrecise(metrics.averageCostPerScan) : "—",
      subtitle: `${metrics.totalScans.toLocaleString()} QR scans`,
      icon: Zap,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-50 to-orange-50",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      title: "Cost per Conversion",
      value: metrics.averageCostPerConversion > 0 ? formatCurrencyPrecise(metrics.averageCostPerConversion) : "—",
      subtitle: `${metrics.totalConversions.toLocaleString()} conversions`,
      icon: Target,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      iconBg: "bg-purple-100 text-purple-600",
    },
  ];

  const budgetCard = {
    allocated: metrics.totalBudgetAllocated,
    spent: metrics.totalInvestment,
    remaining: metrics.totalBudgetAllocated - metrics.totalInvestment,
    utilization: metrics.budgetUtilization,
    hasbudget: metrics.campaignsWithBudget > 0,
  };

  return (
    <div className="space-y-6">
      {/* Hero KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={index}
              className={cn(
                "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1",
                `bg-gradient-to-br ${kpi.bgGradient}`
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">
                  {kpi.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", kpi.iconBg)}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  kpi.gradient
                )}>
                  {kpi.value}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  {kpi.subtitle}
                </p>
              </CardContent>
              {/* Decorative gradient line */}
              <div className={cn(
                "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r",
                kpi.gradient
              )} />
            </Card>
          );
        })}
      </div>

      {/* Budget Status Card */}
      {budgetCard.hasbudget && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Budget Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-slate-600 mb-1">Allocated</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(budgetCard.allocated)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Spent</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(budgetCard.spent)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Remaining</p>
                <p className={cn(
                  "text-2xl font-bold",
                  budgetCard.remaining >= 0 ? "text-emerald-600" : "text-red-600"
                )}>
                  {formatCurrency(Math.abs(budgetCard.remaining))}
                  {budgetCard.remaining < 0 && " over"}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Utilization</span>
                <span className={cn(
                  "text-sm font-bold",
                  budgetCard.utilization > 100 ? "text-red-600" :
                  budgetCard.utilization > 80 ? "text-amber-600" :
                  "text-emerald-600"
                )}>
                  {budgetCard.utilization.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-500 rounded-full",
                    budgetCard.utilization > 100 ? "bg-gradient-to-r from-red-500 to-red-600" :
                    budgetCard.utilization > 80 ? "bg-gradient-to-r from-amber-500 to-amber-600" :
                    "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  )}
                  style={{ width: `${Math.min(budgetCard.utilization, 100)}%` }}
                />
              </div>
              {budgetCard.utilization > 90 && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    {budgetCard.utilization > 100
                      ? "Budget exceeded! Consider adjusting campaign spend."
                      : "Approaching budget limit. Monitor campaign costs closely."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Campaign Cost</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(metrics.averageCostPerCampaign)}
                </p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Scan Efficiency</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {metrics.totalRecipients > 0
                    ? `${((metrics.totalScans / metrics.totalRecipients) * 100).toFixed(1)}%`
                    : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">QR scan rate</p>
              </div>
              <Zap className="h-10 w-10 text-emerald-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {metrics.totalRecipients > 0
                    ? `${((metrics.totalConversions / metrics.totalRecipients) * 100).toFixed(2)}%`
                    : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">Overall conversion</p>
              </div>
              <Target className="h-10 w-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
