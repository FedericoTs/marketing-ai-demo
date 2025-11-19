'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle, XCircle, Shield, Mail, Loader2 } from 'lucide-react';
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
}

export function TeamManagement() {
  const [pendingUsers, setPendingUsers] = useState<UserWithEmail[]>([]);
  const [allMembers, setAllMembers] = useState<UserWithEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Load team data
  useEffect(() => {
    loadTeamData();
  }, []);

  async function loadTeamData() {
    setIsLoading(true);
    try {
      // Fetch pending users
      const pendingResponse = await fetch('/api/team/pending');
      const pendingResult = await pendingResponse.json();

      if (pendingResult.success) {
        setPendingUsers(pendingResult.data);
      }

      // Fetch all members
      const membersResponse = await fetch('/api/team/members');
      const membersResult = await membersResponse.json();

      if (membersResult.success) {
        setAllMembers(membersResult.data);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
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
        // Reload data
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
        // Reload data
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

  const approvedMembers = allMembers.filter((m) => m.approval_status === 'approved');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Approvals Section */}
      {pendingUsers.length > 0 && (
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardHeader className="border-b border-amber-200 bg-amber-100/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Pending Approvals</CardTitle>
                <CardDescription className="text-amber-700">
                  {pendingUsers.length} {pendingUsers.length === 1 ? 'user' : 'users'} waiting for approval
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg border border-amber-200 p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-600" />
                      <span className="font-semibold text-slate-900">
                        {user.full_name || 'New User'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                    {user.approval_requested_at && (
                      <p className="text-xs text-slate-500">
                        Requested {formatDistanceToNow(new Date(user.approval_requested_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                    Pending
                  </Badge>
                </div>

                <div className="flex gap-2 pt-2 border-t border-amber-100">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleApprove(user.id, 'member')}
                    disabled={processingUserId === user.id}
                    className="flex-1"
                  >
                    {processingUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve as Member
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(user.id, 'admin')}
                    disabled={processingUserId === user.id}
                    className="flex-1"
                  >
                    {processingUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Approve as Admin
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(user.id)}
                    disabled={processingUserId === user.id}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {processingUserId === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Members Section */}
      <Card>
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Active Members</CardTitle>
              <CardDescription>
                {approvedMembers.length} {approvedMembers.length === 1 ? 'member' : 'members'} in your organization
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {approvedMembers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>No active members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-50 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-600" />
                        <span className="font-semibold text-slate-900">
                          {member.full_name || 'User'}
                        </span>
                        {member.role === 'owner' && (
                          <span className="text-lg" title="Owner">
                            👑
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                      <p className="text-xs text-slate-500">
                        Joined {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm text-blue-900">
              <p className="font-medium">Team Management Permissions</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li><strong>Member</strong>: Can access analytics and view data</li>
                <li><strong>Admin</strong>: Can create designs, send campaigns, and manage templates</li>
                <li><strong>Owner</strong>: Full access to all features and team management</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
