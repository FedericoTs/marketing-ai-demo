'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Crown,
  Shield,
  Eye,
  UserCog,
  Mail,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface UserWithEmail {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  approval_status: string;
  approval_requested_at: string | null;
  approved_at: string | null;
  created_at: string;
  can_create_designs?: boolean;
  can_send_campaigns?: boolean;
  can_manage_billing?: boolean;
  can_invite_users?: boolean;
  can_approve_designs?: boolean;
  can_manage_templates?: boolean;
  can_access_analytics?: boolean;
}

export default function TeamPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<UserWithEmail[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserWithEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithEmail | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadUserAndTeam();
  }, []);

  async function loadUserAndTeam() {
    setLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        router.push('/auth/login');
        return;
      }

      setUser(currentUser);

      // Get user profile to check role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (!profile) {
        toast.error('Profile not found');
        return;
      }

      setUserRole(profile.role);

      // Only owners and admins can access team management
      if (profile.role !== 'owner' && profile.role !== 'admin') {
        toast.error('You do not have permission to access team management');
        router.push('/dashboard');
        return;
      }

      // Load team data
      await loadTeamData();
    } catch (error) {
      console.error('Error loading team:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }

  async function loadTeamData() {
    try {
      // Fetch all members
      const membersResponse = await fetch('/api/team/members');
      const membersResult = await membersResponse.json();

      if (membersResult.success) {
        const approved = membersResult.data.filter(
          (m: UserWithEmail) => m.approval_status === 'approved'
        );
        setMembers(approved);
      }

      // Fetch pending users
      const pendingResponse = await fetch('/api/team/pending');
      const pendingResult = await pendingResponse.json();

      if (pendingResult.success) {
        setPendingUsers(pendingResult.data);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
    }
  }

  async function handleApprove(userId: string, role: 'member' | 'owner' = 'member') {
    setProcessingUserId(userId);
    try {
      const response = await fetch('/api/team/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`User approved as ${role}`);
        await loadTeamData(); // Reload to get fresh data
      } else {
        toast.error(result.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setProcessingUserId(null);
    }
  }

  async function handleReject(userId: string) {
    setProcessingUserId(userId);
    try {
      const response = await fetch('/api/team/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('User rejected');
        await loadTeamData(); // Reload to get fresh data
      } else {
        toast.error(result.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setProcessingUserId(null);
    }
  }

  async function handleUpdateRole(userId: string, newRole: string) {
    setProcessingUserId(userId);
    try {
      const response = await fetch('/api/team/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Role updated to ${newRole}`);
        await loadTeamData(); // Reload to get fresh data
      } else {
        toast.error(result.error || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setProcessingUserId(null);
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'admin':
        return <Shield className="h-4 w-4 text-blue-600" />;
      case 'designer':
        return <UserCog className="h-4 w-4 text-purple-600" />;
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  }

  function getRoleBadgeVariant(role: string): "default" | "secondary" | "destructive" | "outline" {
    switch (role) {
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  // Filter members based on search and role filter
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Team Management</h1>
          <p className="text-slate-600 mt-2">Manage your team members, roles, and permissions</p>
        </div>

        {/* Pending Approvals Section */}
        {pendingUsers.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Clock className="h-5 w-5" />
                Pending Approvals ({pendingUsers.length})
              </CardTitle>
              <CardDescription>New team members waiting for approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingUsers.map((pendingUser) => (
                  <div
                    key={pendingUser.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-orange-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {pendingUser.full_name || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          {pendingUser.email}
                        </div>
                        {pendingUser.approval_requested_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            Requested{' '}
                            {formatDistanceToNow(new Date(pendingUser.approval_requested_at), {
                              addSuffix: true,
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(pendingUser.id, 'member')}
                        disabled={processingUserId === pendingUser.id}
                      >
                        {processingUserId === pendingUser.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(pendingUser.id)}
                        disabled={processingUserId === pendingUser.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Members Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members ({filteredMembers.length})
            </CardTitle>
            <CardDescription>View and manage all approved team members</CardDescription>

            {/* Search and Filter */}
            <div className="flex gap-4 mt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No team members found</p>
                {searchQuery && <p className="text-sm mt-2">Try adjusting your search</p>}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            {getRoleIcon(member.role)}
                          </div>
                          {member.full_name || 'Unknown'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {member.created_at &&
                          formatDistanceToNow(new Date(member.created_at), {
                            addSuffix: true,
                          })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {userRole === 'owner' && member.role !== 'owner' && (
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleUpdateRole(member.id, newRole)}
                              disabled={processingUserId === member.id}
                            >
                              <SelectTrigger className="w-[120px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="designer">Designer</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(member);
                              setShowDetailsDialog(true);
                            }}
                          >
                            Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* User Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
              <DialogDescription>View detailed information and permissions</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Name</label>
                    <p className="text-slate-900">{selectedUser.full_name || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <p className="text-slate-900">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Role</label>
                    <Badge variant={getRoleBadgeVariant(selectedUser.role)}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      {selectedUser.approval_status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Permissions</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'can_create_designs', label: 'Create Designs' },
                      { key: 'can_send_campaigns', label: 'Send Campaigns' },
                      { key: 'can_manage_billing', label: 'Manage Billing' },
                      { key: 'can_invite_users', label: 'Invite Users' },
                      { key: 'can_approve_designs', label: 'Approve Designs' },
                      { key: 'can_manage_templates', label: 'Manage Templates' },
                      { key: 'can_access_analytics', label: 'Access Analytics' },
                    ].map((perm) => (
                      <div
                        key={perm.key}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded"
                      >
                        {selectedUser[perm.key as keyof UserWithEmail] ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-slate-300" />
                        )}
                        <span className="text-sm text-slate-700">{perm.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedUser.approved_at && (
                  <div>
                    <label className="text-sm font-medium text-slate-700">Approved</label>
                    <p className="text-sm text-slate-600">
                      {formatDistanceToNow(new Date(selectedUser.approved_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
              <AlertCircle className="h-5 w-5" />
              Team Management Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>• <strong>Owners</strong> have full access and can manage all team members</p>
            <p>• <strong>Admins</strong> can approve users and manage permissions</p>
            <p>• <strong>Members</strong> need approval before gaining access to the platform</p>
            <p>• Users from the same company domain will automatically join your organization</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
