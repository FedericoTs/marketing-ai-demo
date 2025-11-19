'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  Mail,
  Loader2,
  ChevronRight,
  AlertCircle
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
}

interface TeamWidgetProps {
  userRole: string;
}

export function TeamWidget({ userRole }: TeamWidgetProps) {
  const [pendingUsers, setPendingUsers] = useState<UserWithEmail[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Only show for owners and admins
  const canManageTeam = userRole === 'owner' || userRole === 'admin';

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

  async function handleApprove(userId: string, role: 'member' | 'admin' = 'member') {
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
        await loadTeamData();
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
        await loadTeamData();
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
    <Card className={pendingUsers.length > 0 ? 'border-2 border-amber-300 bg-amber-50/50' : ''}>
      <CardHeader className={pendingUsers.length > 0 ? 'border-b border-amber-200 bg-amber-100/50' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Management
              {pendingUsers.length > 0 && (
                <Badge className="bg-amber-500 text-white">
                  {pendingUsers.length} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {pendingUsers.length > 0
                ? `${pendingUsers.length} ${pendingUsers.length === 1 ? 'user' : 'users'} awaiting approval`
                : 'Manage your team members and permissions'}
            </CardDescription>
          </div>
          <Link href="/settings?tab=team">
            <Button variant="outline" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
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
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        {member.full_name || 'User'}
                        {member.role === 'owner' && <span className="text-base">👑</span>}
                      </p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                  </div>
                  <Badge
                    variant={member.role === 'owner' ? 'default' : 'outline'}
                    className={
                      member.role === 'owner'
                        ? 'bg-blue-600'
                        : member.role === 'admin'
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'text-xs'
                    }
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>
                </div>
              ))}
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
  );
}
