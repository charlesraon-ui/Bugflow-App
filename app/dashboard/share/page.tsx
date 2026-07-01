'use client';

import { useState, useEffect } from 'react';
import { Plus, Users, Copy, Check, Bell, CheckCircle, XCircle, Activity, Plus as PlusIcon, Trash2, FileText, User, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProjectInvitationStore } from '@/stores/useProjectInvitationStore';
import { useProjectStore } from '@/stores/useProjectStore';
import ToastNotification from '@/components/ToastNotification';

interface ProjectMember {
  id: number;
  userId: number;
  role: 'author' | 'editor' | 'viewer';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  createdById: number;
  members: ProjectMember[];
  status: string;
  isArchived: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface ProjectInvitation {
  id: number;
  project: { id: number; name: string };
  invitedBy: { id: number; name: string; email: string };
  createdAt: string;
}

interface ActivityLog {
  id: number;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  testCase: {
    id: number;
    caseNumber: string;
    title: string;
  };
  user: {
    id: number;
    name: string;
  };
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function ShareProjectPage() {
  const user = useAuthStore((state) => state.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<'author' | 'editor' | 'viewer'>('editor');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [showShareConfirm, setShowShareConfirm] = useState<{ projectName: string; userName: string } | null>(null);
  const [pendingRoleChanges, setPendingRoleChanges] = useState<{ [key: number]: 'author' | 'editor' | 'viewer' }>({});
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [currentDiff, setCurrentDiff] = useState<ActivityLog | null>(null);
  const [activityLogPage, setActivityLogPage] = useState(1);
  const activityLogsPerPage = 10;

  // Body scroll lock for modals
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (showShareConfirm || showDiffModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showShareConfirm, showDiffModal]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (showDiffModal) setShowDiffModal(false);
        if (showShareConfirm) setShowShareConfirm(null);
        if (showNotifications) setShowNotifications(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDiffModal, showShareConfirm, showNotifications]);

  const fetchData = async () => {
    try {
      const [projectsRes, usersRes, invitationsRes] = await Promise.all([
        api.get('/projects'),
        api.get('/auth/users'),
        api.get('/projects/invitations/pending'),
      ]);
      setProjects(projectsRes.data);
      setAllUsers(usersRes.data.filter((u: User) => u.id !== user?.id));
      setInvitations(invitationsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (projectId: number) => {
    try {
      const res = await api.get(`/projects/${projectId}/members`);
      setMembers(res.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchActivityLogs = async (projectId: number) => {
    setActivityLogsLoading(true);
    try {
      const res = await api.get(`/test-cases/projects/${projectId}/activity-logs`);
      setActivityLogs(res.data);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      setActivityLogs([]);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setPendingRoleChanges({});
    setActivityLogPage(1);
    fetchMembers(project.id);
    fetchActivityLogs(project.id);
  };

  const filteredProjects = projects.filter(project => {
    const isAuthor = project.createdById === user?.id;
    const matchesSearch = 
      project.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(projectSearch.toLowerCase()));
    const matchesFilter = 
      projectFilter === 'all' ||
      (projectFilter === 'active' && project.status === 'active') ||
      (projectFilter === 'completed' && project.status === 'completed');
    return isAuthor && matchesSearch && matchesFilter;
  });

  const handleSendInvitation = async () => {
    if (!selectedProject || !selectedUser) return;
    
    const userToInvite = allUsers.find(u => u.id === parseInt(selectedUser));
    setShowShareConfirm({
      projectName: selectedProject.name,
      userName: userToInvite?.name || 'this user',
    });
  };

  const confirmSendInvitation = async () => {
    if (!selectedProject || !selectedUser) return;
    try {
      await api.post('/projects/invitations', {
        projectId: selectedProject.id,
        invitedToId: parseInt(selectedUser),
        role: selectedRole,
      });
      setSelectedUser('');
      setShowShareConfirm(null);
      showToast('Invitation sent successfully!', 'success');
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error.response as { data?: { error?: string } })?.data?.error
          : 'Failed to send invitation';
      showToast(errorMessage || 'Failed to send invitation', 'error');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'author': return { bg: '#facc15', text: '#000000', label: 'Author' };
      case 'editor': return { bg: '#3b82f6', text: '#ffffff', label: 'Editor' };
      case 'viewer': return { bg: '#6b7280', text: '#ffffff', label: 'Viewer' };
      default: return { bg: '#6b7280', text: '#ffffff', label: role };
    }
  };

  const { removeInvitation } = useProjectInvitationStore();
  
  const handleAcceptInvitation = async (invitationId: number) => {
    try {
      await api.post(`/projects/invitations/${invitationId}/accept`);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      removeInvitation(invitationId);
      fetchData();
      showToast('Invitation accepted!', 'success');
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      showToast('Failed to accept invitation', 'error');
    }
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    try {
      await api.post(`/projects/invitations/${invitationId}/decline`);
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      removeInvitation(invitationId);
      showToast('Invitation declined', 'info');
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      showToast('Failed to decline invitation', 'error');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedProject) return;
    try {
      await api.delete(`/projects/${selectedProject.id}/members/${memberId}`);
      fetchMembers(selectedProject.id);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };
  
  const handleRoleChange = (memberId: number, newRole: 'author' | 'editor' | 'viewer') => {
    setPendingRoleChanges(prev => ({
      ...prev,
      [memberId]: newRole
    }));
  };
  
  const { updateProject, fetchProjects } = useProjectStore();
  
  const handleSaveMemberRole = async (memberId: number) => {
    if (!selectedProject) return;
    const newRole = pendingRoleChanges[memberId];
    if (!newRole) return;
    
    setSavingMemberId(memberId);
    try {
      await api.put(`/projects/${selectedProject.id}/members/${memberId}`, { role: newRole });
      setPendingRoleChanges(prev => {
        const updated = { ...prev };
        delete updated[memberId];
        return updated;
      });
      await fetchMembers(selectedProject.id);
      await fetchProjects();
      showToast('Role updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update member role:', error);
      showToast('Failed to update role', 'error');
    } finally {
      setSavingMemberId(null);
    }
  };

  const copyInviteLink = () => {
    if (!selectedProject) return;
    const link = `${window.location.origin}/dashboard/projects/${selectedProject.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#0f0f0f', 
      color: '#ffffff', 
      minHeight: '100vh',
      position: 'relative'
    }}>
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ 
            fontSize: '26px', 
            fontWeight: '800', 
            margin: '0 0 6px 0',
            letterSpacing: '-0.5px'
          }}>
            Share Project
          </h1>
          <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>
            Collaborate with your team in real-time
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{
              position: 'relative',
              padding: '12px',
              backgroundColor: '#1e293b',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#ffffff',
            }}
          >
            <Bell style={{ width: '20px', height: '20px' }} />
            {invitations.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {invitations.length > 99 ? '99+' : invitations.length}
              </span>
            )}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: '50px',
                  right: 0,
                  width: '320px',
                  backgroundColor: '#1f1f1f',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                  zIndex: 1000,
                }}
              >
                <div style={{ padding: '16px', borderBottom: '1px solid #3f3f46' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>
                    Notifications
                  </h3>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {invitations.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                        No pending invitations
                      </p>
                    </div>
                  ) : (
                    invitations.map((invitation) => (
                      <motion.div
                        key={invitation.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid #3f3f46',
                        }}
                      >
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 4px 0' }}>
                          {invitation.invitedBy.name} invited you to
                        </p>
                        <p style={{ fontSize: '13px', color: '#3b82f6', margin: '0 0 8px 0' }}>
                          {invitation.project.name}
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              backgroundColor: '#22c55e',
                              color: '#000000',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle style={{ width: '14px', height: '14px' }} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              backgroundColor: '#3f3f46',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            <XCircle style={{ width: '14px', height: '14px' }} />
                            Decline
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '80px' 
          }}
        >
          <p style={{ fontSize: '20px', color: '#a1a1aa' }}>Loading...</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]" style={{ alignItems: 'flex-start' }}>
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{ 
              backgroundColor: '#1f1f1f', 
              border: '1px solid #3f3f46', 
              borderRadius: '12px', 
              padding: '20px',
              minWidth: '320px',
              width: '100%',
              maxHeight: '600px'
            }}
          >
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              margin: '0 0 16px 0' 
            }}>
              Select Project
            </h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {(['all', 'active', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setProjectFilter(filter)}
                  style={{
                    padding: '6px 14px',
                    backgroundColor: projectFilter === filter ? '#3b82f6' : '#2d2d2d',
                    color: '#ffffff',
                    border: `1px solid ${projectFilter === filter ? '#3b82f6' : '#3f3f46'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Search projects..."
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                backgroundColor: '#2d2d2d',
                border: '1px solid #3f3f46',
                borderRadius: '6px',
                color: '#ffffff',
                marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '6px', paddingBottom: '4px', boxSizing: 'border-box' }}>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 + (index * 0.05) }}
                  onClick={() => handleSelectProject(project)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: selectedProject?.id === project.id ? '#1e293b' : '#2d2d2d',
                    border: selectedProject?.id === project.id ? '1px solid #3b82f6' : '1px solid #3f3f46',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProject?.id !== project.id) {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProject?.id !== project.id) {
                      e.currentTarget.style.backgroundColor = '#2d2d2d';
                    }
                  }}
                >
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                    {project.name}
                  </p>
                </motion.div>
              ))}
              {filteredProjects.length === 0 && projects.length > 0 && (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                    No projects match your search
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ 
              backgroundColor: '#1f1f1f', 
              border: '1px solid #3f3f46', 
              borderRadius: '12px', 
              padding: '24px',
              minWidth: '0'
            }}
          >
            {selectedProject ? (
              <>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    margin: '0 0 8px 0' 
                  }}>
                    {selectedProject.name}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                    Invite team members to collaborate
                  </p>
                </div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  style={{ 
                    backgroundColor: '#2d2d2d', 
                    border: '1px solid #3f3f46', 
                    borderRadius: '8px', 
                    padding: '16px',
                    marginBottom: '24px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 4px 0' }}>
                        Invite Link
                      </p>
                      <p style={{ fontSize: '14px', margin: 0, wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                        {window.location.origin}/dashboard/projects/{selectedProject.id}
                      </p>
                    </div>
                    <button
                      onClick={copyInviteLink}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: copied ? '#22c55e' : '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {copied ? <Check style={{ width: '16px', height: '16px' }} /> : <Copy style={{ width: '16px', height: '16px' }} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.6 }}
                  style={{ marginBottom: '24px' }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
                    Invite Team Member
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          fontSize: '14px',
                          backgroundColor: '#2d2d2d',
                          border: '1px solid #3f3f46',
                          borderRadius: '6px',
                          color: '#ffffff',
                        }}
                      >
                        <option value="" disabled hidden>Select user...</option>
                        {(() => {
                          const existingMemberIds = members.map(m => m.user.id);
                          const filteredUsers = allUsers.filter(u => 
                            !existingMemberIds.includes(u.id) && 
                            selectedProject && u.id !== selectedProject.createdById
                          );
                          return filteredUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ));
                        })()}
                      </select>
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as any)}
                        style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          backgroundColor: '#2d2d2d',
                          border: '1px solid #3f3f46',
                          borderRadius: '6px',
                          color: '#ffffff',
                        }}
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="author">Author</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSendInvitation}
                      disabled={!selectedUser}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: !selectedUser ? '#52525b' : '#22c55e',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: !selectedUser ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Plus style={{ width: '16px', height: '16px' }} />
                      Send Invite
                    </button>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Users style={{ width: '16px', height: '16px' }} />
                    Team Members
                  </h3>
                  {members.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      backgroundColor: '#2d2d2d', 
                      border: '2px dashed #3f3f46', 
                      borderRadius: '8px' 
                    }}>
                      <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                        No members yet. Invite your team to collaborate!
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {members.map((member, index) => {
                        const currentRole = pendingRoleChanges[member.id] || member.role;
                        const hasPendingChange = pendingRoleChanges[member.id] !== undefined;
                        
                        return (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.8 + (index * 0.05) }}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              backgroundColor: hasPendingChange ? '#1e293b' : '#2d2d2d',
                              border: `1px solid ${hasPendingChange ? '#3b82f6' : '#3f3f46'}`,
                              borderRadius: '8px',
                            }}
                          >
                            <div>
                              <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
                                {member.user.name}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <p style={{ fontSize: '12px', color: '#a1a1aa', margin: 0 }}>
                                  {member.user.email}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <select
                                value={currentRole}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  backgroundColor: '#1f1f1f',
                                  border: '1px solid #3f3f46',
                                  borderRadius: '6px',
                                  color: '#ffffff',
                                  fontWeight: 'bold',
                                }}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                                <option value="author">Author</option>
                              </select>
                              {hasPendingChange && (
                                <button
                                  onClick={() => handleSaveMemberRole(member.id)}
                                  disabled={savingMemberId === member.id}
                                  style={{
                                    padding: '6px 16px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    backgroundColor: savingMemberId === member.id ? '#52525b' : '#22c55e',
                                    color: '#000000',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: savingMemberId === member.id ? 'not-allowed' : 'pointer',
                                  }}
                                >
                                  {savingMemberId === member.id ? 'Saving...' : 'Save'}
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid #7f1d1d',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.9 }}
                  style={{ marginTop: '32px' }}
                >
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    margin: '0 0 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <Activity style={{ width: '16px', height: '16px' }} />
                    Activity Log
                  </h3>
                  {activityLogsLoading ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      backgroundColor: '#2d2d2d', 
                      border: '1px solid #3f3f46', 
                      borderRadius: '8px' 
                    }}>
                      <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>Loading activity...</p>
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      backgroundColor: '#2d2d2d', 
                      border: '2px dashed #3f3f46', 
                      borderRadius: '8px' 
                    }}>
                      <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                        No activity yet
                      </p>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {(() => {
                          const sortedLogs = [...activityLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                          const indexOfLastLog = activityLogPage * activityLogsPerPage;
                          const indexOfFirstLog = indexOfLastLog - activityLogsPerPage;
                          const currentLogs = sortedLogs.slice(indexOfFirstLog, indexOfLastLog);

                          return currentLogs.map((log, index) => {
                            const getActionColor = (action: string) => {
                              switch (action) {
                                case 'CREATED': return '#22c55e';
                                case 'STATUS_CHANGED': return '#3b82f6';
                                case 'ASSIGNED': return '#f59e0b';
                                case 'UPDATED': return '#a855f7';
                                case 'ATTACHMENT_ADDED': return '#10b981';
                                case 'ATTACHMENT_REMOVED': return '#ef4444';
                                default: return '#a1a1aa';
                              }
                            };

                            const getActionIcon = (action: string) => {
                              switch (action) {
                                case 'CREATED': return <PlusIcon style={{ width: '14px', height: '14px' }} />;
                                case 'STATUS_CHANGED': return <CheckCircle style={{ width: '14px', height: '14px' }} />;
                                case 'ASSIGNED': return <User style={{ width: '14px', height: '14px' }} />;
                                case 'UPDATED': return <Edit2 style={{ width: '14px', height: '14px' }} />;
                                case 'ATTACHMENT_ADDED': return <FileText style={{ width: '14px', height: '14px' }} />;
                                case 'ATTACHMENT_REMOVED': return <Trash2 style={{ width: '14px', height: '14px' }} />;
                                default: return <Activity style={{ width: '14px', height: '14px' }} />;
                              }
                            };

                            const formatAction = (action: string) => {
                              switch (action) {
                                case 'STATUS_CHANGED': return 'Status Changed';
                                case 'ATTACHMENT_ADDED': return 'Attachment Added';
                                case 'ATTACHMENT_REMOVED': return 'Attachment Removed';
                                default: return action.charAt(0) + action.slice(1).toLowerCase();
                              }
                            };

                            const getDescription = (log: ActivityLog) => {
                              if (log.action === 'STATUS_CHANGED') {
                                return `${log.oldValue} → ${log.newValue}`;
                              } else if (log.action === 'ASSIGNED') {
                                return log.newValue ? 'Assigned to user' : 'Unassigned';
                              } else if (log.action === 'UPDATED') {
                                try {
                                  const newData = log.newValue ? JSON.parse(log.newValue) : null;
                                  if (newData && newData.field) {
                                    const fieldName = newData.field.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase());
                                    return `${fieldName} updated`;
                                  }
                                } catch (e) { /* ignore */ }
                                return 'Updated';
                              } else if (log.action === 'ATTACHMENT_ADDED' || log.action === 'ATTACHMENT_REMOVED') {
                                try {
                                  const data = log.newValue || log.oldValue;
                                  if (data) {
                                    const parsed = JSON.parse(data);
                                    return parsed.fileName || 'File';
                                  }
                                } catch (e) { /* ignore */ }
                                return 'File';
                              }
                              return '';
                            };

                            const hasDiff = log.action === 'UPDATED' || log.action === 'STATUS_CHANGED';

                            return (
                              <motion.div 
                                key={log.id} 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 1 + (index * 0.05) }}
                                style={{ 
                                  display: 'flex', 
                                  gap: '12px', 
                                  padding: '12px', 
                                  backgroundColor: '#2d2d2d', 
                                  borderRadius: '8px',
                                  border: '1px solid #3f3f46'
                                }}
                              >
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  width: '32px', 
                                  height: '32px', 
                                  borderRadius: '50%', 
                                  backgroundColor: getActionColor(log.action) + '20',
                                  color: getActionColor(log.action),
                                  flexShrink: 0
                                }}>
                                  {getActionIcon(log.action)}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#f9fafb' }}>
                                        {log.user.name}
                                      </span>
                                      <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: '600', 
                                        color: getActionColor(log.action),
                                        backgroundColor: getActionColor(log.action) + '20',
                                        padding: '2px 8px',
                                        borderRadius: '10px'
                                      }}>
                                        {formatAction(log.action)}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#71717a' }}>
                                      {new Date(log.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p style={{ fontSize: '12px', color: '#a1a1aa', margin: '0 0 4px 0' }}>
                                    {log.testCase.caseNumber} • {log.testCase.title}
                                  </p>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
                                      {getDescription(log)}
                                    </p>
                                    {hasDiff && (
                                      <button
                                        onClick={() => {
                                          setCurrentDiff(log);
                                          setShowDiffModal(true);
                                        }}
                                        style={{
                                          fontSize: '11px',
                                          color: '#3b82f6',
                                          backgroundColor: 'transparent',
                                          border: '1px solid #3b82f640',
                                          borderRadius: '6px',
                                          padding: '4px 10px',
                                          cursor: 'pointer',
                                          fontWeight: '500'
                                        }}
                                      >
                                        View Diff
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            );
                          });
                        })()}
                      </div>
                      
                      {(() => {
                        const sortedLogs = [...activityLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        const totalPages = Math.ceil(sortedLogs.length / activityLogsPerPage);
                        
                        if (totalPages <= 1) return null;
                        
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', padding: '12px', backgroundColor: '#2d2d2d', borderRadius: '8px', border: '1px solid #3f3f46' }}>
                            <span style={{ fontSize: '13px', color: '#a1a1aa' }}>
                              Page {activityLogPage} of {totalPages}
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => setActivityLogPage(prev => Math.max(1, prev - 1))}
                                disabled={activityLogPage === 1}
                                style={{
                                  padding: '6px 16px',
                                  backgroundColor: activityLogPage === 1 ? '#3f3f46' : '#3b82f6',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: activityLogPage === 1 ? 'not-allowed' : 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                }}
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setActivityLogPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={activityLogPage === totalPages}
                                style={{
                                  padding: '6px 16px',
                                  backgroundColor: activityLogPage === totalPages ? '#3f3f46' : '#3b82f6',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: activityLogPage === totalPages ? 'not-allowed' : 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500',
                                }}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </motion.div>
              </>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px' 
              }}>
                <Users style={{ 
                  width: '64px', 
                  height: '64px', 
                  color: '#3f3f46', 
                  margin: '0 auto 16px' 
                }} />
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 8px 0' }}>
                  Select a Project
                </h3>
                <p style={{ fontSize: '14px', color: '#a1a1aa', margin: 0 }}>
                  Choose a project from the left to start sharing
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
      
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <AnimatePresence>
        {showDiffModal && currentDiff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              zIndex: 9999,
              overflowY: 'auto',
              padding: '20px',
            }} onClick={() => setShowDiffModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: 'spring' }}
              style={{
                backgroundColor: '#1f1f1f',
                padding: '32px',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '800px',
                margin: 'auto 0',
              }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Change Details</h2>
                <button
                  onClick={() => setShowDiffModal(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#71717a',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#2d2d2d', padding: '16px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', color: '#ef4444' }}>Old Value</h3>
                  <pre style={{ 
                    fontSize: '12px', 
                    color: '#a1a1aa', 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    backgroundColor: '#1f1f1f',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #3f3f46'
                  }}>
                    {(() => {
                      try {
                        if (!currentDiff.oldValue) return '-';
                        const parsed = JSON.parse(currentDiff.oldValue);
                        return parsed.value !== undefined ? String(parsed.value) : currentDiff.oldValue;
                      } catch {
                        return currentDiff.oldValue || '-';
                      }
                    })()}
                  </pre>
                </div>
                <div style={{ backgroundColor: '#2d2d2d', padding: '16px', borderRadius: '8px', border: '1px solid #3f3f46' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px 0', color: '#22c55e' }}>New Value</h3>
                  <pre style={{ 
                    fontSize: '12px', 
                    color: '#a1a1aa', 
                    margin: 0, 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    backgroundColor: '#1f1f1f',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #3f3f46'
                  }}>
                    {(() => {
                      try {
                        if (!currentDiff.newValue) return '-';
                        const parsed = JSON.parse(currentDiff.newValue);
                        return parsed.value !== undefined ? String(parsed.value) : currentDiff.newValue;
                      } catch {
                        return currentDiff.newValue || '-';
                      }
                    })()}
                  </pre>
                </div>
              </div>
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <button
                  onClick={() => setShowDiffModal(false)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShareConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px',
            }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: 'spring' }}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
              }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>
                Send Invitation?
              </h3>
              <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
                Are you sure you want to invite <span style={{ color: '#ffffff', fontWeight: '500' }}>{showShareConfirm.userName}</span> to <span style={{ color: '#ffffff', fontWeight: '500' }}>{showShareConfirm.projectName}</span>?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowShareConfirm(null)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#a1a1aa',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSendInvitation}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#22c55e',
                    color: '#000000',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Yes, Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}