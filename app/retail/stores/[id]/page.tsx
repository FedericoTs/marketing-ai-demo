"use client";

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Store,
  MapPin,
  Calendar,
  TrendingUp,
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Target,
  CheckCircle,
} from 'lucide-react';

export default function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStore();
  }, [id]);

  async function loadStore() {
    try {
      const response = await fetch(`/api/retail/stores/${id}`);
      const result = await response.json();

      if (result.success) {
        setStore(result.data);
      } else {
        toast.error('Store not found');
        router.push('/retail/stores');
      }
    } catch (error) {
      console.error('Error loading store:', error);
      toast.error('Failed to load store');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${store.name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/retail/stores/${params.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Store deleted successfully');
        router.push('/retail/stores');
      } else {
        toast.error(result.error || 'Failed to delete store');
      }
    } catch (error) {
      console.error('Error deleting store:', error);
      toast.error('Failed to delete store');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-slate-600">Loading store...</p>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  const demographicProfile = store.demographic_profile
    ? JSON.parse(store.demographic_profile)
    : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/retail/stores">
          <Button variant="ghost" className="gap-2 mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Stores
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{store.name}</h1>
              <p className="text-slate-600 mt-1">Store #{store.store_number}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" className="gap-2 text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Store Number</p>
                  <p className="font-medium">{store.store_number}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Status</p>
                  {store.is_active ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>

              {(store.address || store.city || store.state || store.zip) && (
                <div>
                  <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    Address
                  </p>
                  <p className="font-medium">
                    {[store.address, store.city, store.state, store.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {store.region && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Region</p>
                    <p className="font-medium">{store.region}</p>
                  </div>
                )}
                {store.district && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">District</p>
                    <p className="font-medium">{store.district}</p>
                  </div>
                )}
                {store.size_category && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Store Size</p>
                    <p className="font-medium">{store.size_category}</p>
                  </div>
                )}
                {store.timezone && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Timezone</p>
                    <p className="font-medium">{store.timezone}</p>
                  </div>
                )}
              </div>

              {demographicProfile && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Demographics</p>
                  <div className="grid grid-cols-2 gap-3">
                    {demographicProfile.medianAge && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>Median Age: {demographicProfile.medianAge}</span>
                      </div>
                    )}
                    {demographicProfile.incomeLevel && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                        <span>Income: {demographicProfile.incomeLevel}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-slate-500">
                <p>Created {new Date(store.created_at).toLocaleDateString()}</p>
                {store.updated_at !== store.created_at && (
                  <p>Last updated {new Date(store.updated_at).toLocaleDateString()}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaign History */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign History</CardTitle>
              <CardDescription>
                Campaigns deployed to this store location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-slate-500">
                <Target className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p>No campaigns yet</p>
                <p className="text-sm mt-1">
                  Campaigns will appear here once you enable store deployments
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Campaigns</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Recipients</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Conversions</p>
                <p className="text-3xl font-bold">0</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold">0%</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Store is ready
                  </p>
                  <p className="text-xs text-blue-700">
                    This store can now be selected for campaign deployments in Phase 8C
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
