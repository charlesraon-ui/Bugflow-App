'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Pencil, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useProjectStore } from '@/stores/useProjectStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageTransition from '@/components/PageTransition';

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
  status: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  createdById: number;
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  members: ProjectMember[];
  testCases: TestCase[];
}

interface Attachment {
  id: number;
  fileName: string;
  fileType: string;
  url?: string;
}

interface TestCase {
  id: number;
  projectId: number;
  caseNumber: string;
  version?: string | null;
  title: string;
  status: string;
  severity: string;
  priority: string;
  issueType: string;
  expectedResult?: string | null;
  actualResult?: string | null;
  testData?: string | null;
  stepsToReproduce?: string | null;
  assignedToId?: number | null;
  assignedTo?: { id: number; name: string } | null;
  attachments?: Attachment[];
  rootCause?: string | null;
  actionPlan?: string | null;
  developerSolution?: string | null;
  developerPushDate?: string | null;
  verifiedById?: number | null;
  verifiedBy?: { id: number; name: string } | null;
  verificationDate?: string | null;
  comments?: string | null;
  logsDate: string;
  createdById: number;
  createdBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CustomFields {
  severity: string;
  priority: string;
  issueType: string;
  status: string;
}

interface NewTestCase {
  title: string;
  version: string;
  expectedResult: string;
  actualResult: string;
  testData: string;
  stepsToReproduce: string;
  severity: string;
  priority: string;
  issueType: string;
  status: string;
  rootCause: string;
  actionPlan: string;
  developerSolution: string;
  comments: string;
  assignedToId: number | null;
  developerPushDate: string;
  verifiedById: number | null;
  verificationDate: string;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.id as string;
  const from = searchParams.get('from');
  
