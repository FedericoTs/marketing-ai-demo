"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowLeft,
  Download,
  Loader2,
  Search,
  Mail,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  data_axle_id: string | null;
  metadata: any;
  created_at: string;
}

interface RecipientList {
  id: string;
  name: string;
  organization_id: string;
  total_recipients: number;
  source: string;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function RecipientListDetailPage() {
  const router = useRouter();
  const params = useParams();
  const listId = params.id as string;

  const [list, setList] = useState<RecipientList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (listId) {
      fetchContacts(1, "");
    }
  }, [listId]);

  const fetchContacts = async (page: number, search: string) => {
    try {
      setLoading(true);
      const url = `/api/audience/recipient-lists/${listId}/contacts?page=${page}&limit=100${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          toast.error(errorData.error || "Contact details viewing is disabled");
          router.push("/audiences/lists");
          return;
        }
        throw new Error(errorData.error || "Failed to fetch contacts");
      }

      const data = await response.json();
      setList(data.list);
      setContacts(data.contacts);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error("Error fetching contacts:", error);
      toast.error(error.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);

    // Debounce search
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchContacts(1, value);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchContacts(newPage, searchTerm);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch(`/api/audience/recipient-lists/${listId}/export`);

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          toast.error(errorData.error || "CSV export is disabled");
          return;
        }
        throw new Error(errorData.error || "Export failed");
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `contacts_${listId}.csv`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Exported ${pagination.total} contacts to CSV`);
    } catch (error: any) {
      console.error("Error exporting contacts:", error);
      toast.error(error.message || "Failed to export contacts");
    } finally {
      setExporting(false);
    }
  };

  if (loading && !list) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
                onClick={() => router.push("/audiences/lists")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-slate-900">{list?.name}</h1>
                  <Badge variant="outline" className="capitalize">
                    {list?.source.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-slate-600">
                  {pagination.total.toLocaleString()} contacts • Created{" "}
                  {list && new Date(list.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || !contacts.length}
              className="bg-green-600 hover:bg-green-700"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email, city, or state..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm("");
                fetchContacts(1, "");
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="container mx-auto px-6 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
            <CardDescription>
              Showing {contacts.length} of {pagination.total} contacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600">
                  {searchTerm ? "No contacts match your search" : "No contacts found in this list"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City, State</TableHead>
                        <TableHead>ZIP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell>
                            <div className="font-medium text-slate-900">
                              {contact.first_name} {contact.last_name}
                            </div>
                          </TableCell>
                          <TableCell>
                            {contact.email ? (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-slate-400" />
                                {contact.email}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {contact.phone ? (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-slate-400" />
                                {contact.phone}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {contact.address_line1}
                              {contact.address_line2 && `, ${contact.address_line2}`}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {contact.city}, {contact.state}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-mono">{contact.zip_code}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4 mt-4">
                    <div className="text-sm text-slate-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasMore}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
