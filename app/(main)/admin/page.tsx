"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  TrendingUp,
  Users,
  Activity,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface PricingTier {
  id: string;
  name: string;
  description: string | null;
  min_contacts: number;
  max_contacts: number | null;
  cost_per_contact: number;
  user_cost_per_contact: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
  platform_role: string;
  platform_role_updated_at: string | null;
  last_active_at: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minContacts: "",
    maxContacts: "",
    costPerContact: "",
    userCostPerContact: "",
    isActive: true,
  });

  useEffect(() => {
    fetchTiers();
    fetchUsers();
  }, []);

  const fetchTiers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/pricing-tiers");
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Admin access required");
          return;
        }
        throw new Error("Failed to fetch pricing tiers");
      }

      const data = await response.json();
      setTiers(data.tiers);
    } catch (error: any) {
      toast.error(error.message || "Failed to load pricing tiers");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        if (response.status === 403) {
          toast.error("Admin access required");
          return;
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error: any) {
      toast.error(error.message || "Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform_role: newRole }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user role");
      }

      const data = await response.json();
      toast.success(data.message || "User role updated successfully");
      fetchUsers(); // Refresh users list
    } catch (error: any) {
      toast.error(error.message || "Failed to update user role");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      minContacts: "",
      maxContacts: "",
      costPerContact: "",
      userCostPerContact: "",
      isActive: true,
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        minContacts: parseInt(formData.minContacts),
        maxContacts: formData.maxContacts ? parseInt(formData.maxContacts) : null,
        costPerContact: parseFloat(formData.costPerContact),
        userCostPerContact: parseFloat(formData.userCostPerContact),
        isActive: formData.isActive,
      };

      const url = editingId
        ? `/api/admin/pricing-tiers/${editingId}`
        : "/api/admin/pricing-tiers";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save tier");
      }

      toast.success(editingId ? "Tier updated!" : "Tier created!");
      resetForm();
      fetchTiers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleEdit = (tier: PricingTier) => {
    setFormData({
      name: tier.name,
      description: tier.description || "",
      minContacts: tier.min_contacts.toString(),
      maxContacts: tier.max_contacts?.toString() || "",
      costPerContact: tier.cost_per_contact.toString(),
      userCostPerContact: tier.user_cost_per_contact.toString(),
      isActive: tier.is_active,
    });
    setEditingId(tier.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing tier?")) return;

    try {
      const response = await fetch(`/api/admin/pricing-tiers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete tier");
      }

      toast.success("Tier deleted!");
      fetchTiers();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "∞";
    return new Intl.NumberFormat("en-US").format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-600">
              Platform configuration and analytics • federicosciuca@gmail.com only
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Tiers</CardTitle>
            <DollarSign className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">
              {tiers.filter((t) => t.is_active).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Tiers</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{tiers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Platform Users</CardTitle>
            <Users className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">-</div>
            <p className="text-xs text-slate-500">Coming soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">API Usage</CardTitle>
            <Activity className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">-</div>
            <p className="text-xs text-slate-500">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Tiers Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pricing Tiers</CardTitle>
              <CardDescription>
                Configure volume-based pricing for audience targeting
              </CardDescription>
            </div>
            {!showAddForm && (
              <Button
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Edit Tier" : "New Tier"}
                </h3>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Tier Name *</Label>
                  <Input
                    placeholder="e.g., Enterprise"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Optional description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Min Contacts *</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000"
                    value={formData.minContacts}
                    onChange={(e) => setFormData({ ...formData, minContacts: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Max Contacts</Label>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.maxContacts}
                    onChange={(e) => setFormData({ ...formData, maxContacts: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Our Cost (per contact) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 0.15"
                    value={formData.costPerContact}
                    onChange={(e) => setFormData({ ...formData, costPerContact: e.target.value })}
                  />
                </div>

                <div>
                  <Label>User Price (per contact) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 0.25"
                    value={formData.userCostPerContact}
                    onChange={(e) =>
                      setFormData({ ...formData, userCostPerContact: e.target.value })
                    }
                  />
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Tiers Table */}
          {isLoading ? (
            <div className="text-center py-12 text-slate-500">Loading pricing tiers...</div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No pricing tiers configured</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier Name</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Our Cost</TableHead>
                  <TableHead>User Price</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => {
                  const margin = tier.user_cost_per_contact - tier.cost_per_contact;
                  const marginPercent = (margin / tier.cost_per_contact) * 100;

                  return (
                    <TableRow key={tier.id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold text-slate-900">{tier.name}</div>
                          {tier.description && (
                            <div className="text-xs text-slate-500">{tier.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">
                          {formatNumber(tier.min_contacts)} - {formatNumber(tier.max_contacts)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-red-700">
                          {formatCurrency(tier.cost_per_contact)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-green-700">
                          {formatCurrency(tier.user_cost_per_contact)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium text-blue-700">
                            {formatCurrency(margin)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {marginPercent.toFixed(0)}% markup
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tier.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {tier.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(tier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tier.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Management Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage platform access and assign admin roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-500">Loading users...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Platform Role</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "No name"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.platform_role === "admin" || user.platform_role === "super_admin"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {user.platform_role}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">
                      {user.last_active_at
                        ? new Date(user.last_active_at).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.platform_role === "user" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRole(user.id, "admin")}
                            className="text-green-600 hover:text-green-700 hover:border-green-600"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Make Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateUserRole(user.id, "user")}
                            className="text-orange-600 hover:text-orange-700 hover:border-orange-600"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Remove Admin
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Future Analytics Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>Coming soon: User activity, API usage, campaign metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Activity className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p>Analytics dashboard will be added in future updates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
