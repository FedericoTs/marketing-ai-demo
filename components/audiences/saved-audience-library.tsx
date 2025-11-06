"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Target,
  Eye,
  Download,
  Loader2,
  Database
} from "lucide-react";
import { toast } from "sonner";
import type { SavedAudience } from "@/lib/audience";

interface RecipientList {
  id: string;
  name: string;
  description: string | null;
  source: string;
  total_recipients: number;
  created_at: string;
  created_by_name: string;
  purchase_info: {
    contact_count: number;
    total_user_charge: number;
    purchased_at: string;
  } | null;
}

interface SavedAudienceLibraryProps {
  onSelectAudience: (audience: SavedAudience) => void;
  onCreateNew: () => void;
}

/**
 * Saved Audience Library - Grid View
 *
 * Displays purchased recipient lists with:
 * - Search and filtering
 * - Contact count and cost metrics
 * - View and export actions
 * - Empty state with CTA
 */
export function SavedAudienceLibrary({
  onSelectAudience,
  onCreateNew,
}: SavedAudienceLibraryProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipientLists();
  }, []);

  const fetchRecipientLists = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/audience/recipient-lists");

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          console.log("Not authenticated - showing empty state");
          setRecipientLists([]);
          return;
        }

        console.error("Failed to fetch recipient lists:", errorData);
        throw new Error(errorData.error || "Failed to fetch recipient lists");
      }

      const data = await response.json();
      setRecipientLists(data.lists || []);
    } catch (error: any) {
      console.error("Error fetching recipient lists:", error);
      // Don't show error toast for auth issues - just show empty state
      if (error.message !== "Authentication required") {
        toast.error("Failed to load contacts");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredLists = recipientLists.filter((list) =>
    list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search your contacts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
          onClick={onCreateNew}
        >
          <Plus className="mr-2 h-5 w-5" />
          Buy More Contacts
        </Button>
      </div>

      {/* Empty State */}
      {filteredLists.length === 0 && !searchQuery && (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
              <Database className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              No Contacts Yet
            </h3>
            <p className="mb-6 max-w-md text-center text-slate-600">
              You haven't purchased any contacts yet. Start by targeting your audience and purchasing contacts.
            </p>
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
              onClick={onCreateNew}
            >
              <Plus className="mr-2 h-5 w-5" />
              Target & Buy Contacts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search No Results */}
      {filteredLists.length === 0 && searchQuery && (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-slate-300 mb-4" />
            <h3 className="mb-2 text-xl font-bold text-slate-900">
              No contacts found
            </h3>
            <p className="mb-6 max-w-md text-center text-slate-600">
              No contacts match "{searchQuery}". Try a different search term.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recipient Lists Grid */}
      {filteredLists.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((list) => (
            <Card
              key={list.id}
              className="group transition-all hover:shadow-lg hover:border-purple-300"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {list.name}
                    </CardTitle>
                    {list.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {list.description}
                      </CardDescription>
                    )}
                    <div className="mt-2">
                      <Badge variant="outline" className="capitalize">
                        {list.source.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="h-4 w-4" />
                      <span className="text-xs">Contacts</span>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {list.total_recipients.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-xs">Cost</span>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {list.purchase_info
                        ? formatCurrency(list.purchase_info.total_user_charge)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t pt-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(list.purchase_info?.purchased_at || list.created_at)}
                    </span>
                  </div>
                  <span className="text-slate-600">
                    {list.created_by_name}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/audiences/lists/${list.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/audience/recipient-lists/${list.id}/export`);
                        if (!response.ok) {
                          const errorData = await response.json();
                          if (response.status === 403) {
                            toast.error(errorData.error || "CSV export is disabled");
                            return;
                          }
                          throw new Error(errorData.error || "Export failed");
                        }

                        // Download the file
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);

                        toast.success(`Exported ${list.total_recipients} contacts`);
                      } catch (error: any) {
                        console.error("Error exporting:", error);
                        toast.error(error.message || "Failed to export");
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
