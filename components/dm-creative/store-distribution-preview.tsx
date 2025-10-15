"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, Users, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { StoreDistribution } from '@/lib/csv-processor';

interface StoreDistributionPreviewProps {
  distribution: {
    hasStoreNumbers: boolean;
    totalRecipients: number;
    recipientsWithStores: number;
    recipientsWithoutStores: number;
    storeDistribution: StoreDistribution[];
    uniqueStores: string[];
  };
}

export function StoreDistributionPreview({ distribution }: StoreDistributionPreviewProps) {
  if (!distribution.hasStoreNumbers) {
    return null; // Don't show if no store numbers in CSV
  }

  const hasIssues = distribution.recipientsWithoutStores > 0;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Store Deployment Detected</CardTitle>
          </div>
          <Badge className="bg-blue-600">
            {distribution.uniqueStores.length} {distribution.uniqueStores.length === 1 ? 'Store' : 'Stores'}
          </Badge>
        </div>
        <CardDescription className="text-blue-700">
          Campaign will be deployed to specific store locations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-slate-600" />
              <p className="text-xs text-slate-600">Total Recipients</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{distribution.totalRecipients}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Store className="h-4 w-4 text-slate-600" />
              <p className="text-xs text-slate-600">Unique Stores</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{distribution.uniqueStores.length}</p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-slate-600" />
              <p className="text-xs text-slate-600">Avg per Store</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {Math.round(distribution.recipientsWithStores / distribution.uniqueStores.length)}
            </p>
          </div>
        </div>

        {/* Warning if some recipients don't have store numbers */}
        {hasIssues && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {distribution.recipientsWithoutStores} recipients missing store numbers
              </p>
              <p className="text-xs text-amber-700 mt-1">
                These recipients will be part of the campaign but not linked to specific stores.
              </p>
            </div>
          </div>
        )}

        {/* Store Breakdown */}
        <div>
          <p className="text-sm font-medium text-blue-900 mb-2">Distribution by Store:</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {distribution.storeDistribution.map((store) => (
              <div
                key={store.storeNumber}
                className="flex items-center justify-between p-2 bg-white rounded border border-blue-100"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-900">
                    Store #{store.storeNumber}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">
                    {store.count} {store.count === 1 ? 'recipient' : 'recipients'}
                  </span>
                  <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{
                        width: `${(store.count / distribution.recipientsWithStores) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">
                    {Math.round((store.count / distribution.recipientsWithStores) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Message */}
        <div className="flex items-start gap-2 p-3 bg-blue-100 border border-blue-300 rounded-lg">
          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              Store-level analytics enabled
            </p>
            <p className="text-xs text-blue-700 mt-1">
              You'll be able to track campaign performance for each store location individually.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
