"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useIndustryModule } from '@/lib/contexts/industry-module-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Store,
  Upload,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  MapPin,
  TrendingUp,
  Eye,
  Download,
} from 'lucide-react';
import { StoreImportDialog } from '@/components/retail/store-import-dialog';

interface StoreData {
  id: string;
  store_number: string;
  name: string;
  city?: string;
  state?: string;
  region?: string;
  is_active: number;
  total_campaigns?: number;
  total_recipients?: number;
  total_conversions?: number;
  conversion_rate?: number;
}

export default function RetailStoresPage() {
  const industryModule = useIndustryModule();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Check if module is enabled
  if (!industryModule.isModuleEnabled() || industryModule.getModuleType() !== 'retail') {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card>
          <CardHeader>
            <CardTitle>Retail Module Not Enabled</CardTitle>
            <CardDescription>
              Please enable the Retail Module in Settings to access store management.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings">
              <Button>Go to Settings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadStores();
  }, [page, search]);

  async function loadStores() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await fetch(`/api/retail/stores?${params}`);
      const result = await response.json();

      if (result.success) {
        setStores(result.data.stores);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
      } else {
        toast.error(result.error || 'Failed to load stores');
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1); // Reset to first page on search
  }

  function handleImportSuccess() {
    setShowImportDialog(false);
    loadStores();
    toast.success('Stores imported successfully');
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Store Management</h1>
              <p className="text-slate-600 mt-1">
                Manage your retail store locations ({total.toLocaleString()} stores)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Import Stores
            </Button>
            <Link href="/retail/stores/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Store
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search stores by name, number, city..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stores Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Loading stores...
            </div>
          ) : stores.length === 0 ? (
            <div className="p-12 text-center">
              <Store className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No stores found</h3>
              <p className="text-slate-600 mb-4">
                {search ? 'Try adjusting your search' : 'Get started by importing or adding stores'}
              </p>
              <Button onClick={() => setShowImportDialog(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Import Stores from CSV
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stores.map((store) => (
                      <tr key={store.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{store.name}</div>
                            <div className="text-sm text-slate-500">#{store.store_number}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {store.city || store.state || store.region ? (
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              <span>
                                {[store.city, store.state, store.region].filter(Boolean).join(', ')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">No location</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Campaigns:</span>
                              <span className="ml-1 font-medium">{store.total_campaigns || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Conv:</span>
                              <span className="ml-1 font-medium">
                                {store.total_conversions || 0}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {store.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/retail/stores/${store.id}`}>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="text-sm text-slate-600">
                  Page {page} of {totalPages} • {total.toLocaleString()} total stores
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="gap-2"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      {showImportDialog && (
        <StoreImportDialog
          onClose={() => setShowImportDialog(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
