"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Loader2,
  ArrowLeft,
  Database,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

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

export default function MyContactsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<RecipientList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipientLists();
  }, []);

  const fetchRecipientLists = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/audience/recipient-lists");

      if (!response.ok) {
        throw new Error("Failed to fetch recipient lists");
      }

      const data = await response.json();
      setLists(data.lists || []);
    } catch (error: any) {
      console.error("Error fetching recipient lists:", error);
      toast.error("Failed to load recipient lists");
    } finally {
      setLoading(false);
    }
  };

  const handleViewList = (listId: string) => {
    router.push(`/audiences/lists/${listId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/audiences")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">My Contacts</h1>
                <p className="text-sm text-slate-600">
                  Manage your purchased recipient lists
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        ) : lists.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
                <Users className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                No Recipient Lists Yet
              </h3>
              <p className="max-w-md text-center text-slate-600 mb-6">
                You haven't purchased any contacts yet. Start by targeting your audience and purchasing contacts.
              </p>
              <Button
                onClick={() => router.push("/audiences")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Target Audience
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recipient Lists ({lists.length})</CardTitle>
              <CardDescription>
                View and export your purchased contact lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List Name</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Purchased</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-slate-900">{list.name}</div>
                          {list.description && (
                            <div className="text-sm text-slate-500">
                              {list.description.length > 60
                                ? `${list.description.substring(0, 60)}...`
                                : list.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {list.source.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">
                            {list.total_recipients?.toLocaleString() || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {list.purchase_info ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <DollarSign className="h-4 w-4" />
                            <span className="font-medium">
                              {formatCurrency(list.purchase_info.total_user_charge)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          {formatDate(list.purchase_info?.purchased_at || list.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {list.created_by_name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewList(list.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