  // Determine back link and text
  const backLink = from === 'completed' ? '/dashboard/completed' 
    : from === 'archive' ? '/dashboard/archive' 
    : '/dashboard';
  const backText = from === 'completed' ? 'Back to Completed' 
    : from === 'archive' ? 'Back to Archive' 
    : 'Back to Dashboard';
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const { fetchProjects } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [newTestCase, setNewTestCase] = useState<NewTestCase>({
    title: '',
    version: '',
    expectedResult: '',
    actualResult: '',
    testData: '',
    stepsToReproduce: '',
    severity: '',
    priority: '',
    issueType: '',
    status: '',
    rootCause: '',
    actionPlan: '',
    developerSolution: '',
    comments: '',
    assignedToId: null,
    developerPushDate: '',
    verifiedById: null,
    verificationDate: '',
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentLinks, setAttachmentLinks] = useState<string[]>([]);
  const [newLink, setNewLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [customFields, setCustomFields] = useState<CustomFields>({
    severity: '',
    priority: '',
    issueType: '',
    status: '',
  });
  const [currentTestCasePage, setCurrentTestCasePage] = useState(1);
  const testCasesPerPage = 50;
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({ name: '', description: '' });
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  
  const getUserRole = () => {
    if (!project || !user) return 'viewer';
    
    if (project.createdById === user.id) {
      return 'author';
    }
    
    const member = project.members.find(m => m.userId === user.id);
    return member?.role || 'viewer';
  };
  
  const userRole = getUserRole();
  
  // Body scroll lock for modals
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (showForm || showEndConfirm || showDeleteConfirm || showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showForm, showEndConfirm, showDeleteConfirm, showEditModal]);

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${projectId}`);
      setProject(res.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumeProject = async () => {
    try {
      await api.put(`/projects/${projectId}/resume`);
      router.push('/dashboard/archive');
    } catch (error) {
      console.error('Failed to resume project:', error);
    }
  };

  const deleteProject = async () => {
    try {
      await api.delete(`/projects/${projectId}`);
      router.push('/dashboard/archive');
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const completeProject = async () => {
    try {
      const updatedProject = await api.put(`/projects/${projectId}`, { status: 'completed' });
      setProject(prev => prev ? { ...prev, ...updatedProject.data } : updatedProject.data);
      await fetchProjects();
      setShowCompleteConfirm(false);
      addNotification({
        type: 'success',
        message: 'Project marked as completed!'
      });
      router.push('/dashboard/completed');
    } catch (error) {
      console.error('Failed to complete project:', error);
      addNotification({
        type: 'error',
        message: getErrorMessage(error)
      });
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedProject = await api.put(`/projects/${projectId}`, editProjectForm);
      setProject(prev => prev ? { ...prev, ...updatedProject.data } : updatedProject.data);
      await fetchProjects();
      setShowEditModal(false);
      addNotification({
        type: 'success',
        message: 'Project details updated successfully!'
      });
    } catch (error) {
      console.error('Failed to update project:', error);
      addNotification({
        type: 'error',
        message: getErrorMessage(error)
      });
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);
  
  useEffect(() => {
    if (userRole === 'viewer') {
      setShowForm(false);
    }
  }, [userRole]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (showForm) setShowForm(false);
        if (showEditModal) setShowEditModal(false);
        if (showEndConfirm) setShowEndConfirm(false);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showEditModal, showEndConfirm, showDeleteConfirm]);

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const testCaseData = {
        ...newTestCase,
        projectId: Number(projectId),
        severity: newTestCase.severity === 'CUSTOM' ? customFields.severity : newTestCase.severity,
        priority: newTestCase.priority === 'CUSTOM' ? customFields.priority : newTestCase.priority,
        issueType: newTestCase.issueType === 'CUSTOM' ? customFields.issueType : newTestCase.issueType,
        status: newTestCase.status === 'CUSTOM' ? customFields.status : newTestCase.status,
      };
      
      const testCaseRes = await api.post('/test-cases', testCaseData);
      
      const testCaseId = testCaseRes.data.id;
      
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('testCaseId', testCaseId.toString());
        
        await api.post('/attachments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      for (const link of attachmentLinks) {
        await api.post('/attachments', {
          testCaseId: testCaseId,
          url: link,
          fileName: link,
          fileType: 'link',
        });
      }
      
      setShowForm(false);
      setNewTestCase({
        title: '',
        version: '',
        expectedResult: '',
        actualResult: '',
        testData: '',
        stepsToReproduce: '',
        severity: '',
        priority: '',
        issueType: '',
        status: '',
        rootCause: '',
        actionPlan: '',
        developerSolution: '',
        comments: '',
        assignedToId: null as number | null,
        developerPushDate: '',
        verifiedById: null as number | null,
        verificationDate: '',
      });
      setCustomFields({
        severity: '',
        priority: '',
        issueType: '',
        status: '',
      });
      setSelectedFiles([]);
      setAttachmentLinks([]);
      setNewLink('');
      fetchProject();
      addNotification({
        message: 'Test case created successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to create test case:', error);
      addNotification({
        message: getErrorMessage(error),
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getTestSummary = () => {
    if (!project) return { total: 0, passed: 0, failed: 0, blocked: 0, toDiscuss: 0, adjustment: 0 };
    const testCases = project.testCases || [];
    return {
      total: testCases.length,
      passed: testCases.filter(tc => tc.status === 'PASS').length,
      failed: testCases.filter(tc => tc.status === 'FAILED').length,
      blocked: testCases.filter(tc => tc.status === 'BLOCKED').length,
      toDiscuss: testCases.filter(tc => tc.status === 'TO_DISCUSS').length,
      adjustment: testCases.filter(tc => tc.issueType === 'ADJUSTMENT').length,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN': return '#3b82f6';
      case 'TO_FIX': return '#eab308';
      case 'FOR_QA': return '#a855f7';
      case 'PASS': return '#22c55e';
      case 'FAILED': return '#ef4444';
      case 'CLOSED': return '#6b7280';
      case 'BLOCKED': return '#f87171';
      case 'TO_DISCUSS': return '#f472b6';
      default: return '#8b5cf6';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#fbbf24';
      case 'LOW': return '#22c55e';
      default: return '#06b6d4';
    }
  };

  const endProject = async () => {
    try {
      await api.put(`/projects/${projectId}/archive`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to end project:', error);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div style={{ padding: '32px', backgroundColor: '#0a0a0a', color: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <LoadingSpinner size="lg" />
          <p style={{ fontSize: '20px', color: '#a1a1aa' }}>Loading...</p>
        </div>
      </PageTransition>
    );
  }

  if (!project) {
    return (
      <PageTransition>
        <div style={{ padding: '32px', backgroundColor: '#0a0a0a', color: '#ffffff', minHeight: '100vh' }}>
          <p style={{ fontSize: '20px', color: '#a1a1aa' }}>Project not found</p>
        </div>
      </PageTransition>
    );
  }

  const summary = getTestSummary();

  return (
    <PageTransition>
      <div style={{ padding: '20px', backgroundColor: '#0f0f0f', color: '#ffffff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link href={backLink} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a', textDecoration: 'none', transition: 'color 0.2s ease', fontWeight: '500', fontSize: '14px' }}>
          <ArrowLeft style={{ width: '20px', height: '20px' }} />
          <span>{backText}</span>
        </Link>
      </div>

      {/* 100% Complete Banner */}
      {summary.total > 0 && summary.passed === summary.total && project.status !== 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 16px rgba(22, 163, 74, 0.25)',
            border: '1px solid #16a34a'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 style={{ width: '28px', height: '28px', color: '#bbf7d0' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#ffffff' }}>All Test Cases Passed</h3>
              <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: '#bbf7d0' }}>Your project has successfully passed all tests</p>
            </div>
          </div>
          {(userRole === 'author' || userRole === 'editor') && (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              style={{
                padding: '10px 24px',
                background: '#ffffff',
                color: '#16a34a',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
              }}
            >
              Mark as Completed
            </button>
          )}
        </motion.div>
      )}

      {/* Project Completed Banner */}
      {project.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(22, 163, 74, 0.25)',
            border: '1px solid #16a34a'
          }}
        >
          <CheckCircle2 style={{ width: '20px', height: '20px', color: '#bbf7d0' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff' }}>Project Completed</span>
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>{project.name}</h1>
            {(userRole === 'author' || userRole === 'editor') && (
              <button
                onClick={() => {
                  setEditProjectForm({
                    name: project.name,
                    description: project.description || ''
                  });
                  setShowEditModal(true);
                }}
                style={{
                  backgroundColor: '#27272a',
                  color: '#a1a1aa',
                  border: '1px solid #3f3f46',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3f3f46';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#27272a';
                  e.currentTarget.style.color = '#a1a1aa';
                }}
              >
                <Pencil style={{ width: '18px', height: '18px' }} />
              </button>
            )}
          </div>
          <p style={{ fontSize: '14px', color: '#71717a', margin: '0 0 4px 0' }}>{project.description || 'No description provided'}</p>
          <p style={{ fontSize: '13px', color: '#52525b', margin: 0 }}>Date Created: {new Date(project.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
          {project.createdById !== user?.id && (
            <div style={{ marginTop: '14px', padding: '10px 18px', background: 'linear-gradient(135deg, #1e293b 0%, #1a2332 100%)', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '10px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>Shared by:</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>{project.createdBy.name}</span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>•</span>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '800', 
                padding: '5px 14px', 
                borderRadius: '14px',
                backgroundColor: userRole === 'author' ? '#facc15' : userRole === 'editor' ? '#3b82f6' : '#6b7280',
                color: userRole === 'author' ? '#000000' : '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {userRole === 'author' ? 'Full Access' : userRole === 'editor' ? 'Edit Access' : 'View Only'}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {project.isArchived ? (
            userRole === 'author' && (
              <>
                <button
                  onClick={resumeProject}
                  style={{
                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: '700',
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  RESUME PROJECT
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: '700',
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  DELETE PROJECT
                </button>
              </>
            )
          ) : (
            <>
              {userRole === 'author' && (
                <button
                  onClick={() => setShowEndConfirm(true)}
                  style={{
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#ffffff',
                    fontSize: '15px',
                    fontWeight: '700',
                    padding: '14px 24px',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)'
                  }}
                >
                  END PROJECT
                </button>
              )}
              {(userRole === 'author' || userRole === 'editor') && project.status !== 'completed' && (
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                    color: '#000000',
                    fontSize: '16px',
                    fontWeight: '800',
                    padding: '16px 32px',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 4px 20px rgba(250, 204, 21, 0.4)'
                  }}
                >
                  <Plus style={{ width: '26px', height: '26px' }} />
                  NEW TEST CASE
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              style={{ backgroundColor: '#1f1f1f', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '1400px', maxHeight: '95vh', overflowY: 'auto' }}
            >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px 0' }}>Create New Test Case</h2>
            <form onSubmit={handleCreateTestCase} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Test Name *</label>
                    <input type="text" value={newTestCase.title} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, title: e.target.value }))} required style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Version</label>
                    <input type="text" value={newTestCase.version} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, version: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Steps to Reproduce</label>
                  <textarea value={newTestCase.stepsToReproduce} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, stepsToReproduce: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Test Data</label>
                  <textarea value={newTestCase.testData} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, testData: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Expected Result</label>
                    <textarea value={newTestCase.expectedResult} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, expectedResult: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Actual Result</label>
                    <textarea value={newTestCase.actualResult} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, actualResult: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Severity</label>
                    <select value={newTestCase.severity} onChange={(e) => { setNewTestCase((prev: NewTestCase) => ({ ...prev, severity: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, severity: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                      <option value="" disabled hidden>Select Severity</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {newTestCase.severity === 'CUSTOM' && <input type="text" value={customFields.severity} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, severity: e.target.value }))} placeholder="Enter custom severity..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Priority</label>
                    <select value={newTestCase.priority} onChange={(e) => { setNewTestCase((prev: NewTestCase) => ({ ...prev, priority: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, priority: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                      <option value="" disabled hidden>Select Priority</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {newTestCase.priority === 'CUSTOM' && <input type="text" value={customFields.priority} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, priority: e.target.value }))} placeholder="Enter custom priority..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Issue Type</label>
                    <select value={newTestCase.issueType} onChange={(e) => { setNewTestCase((prev: NewTestCase) => ({ ...prev, issueType: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, issueType: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                      <option value="" disabled hidden>Select Issue Type</option>
                      <option value="BUG">BUG</option>
                      <option value="FEATURE">FEATURE</option>
                      <option value="ENHANCEMENT">ENHANCEMENT</option>
                      <option value="DOCUMENTATION">DOCUMENTATION</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {newTestCase.issueType === 'CUSTOM' && <input type="text" value={customFields.issueType} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, issueType: e.target.value }))} placeholder="Enter custom issue type..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                  <select value={newTestCase.status} onChange={(e) => { setNewTestCase((prev: NewTestCase) => ({ ...prev, status: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, status: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                    <option value="" disabled hidden>Select Status</option>
                    <option value="OPEN">OPEN</option>
                    <option value="TO_FIX">TO FIX</option>
                    <option value="FOR_QA">FOR QA</option>
                    <option value="PASS">PASSED</option>
                    <option value="FAILED">FAILED</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="BLOCKED">BLOCKED</option>
                    <option value="TO_DISCUSS">TO DISCUSS</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                  {newTestCase.status === 'CUSTOM' && <input type="text" value={customFields.status} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, status: e.target.value }))} placeholder="Enter custom status..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Root Cause</label>
                    <textarea value={newTestCase.rootCause} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, rootCause: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Action Plan</label>
                    <textarea value={newTestCase.actionPlan} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, actionPlan: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Developer Solution</label>
                    <textarea value={newTestCase.developerSolution} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, developerSolution: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Comments</label>
                    <textarea value={newTestCase.comments} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, comments: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '8px', padding: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0' }}>Development & Verification</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Assigned To</label>
                      <select value={newTestCase.assignedToId || ''} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, assignedToId: e.target.value ? parseInt(e.target.value) : null }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                        <option value="" disabled hidden>Select user...</option>
                        {project?.members?.map((member: ProjectMember) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
                        {project?.createdBy && <option key={project.createdBy.id} value={project.createdBy.id}>{project.createdBy.name} (Owner)</option>}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Developer Push Date</label>
                      <input type="date" value={newTestCase.developerPushDate} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, developerPushDate: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Verified By</label>
                      <select value={newTestCase.verifiedById || ''} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, verifiedById: e.target.value ? parseInt(e.target.value) : null }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                        <option value="" disabled hidden>Select user...</option>
                        {project?.members?.map((member: ProjectMember) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
                        {project?.createdBy && <option key={project.createdBy.id} value={project.createdBy.id}>{project.createdBy.name} (Owner)</option>}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Verification Date</label>
                      <input type="date" value={newTestCase.verificationDate} onChange={(e) => setNewTestCase((prev: NewTestCase) => ({ ...prev, verificationDate: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Attachments</label>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Upload Files
                      <input type="file" multiple onChange={(e) => { if (e.target.files) setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]); }} style={{ display: 'none' }} />
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                      <input type="text" value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="Paste link (Google Drive, Dropbox, etc.)" style={{ flex: 1, padding: '12px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                      <button type="button" onClick={() => { if (newLink.trim()) { setAttachmentLinks([...attachmentLinks, newLink.trim()]); setNewLink(''); } }} disabled={!newLink.trim()} style={{ padding: '12px 20px', fontSize: '14px', fontWeight: '600', backgroundColor: !newLink.trim() ? '#52525b' : '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: !newLink.trim() ? 'not-allowed' : 'pointer' }}>Add Link</button>
                    </div>
                  </div>
                  {selectedFiles.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>{selectedFiles.map((file, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '13px', color: '#ffffff' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>{file.name}<button type="button" onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))} style={{ padding: 0, backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button></div>)}</div>}
                  {attachmentLinks.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{attachmentLinks.map((link, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '13px', color: '#ffffff' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>{link.length > 40 ? link.substring(0, 40) + '...' : link}<button type="button" onClick={() => setAttachmentLinks(attachmentLinks.filter((_, i) => i !== index))} style={{ padding: 0, backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button></div>)}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', gridColumn: '1 / -1' }}>
                <button type="button" onClick={() => setShowForm(false)} disabled={isCreating} style={{ padding: '10px 20px', fontSize: '14px', backgroundColor: 'transparent', color: isCreating ? '#52525b' : '#a1a1aa', border: '1px solid #3f3f46', borderRadius: '6px', cursor: isCreating ? 'not-allowed' : 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isCreating} style={{ padding: '10px 24px', fontSize: '14px', fontWeight: '600', backgroundColor: isCreating ? '#52525b' : '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: isCreating ? 'not-allowed' : 'pointer' }}>{isCreating ? 'Creating...' : 'Create Test Case'}</button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ 
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
        borderRadius: '10px 10px 0 0', 
        padding: '14px', 
        textAlign: 'center', 
        border: '1px solid #1d4ed8',
        boxShadow: '0 1px 3px rgba(37, 99, 235, 0.3)'
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Test Summary</h2>
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '14px', 
        background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
        border: '1px solid #3f3f46', 
        borderTop: 'none',
        borderRadius: '0 0 10px 10px', 
        padding: '18px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%)', 
          borderRadius: '10px', 
          padding: '16px', 
          textAlign: 'center',
          border: '1px solid #d4d4d8',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0', color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total Tests</p>
          <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#09090b' }}>{summary.total}</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
          borderRadius: '10px', 
          padding: '16px', 
          textAlign: 'center',
          border: '1px solid #86efac',
          boxShadow: '0 1px 3px rgba(22, 163, 74, 0.2)'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Passed Tests</p>
          <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#14532d' }}>{summary.passed}</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', 
          borderRadius: '10px', 
          padding: '16px', 
          textAlign: 'center',
          border: '1px solid #fca5a5',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.2)'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Failed Tests</p>
          <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#7f1d1d' }}>{summary.failed}</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #ffcccc 0%, #fecaca 100%)', 
          borderRadius: '10px', 
          padding: '16px', 
          textAlign: 'center',
          border: '1px solid #fca5a5',
          boxShadow: '0 1px 3px rgba(220, 38, 38, 0.2)'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Blocked Tests</p>
          <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#7f1d1d' }}>{summary.blocked}</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)', 
          borderRadius: '10px', 
          padding: '16px', 
          textAlign: 'center',
          border: '1px solid #c4b5fd',
          boxShadow: '0 1px 3px rgba(124, 58, 237, 0.2)'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.4px' }}>To Discuss</p>
          <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#581c87' }}>{summary.toDiscuss}</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
          borderRadius: '10px', 
          padding: '16px', 
          textAlign: 'center',
          border: '1px solid #93c5fd',
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.2)'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', margin: '0 0 8px 0', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Adjustment Tests</p>
          <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1e3a8a' }}>{summary.adjustment}</p>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 20px 0', letterSpacing: '-0.3px' }}>Test Cases</h2>
        {project.testCases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', backgroundColor: '#1f1f1f', border: '2px dashed #3f3f46', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 12px 0' }}>No test cases yet!</h3>
            <p style={{ fontSize: '18px', color: '#a1a1aa', margin: '0 0 32px 0' }}>
              {project.isArchived ? 'This project is archived.' : 'Create your first test case to get started!'}
            </p>
            {!project.isArchived && (userRole === 'author' || userRole === 'editor') && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  backgroundColor: '#facc15',
                  color: '#000000',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  padding: '20px 40px',
                  border: '4px solid #ca8a04',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 4px 20px rgba(250, 204, 21, 0.5)',
                }}
              >
                <Plus style={{ width: '28px', height: '28px' }} />
                Create Your First Test Case
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', backgroundColor: '#1f1f1f', border: '1px solid #3f3f46', borderRadius: '8px', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%' }}>
                <thead style={{ backgroundColor: '#2d2d2d' }}>
                  <tr>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '100px', verticalAlign: 'top' }}>Test Case ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '150px', verticalAlign: 'top' }}>Test Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '200px', verticalAlign: 'top' }}>Steps to Reproduce</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '150px', verticalAlign: 'top' }}>Expected Result</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '150px', verticalAlign: 'top' }}>Actual Result</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '80px', verticalAlign: 'top' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '80px', verticalAlign: 'top' }}>Severity</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#a1a1aa', borderBottom: '1px solid #3f3f46', minWidth: '100px', verticalAlign: 'top' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const sortedTestCases = [...project.testCases].sort((a, b) => {
                      const getNum = (caseNum?: string) => {
                        if (!caseNum) return 0;
                        const match = caseNum.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                      };
                      return getNum(a.caseNumber) - getNum(b.caseNumber);
                    });
                    
                    const indexOfLastTestCase = currentTestCasePage * testCasesPerPage;
                    const indexOfFirstTestCase = indexOfLastTestCase - testCasesPerPage;
                    const currentTestCases = sortedTestCases.slice(indexOfFirstTestCase, indexOfLastTestCase);
                    
                    return currentTestCases.map((testCase) => (
                      <tr 
                        key={testCase.id} 
                        style={{ 
                          cursor: 'pointer', 
                          transition: 'all 0.2s ease',
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2d2d2d';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={() => router.push(`/dashboard/projects/${projectId}/test-cases/${testCase.id}`)}
                      >
                        <td style={{ padding: '12px', fontSize: '14px', borderBottom: '1px solid #3f3f46', fontWeight: '600', color: '#ffffff', verticalAlign: 'top' }}>{testCase.caseNumber}</td>
                        <td style={{ padding: '12px', fontSize: '14px', borderBottom: '1px solid #3f3f46', fontWeight: '600', color: '#ffffff', verticalAlign: 'top' }}>{testCase.title}</td>
                        <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #3f3f46', color: '#a1a1aa', whiteSpace: 'pre-wrap', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.stepsToReproduce || '-'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #3f3f46', color: '#a1a1aa', whiteSpace: 'pre-wrap', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.expectedResult || '-'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #3f3f46', color: '#a1a1aa', whiteSpace: 'pre-wrap', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.actualResult || '-'}</td>
                        <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #3f3f46', verticalAlign: 'top' }}>
                          <span style={{ 
                            backgroundColor: getStatusColor(testCase.status), 
                            color: testCase.status === 'PASS' ? '#000' : '#fff', 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {testCase.status === 'PASS' ? 'PASSED' : testCase.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #3f3f46', verticalAlign: 'top' }}>
                          <span style={{ 
                            backgroundColor: getSeverityColor(testCase.severity), 
                            color: testCase.severity === 'LOW' ? '#000' : '#fff', 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px', 
                            fontWeight: '600',
                            display: 'inline-block',
                            whiteSpace: 'nowrap'
                          }}>
                            {testCase.severity}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', borderBottom: '1px solid #3f3f46', color: '#a1a1aa', whiteSpace: 'pre-wrap', verticalAlign: 'top', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.comments || '-'}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {(() => {
              const totalTestPages = Math.ceil(project.testCases.length / testCasesPerPage);
              if (totalTestPages <= 1) return null;
              
              return (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '24px',
                  paddingTop: '24px',
                  borderTop: '1px solid #3f3f46',
                }}>
                  <button
                    onClick={() => setCurrentTestCasePage(p => Math.max(1, p - 1))}
                    disabled={currentTestCasePage === 1}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: currentTestCasePage === 1 ? '#52525b' : '#2d2d2d',
                      color: '#ffffff',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      cursor: currentTestCasePage === 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Previous
                  </button>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Array.from({ length: totalTestPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentTestCasePage(page)}
                        style={{
                          padding: '8px 14px',
                          backgroundColor: currentTestCasePage === page ? '#3b82f6' : '#2d2d2d',
                          color: '#ffffff',
                          border: currentTestCasePage === page ? '1px solid #3b82f6' : '1px solid #3f3f46',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setCurrentTestCasePage(p => Math.min(totalTestPages, p + 1))}
                    disabled={currentTestCasePage === totalTestPages}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: currentTestCasePage === totalTestPages ? '#52525b' : '#2d2d2d',
                      color: '#ffffff',
                      border: '1px solid #3f3f46',
                      borderRadius: '6px',
                      cursor: currentTestCasePage === totalTestPages ? 'not-allowed' : 'pointer',
                      fontWeight: '500',
                    }}
                  >
                    Next
                  </button>
                  
                  <span style={{ color: '#a1a1aa', fontSize: '14px' }}>
                    Page {currentTestCasePage} of {totalTestPages}
                  </span>
                </div>
              );
            })()}
          </>
        )}
      </div>

      <AnimatePresence>
        {showEditModal && (
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
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              style={{
                backgroundColor: '#1f1f1f',
                padding: '32px',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '600px',
                margin: 'auto 0',
              }}
            >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Edit Project</h2>
              <button
                onClick={() => setShowEditModal(false)}
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
                <X style={{ width: '24px', height: '24px' }} />
              </button>
            </div>
            <form onSubmit={handleEditProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Project Name *</label>
                <input
                  type="text"
                  value={editProjectForm.name}
                  onChange={(e) => setEditProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Description</label>
                <textarea
                  value={editProjectForm.description}
                  onChange={(e) => setEditProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#ffffff',
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#a1a1aa',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 28px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEndConfirm && (
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
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '28px',
                width: '100%',
                maxWidth: '450px',
              }}
            >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#ef4444' }}>
              End Project?
            </h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
              Are you sure you want to end <span style={{ color: '#ffffff', fontWeight: '500' }}>{project.name}</span>? This will move it to Archive. You can resume it later or delete it permanently from there.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowEndConfirm(false)}
                style={{
                  padding: '10px 24px',
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
                onClick={endProject}
                style={{
                  padding: '10px 28px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Yes, End Project
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
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
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '28px',
                width: '100%',
                maxWidth: '450px',
              }}
            >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#ef4444' }}>
              Delete Project?
            </h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
              Are you sure you want to delete <span style={{ color: '#ffffff', fontWeight: '500' }}>{project.name}</span>? This action cannot be undone! All test cases and data will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '10px 24px',
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
                onClick={deleteProject}
                style={{
                  padding: '10px 28px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Yes, Delete Permanently
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompleteConfirm && (
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
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05, y: -20 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '28px',
                width: '100%',
                maxWidth: '450px',
              }}
            >
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#22c55e' }}>
              Mark Project as Completed?
            </h3>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
              Are you sure you want to mark <span style={{ color: '#ffffff', fontWeight: '500' }}>{project.name}</span> as completed? This will update the project status.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCompleteConfirm(false)}
                style={{
                  padding: '10px 24px',
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
                onClick={completeProject}
                style={{
                  padding: '10px 28px',
                  backgroundColor: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Yes, Mark as Completed
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  );
}
