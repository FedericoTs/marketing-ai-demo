"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Target,
  Users,
  Calendar,
  Search,
  Filter,
  Loader2,
  TrendingUp,
  Mail,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Deployment {
  id: string;
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;
  store_id: string;
  store_number: string;
  store_name: string;
  store_city: string;
  store_state: string;
  recipients_count: number;
  status: string;
  created_at: string;
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    try {
      const response = await fetch("/api/retail/deployments");
      const result = await response.json();

      if (result.success) {
        setDeployments(result.data);
      }
    } catch (error) {
      console.error("Failed to load deployments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter deployments by search query
  const filteredDeployments = deployments.filter((deployment) => {
    const query = searchQuery.toLowerCase();
    return (
      deployment.campaign_name.toLowerCase().includes(query) ||
      deployment.store_name.toLowerCase().includes(query) ||
      deployment.store_number.toLowerCase().includes(query) ||
      deployment.store_city?.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800 border-green-200";
      case "sending":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getCampaignStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400 mb-4" />
              <p className="text-slate-600">Loading deployments...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Campaign Deployments</h1>
          <p className="text-slate-600">
            Track campaign deployments across your retail store network
          </p>
        </div>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Deployments Yet
              </h3>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Create a campaign with store numbers in your CSV to start tracking
                deployments by store location.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dm-creative">
                  <Button className="gap-2">
                    <Mail className="h-4 w-4" />
                    Create Campaign
                  </Button>
                </Link>
                <Link href="/retail/stores">
                  <Button variant="outline" className="gap-2">
                    <Store className="h-4 w-4" />
                    Manage Stores
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Campaign Deployments</h1>
        <p className="text-slate-600 mb-6">
          Track campaign deployments across your retail store network
        </p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {deployments.length}
                  </p>
                  <p className="text-xs text-slate-600">Total Deployments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <Store className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {new Set(deployments.map((d) => d.store_id)).size}
                  </p>
                  <p className="text-xs text-slate-600">Stores Reached</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {deployments.reduce((sum, d) => sum + d.recipients_count, 0)}
                  </p>
                  <p className="text-xs text-slate-600">Total Recipients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(
                      deployments.reduce((sum, d) => sum + d.recipients_count, 0) /
                        new Set(deployments.map((d) => d.store_id)).size
                    )}
                  </p>
                  <p className="text-xs text-slate-600">Avg per Store</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by campaign, store name, store number, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-slate-600 mt-2">
              Showing {filteredDeployments.length} of {deployments.length} deployments
            </p>
          )}
        </CardContent>
      </Card>

      {/* Deployments List */}
      <div className="space-y-4">
        {filteredDeployments.map((deployment) => (
          <Card
            key={deployment.id}
            className="border-slate-200 hover:border-slate-300 transition-colors"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">{deployment.campaign_name}</CardTitle>
                    <Badge
                      className={`${getCampaignStatusColor(
                        deployment.campaign_status
                      )} border`}
                    >
                      {deployment.campaign_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {new Date(deployment.created_at).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span
                      className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getStatusColor(
                        deployment.status
                      )}`}
                    >
                      {deployment.status}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Store Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Store className="h-4 w-4" />
                    Store Information
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Store #{deployment.store_number}
                      </p>
                      <p className="text-sm text-slate-600">{deployment.store_name}</p>
                    </div>
                    {deployment.store_city && (
                      <p className="text-xs text-slate-500">
                        {deployment.store_city}
                        {deployment.store_state && `, ${deployment.store_state}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Deployment Stats */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Users className="h-4 w-4" />
                    Deployment Stats
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Recipients</span>
                      <span className="text-lg font-bold text-slate-900">
                        {deployment.recipients_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 mt-4 border-t flex flex-wrap gap-2">
                <Link href={`/retail/stores/${deployment.store_id}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Store className="h-3.5 w-3.5" />
                    View Store
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="outline" size="sm" className="gap-2">
                    <TrendingUp className="h-3.5 w-3.5" />
                    View Campaign Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredDeployments.length === 0 && searchQuery && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Deployments Found
              </h3>
              <p className="text-slate-600 mb-4">
                Try adjusting your search criteria
              </p>
              <Button variant="outline" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
