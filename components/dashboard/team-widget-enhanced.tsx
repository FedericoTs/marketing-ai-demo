'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  Mail,
  Loader2,
  ChevronRight,
  AlertCircle,
  Settings as SettingsIcon,
  Crown,
  UserCog,
  HelpCircle,
  Eye,
  Palette,
  Zap,
  DollarSign,
  UserPlus,
  FileCheck,
  Layout,
  BarChart,
  Key
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

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
  can_access_api?: boolean;
}

interface TeamWidgetProps {
  userRole: string;
  currentUserId?: string;
}

export function TeamWidget({ userRole, currentUserId }: TeamWidgetProps) {
  const [pendingUsers, setPendingUsers] = useState<UserWithEmail[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [showRolesLegend, setShowRolesLegend] = useState(false);

  // Only show for owners
  const isOwner = userRole === 'owner';
  const canManageTeam = isOwner;

  useEffect(() => {
    if (canManageTeam) {
      loadTeamData();
    } else {
      setIsLoading(false);
    }
  }, [canManageTeam]);

  async function loadTeamData() {
    setIsLoading(true);
    try {
      // Fetch pending users
      const pendingResponse = await fetch('/api/team/pending');
      const pendingResult = await pendingResponse.json();

      if (pendingResult.success) {
        setPendingUsers(pendingResult.data);
      }

      // Fetch all members (limited to first 5 for dashboard)
      const membersResponse = await fetch('/api/team/members');
      const membersResult = await membersResponse.json();

      if (membersResult.success) {
        const approved = membersResult.data
          .filter((m: UserWithEmail) => m.approval_status === 'approved')
          .slice(0, 5);
        setTeamMembers(approved);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprove(userId: string, role: 'member' | 'owner' = 'member') {
    // Optimistic update - remove from pending, add to members
    const approvedUser = pendingUsers.find(u => u.id === userId);
    if (!approvedUser) return;

    const previousPending = [...pendingUsers];
    const previousMembers = [...teamMembers];

    setPendingUsers(users => users.filter(u => u.id !== userId));
    setTeamMembers(members => [
      ...members,
      { ...approvedUser, approval_status: 'approved', role }
    ].slice(0, 5)); // Keep only first 5 for dashboard

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
        // Already updated optimistically!
      } else {
        // Revert on error
        setPendingUsers(previousPending);
        setTeamMembers(previousMembers);
        toast.error(result.error || 'Failed to approve user');
      }
    } catch (error) {
      // Revert on error
      setPendingUsers(previousPending);
      setTeamMembers(previousMembers);
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    } finally {
      setProcessingUserId(null);
    }
  }

  async function handleReject(userId: string) {
    // Optimistic update - remove from pending immediately
    const previousPending = [...pendingUsers];
    setPendingUsers(users => users.filter(u => u.id !== userId));

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
        // Already removed optimistically!
      } else {
        // Revert on error
        setPendingUsers(previousPending);
        toast.error(result.error || 'Failed to reject user');
      }
    } catch (error) {
      // Revert on error
      setPendingUsers(previousPending);
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    } finally {
      setProcessingUserId(null);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    if (!isOwner) {
      toast.error('Only owners can change roles');
      return;
    }

    // Optimistic update - update UI immediately
    const previousMembers = [...teamMembers];
    setTeamMembers(members =>
      members.map(member =>
        member.id === userId
          ? { ...member, role: newRole }
          : member
      )
    );

    setProcessingUserId(userId);
    try {
      const response = await fetch('/api/team/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newRole }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Role changed to ${newRole}`);
        // No need to reload - already updated!
      } else {
        // Revert on error
        setTeamMembers(previousMembers);
        toast.error(result.error || 'Failed to update role');
      }
    } catch (error) {
      // Revert on error
      setTeamMembers(previousMembers);
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    } finally {
      setProcessingUserId(null);
    }
  }


  // Don't show widget if not owner/admin
  if (!canManageTeam) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={pendingUsers.length > 0 ? 'border-2 border-amber-300 bg-amber-50/50' : ''}>
        <CardHeader className={pendingUsers.length > 0 ? 'border-b border-amber-200 bg-amber-100/50' : ''}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Management
                {pendingUsers.length > 0 && (
                  <Badge className="bg-amber-500 text-white">
                    {pendingUsers.length} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {pendingUsers.length > 0
                  ? `${pendingUsers.length} ${pendingUsers.length === 1 ? 'user' : 'users'} awaiting approval`
                  : 'Manage your team members, roles, and permissions'}
                {isOwner && (
                  <Badge variant="default" className="bg-blue-600 ml-2">
                    <Crown className="h-3 w-3 mr-1" />
                    You can edit roles
                  </Badge>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRolesLegend(true)}
                className="text-slate-600 hover:text-slate-900"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                Roles Guide
              </Button>
              <Link href="/settings?tab=team">
                <Button variant="outline" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Pending Approvals - Urgent Section */}
          {pendingUsers.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 mb-3">
                <AlertCircle className="h-4 w-4" />
                <h3 className="font-semibold text-sm">Pending Approvals</h3>
              </div>
              {pendingUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg border border-amber-200 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-900">
                          {user.full_name || 'New User'}
                        </p>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                          Pending
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                      {user.approval_requested_at && (
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDistanceToNow(new Date(user.approval_requested_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleApprove(user.id, 'member')}
                      disabled={processingUserId === user.id}
                      className="flex-1 h-8 text-xs"
                    >
                      {processingUserId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReject(user.id)}
                      disabled={processingUserId === user.id}
                      className="border-red-200 text-red-600 hover:bg-red-50 h-8"
                    >
                      {processingUserId === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
              {pendingUsers.length > 3 && (
                <div className="text-center pt-2">
                  <Link href="/settings?tab=team">
                    <Button variant="link" size="sm" className="text-amber-700">
                      View {pendingUsers.length - 3} more pending {pendingUsers.length - 3 === 1 ? 'user' : 'users'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Active Team Members */}
          {teamMembers.length > 0 && (
            <div>
              {pendingUsers.length > 0 && (
                <div className="border-t border-slate-200 mb-4 pt-4">
                  <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Active Members
                  </h3>
                </div>
              )}
              <div className="space-y-2">
                {teamMembers.map((member) => {
                  const isCurrentUser = member.id === currentUserId;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600">
                            {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            {member.full_name || 'User'}
                            {member.role === 'owner' && <Crown className="h-3 w-3 text-yellow-600" />}
                            {isCurrentUser && <span className="text-xs text-slate-500">(You)</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Role Dropdown - Always visible for team management */}
                        {!isCurrentUser ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={member.role}
                              onValueChange={(newRole) => handleRoleChange(member.id, newRole)}
                              disabled={!isOwner || processingUserId === member.id}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">
                                  <div className="flex items-center gap-2">
                                    <Crown className="h-3 w-3 text-yellow-600" />
                                    Owner
                                  </div>
                                </SelectItem>
                                <SelectItem value="member">
                                  <div className="flex items-center gap-2">
                                    <Users className="h-3 w-3" />
                                    Member
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (
                          <Badge
                            variant={member.role === 'owner' ? 'default' : 'outline'}
                            className={
                              member.role === 'owner'
                                ? 'bg-blue-600'
                                : member.role === 'admin'
                                ? 'bg-purple-100 text-purple-700 border-purple-300'
                                : ''
                            }
                          >
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {pendingUsers.length === 0 && teamMembers.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No team members yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Roles & Permissions Legend Dialog */}
      <Dialog open={showRolesLegend} onOpenChange={setShowRolesLegend}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Shield className="h-6 w-6 text-blue-600" />
              Roles & Permissions Guide
            </DialogTitle>
            <DialogDescription>
              Understand the different roles and what each can do in your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Role Descriptions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700">Role Descriptions</h3>

              {/* Owner */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-semibold text-blue-900">Owner</h4>
                  <Badge className="bg-blue-600">Admin Access</Badge>
                </div>
                <p className="text-sm text-blue-800 mb-3">
                  Organization administrator with full control. Can manage team members, billing, and all settings.
                </p>
                <div className="bg-white rounded-md p-3 space-y-1">
                  <p className="text-xs font-medium text-blue-900 mb-1">Owner Permissions:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-blue-800">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Approve new members
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Change user roles
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Manage billing
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Launch campaigns
                    </div>
                  </div>
                </div>
              </div>

              {/* Member */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-slate-600" />
                  <h4 className="font-semibold text-slate-900">Member</h4>
                  <Badge variant="outline" className="border-slate-400">Team Access</Badge>
                </div>
                <p className="text-sm text-slate-700 mb-3">
                  Standard team member with full campaign access. Can create, design, and launch campaigns.
                </p>
                <div className="bg-white rounded-md p-3 space-y-1">
                  <p className="text-xs font-medium text-slate-900 mb-1">Member Permissions:</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-slate-700">
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Create designs
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Launch campaigns
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      View analytics
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-slate-300" />
                      Manage billing
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-slate-300" />
                      Approve members
                    </div>
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-slate-300" />
                      Change roles
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Key Points
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• <strong>Everyone can launch campaigns</strong> - both owners and members have full campaign access</li>
                <li>• <strong>Only owners</strong> can approve new team members and manage billing</li>
                <li>• You cannot change your own role for security</li>
                <li>• New members must be approved by an owner before accessing the platform</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowRolesLegend(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
