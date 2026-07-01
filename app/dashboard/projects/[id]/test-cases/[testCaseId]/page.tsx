'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageTransition from '@/components/PageTransition';

interface User {
  id: number;
  name: string;
  email: string;
}

interface TestCase {
  id: number;
  caseNumber: string;
  version: string;
  title: string;
  expectedResult: string | null;
  actualResult: string | null;
  testData: string | null;
  stepsToReproduce: string | null;
  severity: string;
  priority: string;
  issueType: string;
  status: string;
  assignedTo: { id: number; name: string } | null;
  attachments: Attachment[];
  rootCause: string | null;
  actionPlan: string | null;
  developerSolution: string | null;
  developerPushDate: string | null;
  verifiedBy: { id: number; name: string } | null;
  verificationDate: string | null;
  comments: string | null;
  logsDate: string;
  createdBy: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

interface Attachment {
  id: number;
  fileName: string;
  fileType: string;
  url?: string;
  createdAt: string;
}

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
  createdBy: User;
  createdById: number;
  members: ProjectMember[];
  isArchived: boolean;
  status: string;
}

interface CustomFields {
  severity: string;
  priority: string;
  issueType: string;
  status: string;
}

interface EditData {
  title?: string;
  version?: string;
  stepsToReproduce?: string | null;
  testData?: string | null;
  expectedResult?: string | null;
  actualResult?: string | null;
  severity?: string;
  priority?: string;
  issueType?: string;
  status?: string;
  rootCause?: string | null;
  actionPlan?: string | null;
  developerSolution?: string | null;
  comments?: string | null;
  assignedToId?: number | null;
  developerPushDate?: string | null;
  verifiedById?: number | null;
  verificationDate?: string | null;
}

export default function TestCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const testCaseId = params.testCaseId as string;
  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const { addNotification } = useNotificationStore();
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState<EditData>({});
  const [editSelectedFiles, setEditSelectedFiles] = useState<File[]>([]);
  const [editAttachmentLinks, setEditAttachmentLinks] = useState<string[]>([]);
  const [editNewLink, setEditNewLink] = useState('');
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<number[]>([]);
  const [customFields, setCustomFields] = useState<CustomFields>({
    severity: '',
    priority: '',
    issueType: '',
    status: '',
  });
  
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
    if (showForm || showDeleteConfirm || previewAttachment) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showForm, showDeleteConfirm, previewAttachment]);

  const fetchProject = async () => {
    try {
      const response = await api.get(`/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      addNotification({
        message: getErrorMessage(error),
        type: 'error',
      });
    }
  };

  const fetchTestCase = async () => {
    try {
      const response = await api.get(`/test-cases/${testCaseId}`);
      setTestCase(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Failed to fetch test case:', error);
      addNotification({
        message: getErrorMessage(error),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestCase = async () => {
    try {
      await api.delete(`/test-cases/${testCaseId}`);
      addNotification({
        message: 'Test case deleted successfully!',
        type: 'success',
      });
      router.push(`/dashboard/projects/${projectId}`);
    } catch (error) {
      console.error('Failed to delete test case:', error);
      addNotification({
        message: getErrorMessage(error),
        type: 'error',
      });
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
    if (testCaseId) {
      fetchTestCase();
    }
  }, [projectId, testCaseId]);

  useEffect(() => {
    if (project?.isArchived || project?.status === 'completed' || userRole === 'viewer') {
      setShowForm(false);
    }
  }, [project?.isArchived, project?.status, userRole]);

  // Keyboard shortcuts - Escape to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showForm) setShowForm(false);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (previewAttachment) setPreviewAttachment(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showDeleteConfirm, previewAttachment]);

  const handleUpdateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const dataToUpdate = {
        ...editData,
        severity: editData.severity === 'CUSTOM' ? customFields.severity : editData.severity,
        priority: editData.priority === 'CUSTOM' ? customFields.priority : editData.priority,
        issueType: editData.issueType === 'CUSTOM' ? customFields.issueType : editData.issueType,
        status: editData.status === 'CUSTOM' ? customFields.status : editData.status,
      };

      await api.put(`/test-cases/${testCaseId}`, dataToUpdate);
      
      for (const file of editSelectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('testCaseId', testCaseId.toString());
        
        await api.post('/attachments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }
      
      for (const link of editAttachmentLinks) {
        await api.post('/attachments', {
          testCaseId: parseInt(testCaseId),
          url: link,
          fileName: link,
          fileType: 'link',
        });
      }
      
      for (const attachmentId of attachmentsToDelete) {
        await api.delete(`/attachments/${attachmentId}`);
      }
      
      setShowForm(false);
      setEditSelectedFiles([]);
      setEditAttachmentLinks([]);
      setEditNewLink('');
      setExistingAttachments([]);
      setAttachmentsToDelete([]);
      setCustomFields({ severity: '', priority: '', issueType: '', status: '' });
      fetchTestCase();
      addNotification({
        message: 'Test case updated successfully!',
        type: 'success',
      });
    } catch (error) {
      console.error('Failed to update test case:', error);
      addNotification({
        message: 'Failed to update test case',
        type: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return '#3b82f6';
      case 'TO_FIX': return '#eab308';
      case 'FOR_QA': return '#a855f7';
      case 'PASS': return '#22c55e';
      case 'FAILED': return '#ef4444';
      case 'CLOSED': return '#6b7280';
      case 'BLOCKED': return '#f87171';
      case 'TO_DISCUSS': return '#f472b6';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#fbbf24';
      case 'LOW': return '#22c55e';
      default: return '#6b7280';
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

  if (!testCase) {
    return (
      <PageTransition>
        <div style={{ padding: '32px', backgroundColor: '#0a0a0a', color: '#ffffff', minHeight: '100vh' }}>
          <p style={{ fontSize: '20px', color: '#a1a1aa' }}>Test case not found</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={{ padding: '20px', backgroundColor: '#0f0f0f', color: '#ffffff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <Link href={`/dashboard/projects/${projectId}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a', textDecoration: 'none', transition: 'color 0.2s ease', fontWeight: '500', fontSize: '14px' }}>
          <ArrowLeft style={{ width: '20px', height: '20px' }} />
          <span>Back to Project</span>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>{testCase.caseNumber}</h1>
          <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>{testCase.title}</p>
        </div>

        {!project?.isArchived && project?.status !== 'completed' && (userRole === 'author' || userRole === 'editor') && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                if (testCase) {
                  setExistingAttachments([...testCase.attachments]);
                  setAttachmentsToDelete([]);
                }
                setShowForm(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '700',
                padding: '12px 22px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(250, 204, 21, 0.3)'
              }}
            >
              <Edit2 size={20} />
              EDIT TEST CASE
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                padding: '12px 22px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              DELETE TEST CASE
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
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
              backgroundColor: 'rgba(0,0,0,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
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
                maxWidth: '1400px',
                maxHeight: '95vh',
                overflowY: 'auto',
              }}
            >
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 24px 0' }}>Edit Test Case</h2>
            <form onSubmit={handleUpdateTestCase} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Test Name *</label>
                    <input type="text" value={editData.title || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, title: e.target.value }))} required style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Version</label>
                    <input type="text" value={editData.version || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, version: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Steps to Reproduce</label>
                  <textarea value={editData.stepsToReproduce || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, stepsToReproduce: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Test Data</label>
                  <textarea value={editData.testData || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, testData: e.target.value }))} rows={3} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Expected Result</label>
                    <textarea value={editData.expectedResult || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, expectedResult: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Actual Result</label>
                    <textarea value={editData.actualResult || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, actualResult: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Severity</label>
                    <select value={editData.severity || ''} onChange={(e) => { setEditData((prev: EditData) => ({ ...prev, severity: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, severity: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                      <option value="" disabled hidden>Select Severity</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {editData.severity === 'CUSTOM' && <input type="text" value={customFields.severity} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, severity: e.target.value }))} placeholder="Enter custom severity..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Priority</label>
                    <select value={editData.priority || ''} onChange={(e) => { setEditData((prev: EditData) => ({ ...prev, priority: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, priority: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                      <option value="" disabled hidden>Select Priority</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {editData.priority === 'CUSTOM' && <input type="text" value={customFields.priority} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, priority: e.target.value }))} placeholder="Enter custom priority..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Issue Type</label>
                    <select value={editData.issueType || ''} onChange={(e) => { setEditData((prev: EditData) => ({ ...prev, issueType: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, issueType: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                      <option value="" disabled hidden>Select Issue Type</option>
                      <option value="BUG">BUG</option>
                      <option value="FEATURE">FEATURE</option>
                      <option value="ENHANCEMENT">ENHANCEMENT</option>
                      <option value="DOCUMENTATION">DOCUMENTATION</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {editData.issueType === 'CUSTOM' && <input type="text" value={customFields.issueType} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, issueType: e.target.value }))} placeholder="Enter custom issue type..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Status</label>
                  <select value={editData.status || ''} onChange={(e) => { setEditData((prev: EditData) => ({ ...prev, status: e.target.value })); if (e.target.value !== 'CUSTOM') setCustomFields((prev: CustomFields) => ({ ...prev, status: '' })); }} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
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
                  {editData.status === 'CUSTOM' && <input type="text" value={customFields.status} onChange={(e) => setCustomFields((prev: CustomFields) => ({ ...prev, status: e.target.value }))} placeholder="Enter custom status..." style={{ width: '100%', padding: '10px', marginTop: '8px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Root Cause</label>
                    <textarea value={editData.rootCause || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, rootCause: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Action Plan</label>
                    <textarea value={editData.actionPlan || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, actionPlan: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Developer Solution</label>
                    <textarea value={editData.developerSolution || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, developerSolution: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Comments</label>
                    <textarea value={editData.comments || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, comments: e.target.value }))} rows={2} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '8px', padding: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 16px 0' }}>Development & Verification</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Assigned To</label>
                      <select value={editData.assignedToId || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, assignedToId: e.target.value ? parseInt(e.target.value) : null }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                        <option value="" disabled hidden>Select user...</option>
                        {project?.members?.map((member: ProjectMember) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
                        {project?.createdBy && <option key={project.createdBy.id} value={project.createdBy.id}>{project.createdBy.name} (Owner)</option>}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Developer Push Date</label>
                      <input type="date" value={editData.developerPushDate?.split('T')[0] || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, developerPushDate: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Verified By</label>
                      <select value={editData.verifiedById || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, verifiedById: e.target.value ? parseInt(e.target.value) : null }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }}>
                        <option value="" disabled hidden>Select user...</option>
                        {project?.members?.map((member: ProjectMember) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}
                        {project?.createdBy && <option key={project.createdBy.id} value={project.createdBy.id}>{project.createdBy.name} (Owner)</option>}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>Verification Date</label>
                      <input type="date" value={editData.verificationDate?.split('T')[0] || ''} onChange={(e) => setEditData((prev: EditData) => ({ ...prev, verificationDate: e.target.value }))} style={{ width: '100%', padding: '10px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
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
                      <input type="file" multiple onChange={(e) => { if (e.target.files) setEditSelectedFiles([...editSelectedFiles, ...Array.from(e.target.files)]); }} style={{ display: 'none' }} />
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                      <input type="text" value={editNewLink} onChange={(e) => setEditNewLink(e.target.value)} placeholder="Paste link (Google Drive, Dropbox, etc.)" style={{ flex: 1, padding: '12px', fontSize: '14px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', color: '#ffffff' }} />
                      <button type="button" onClick={() => { if (editNewLink.trim()) { setEditAttachmentLinks([...editAttachmentLinks, editNewLink.trim()]); setEditNewLink(''); } }} disabled={!editNewLink.trim()} style={{ padding: '12px 20px', fontSize: '14px', fontWeight: '600', backgroundColor: !editNewLink.trim() ? '#52525b' : '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: !editNewLink.trim() ? 'not-allowed' : 'pointer' }}>Add Link</button>
                    </div>
                  </div>
                  {editSelectedFiles.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>{editSelectedFiles.map((file, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '13px', color: '#ffffff' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{file.name}<button type="button" onClick={() => setEditSelectedFiles(editSelectedFiles.filter((_, i) => i !== index))} style={{ padding: 0, backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button></div>)}</div>}
                  {editAttachmentLinks.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{editAttachmentLinks.map((link, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '13px', color: '#ffffff' }}><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>{link.length > 40 ? link.substring(0, 40) + '...' : link}<button type="button" onClick={() => setEditAttachmentLinks(editAttachmentLinks.filter((_, i) => i !== index))} style={{ padding: 0, backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button></div>)}</div>}
                  {existingAttachments.length > 0 && <div style={{ marginTop: '16px' }}><p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 12px 0', color: '#ffffff' }}>Existing Attachments</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{existingAttachments.map((attachment, index) => { const isDeleted = attachmentsToDelete.includes(attachment.id); return (<div key={attachment.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: isDeleted ? '#3f1f1f' : '#2d2d2d', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '13px', color: isDeleted ? '#7f1d1d' : '#ffffff', opacity: isDeleted ? 0.5 : 1, textDecoration: isDeleted ? 'line-through' : 'none' }}>{attachment.fileType === 'link' ? (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>)}{attachment.fileName.length > 40 ? attachment.fileName.substring(0, 40) + '...' : attachment.fileName}<button type="button" onClick={() => { if (isDeleted) { setAttachmentsToDelete(attachmentsToDelete.filter(id => id !== attachment.id)); } else { setAttachmentsToDelete([...attachmentsToDelete, attachment.id]); } }} style={{ padding: 0, backgroundColor: 'transparent', border: 'none', color: isDeleted ? '#22c55e' : '#ef4444', cursor: 'pointer', fontSize: '14px' }} title={isDeleted ? 'Undo delete' : 'Delete attachment'}>{isDeleted ? '↩' : '×'}</button></div>); })}</div></div>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', gridColumn: '1 / -1' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={isUpdating}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    backgroundColor: 'transparent',
                    color: isUpdating ? '#52525b' : '#a1a1aa',
                    border: '1px solid #3f3f46',
                    borderRadius: '6px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: isUpdating ? '#52525b' : '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isUpdating ? 'Updating...' : 'Update Test Case'}
                </button>
              </div>
            </form>
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
              backgroundColor: 'rgba(0,0,0,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
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
                maxWidth: '450px',
                textAlign: 'center',
              }}
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px' }}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#fff' }}>Delete Test Case?</h2>
            <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
              This action cannot be undone. All attachments, activity logs, and related data will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  backgroundColor: '#3f3f46',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDeleteTestCase();
                }}
                style={{
                  padding: '10px 24px',
                  fontSize: '14px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Delete Test Case
              </button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
          border: '1px solid #3f3f46', 
          borderRadius: '12px', 
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 14px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Basic Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Test Case ID:</span>
              <span style={{ fontSize: '13px', fontWeight: '600' }}>{testCase.caseNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Logs Date:</span>
              <span style={{ fontSize: '13px' }}>{new Date(testCase.logsDate).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Version:</span>
              <span style={{ fontSize: '13px' }}>{testCase.version || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Status:</span>
              <span style={{ 
                backgroundColor: getStatusColor(testCase.status), 
                color: testCase.status === 'PASS' ? '#000' : '#fff', 
                padding: '4px 10px', 
                borderRadius: '14px', 
                fontSize: '11px', 
                fontWeight: '600' 
              }}>
                {testCase.status === 'PASS' ? 'PASSED' : testCase.status.replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Severity:</span>
              <span style={{ 
                backgroundColor: getSeverityColor(testCase.severity), 
                color: testCase.severity === 'LOW' ? '#000' : '#fff', 
                padding: '4px 10px', 
                borderRadius: '14px', 
                fontSize: '11px', 
                fontWeight: '600' 
              }}>
                {testCase.severity}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Issue Type:</span>
              <span style={{ fontSize: '13px' }}>{testCase.issueType}</span>
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
          border: '1px solid #3f3f46', 
          borderRadius: '12px', 
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 14px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Development & Verification</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Assigned To:</span>
              <span style={{ fontSize: '13px' }}>{testCase.assignedTo?.name || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Developer Push Date:</span>
              <span style={{ fontSize: '13px' }}>{testCase.developerPushDate ? new Date(testCase.developerPushDate).toLocaleDateString() : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Verified By:</span>
              <span style={{ fontSize: '13px' }}>{testCase.verifiedBy?.name || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Verification Date:</span>
              <span style={{ fontSize: '13px' }}>{testCase.verificationDate ? new Date(testCase.verificationDate).toLocaleDateString() : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Created By:</span>
              <span style={{ fontSize: '13px' }}>{testCase.createdBy.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#71717a' }}>Created At:</span>
              <span style={{ fontSize: '13px' }}>{new Date(testCase.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ 
        background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
        border: '1px solid #3f3f46', 
        borderRadius: '12px', 
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Test Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 6px 0' }}>Test Name:</p>
            <p style={{ fontSize: '14px', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.title}</p>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 6px 0' }}>Steps to Reproduce:</p>
            <p style={{ fontSize: '13px', margin: 0, color: '#a1a1aa', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.stepsToReproduce || '-'}</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 6px 0' }}>Expected Result:</p>
              <p style={{ fontSize: '13px', margin: 0, color: '#a1a1aa', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.expectedResult || '-'}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 6px 0' }}>Actual Result:</p>
              <p style={{ fontSize: '13px', margin: 0, color: '#a1a1aa', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.actualResult || '-'}</p>
            </div>
          </div>
          <div>
            <p style={{ fontSize: '13px', color: '#71717a', margin: '0 0 6px 0' }}>Test Data:</p>
            <p style={{ fontSize: '13px', margin: 0, color: '#a1a1aa', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.testData || '-'}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
          border: '1px solid #3f3f46', 
          borderRadius: '12px', 
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Root Cause</h3>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.rootCause || '-'}</p>
        </div>
        <div style={{ 
          background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
          border: '1px solid #3f3f46', 
          borderRadius: '12px', 
          padding: '18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Action Plan</h3>
          <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.actionPlan || '-'}</p>
        </div>
      </div>

      <div style={{ 
        background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
        border: '1px solid #3f3f46', 
        borderRadius: '12px', 
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Developer Solution</h3>
        <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.developerSolution || '-'}</p>
      </div>

      <div style={{ 
        background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
        border: '1px solid #3f3f46', 
        borderRadius: '12px', 
        padding: '18px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Attachments</h3>
        {testCase.attachments.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>No attachments yet</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {[...testCase.attachments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((attachment: Attachment) => {
              const isImage = attachment.fileType && attachment.fileType.startsWith('image/');
              const isPDF = attachment.fileType === 'application/pdf' || attachment.fileName.toLowerCase().endsWith('.pdf');
              
              return (
                <div key={attachment.id} style={{ maxWidth: '200px' }}>
                  {isImage ? (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px' 
                    }}>
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        style={{
                          width: '100%',
                          height: '120px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #3f3f46',
                          cursor: 'pointer'
                        }}
                        onClick={() => setPreviewAttachment(attachment)}
                      />
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12px',
                          color: '#a1a1aa',
                          textDecoration: 'none',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}
                      >
                        {attachment.fileName.length > 30 ? attachment.fileName.substring(0, 30) + '...' : attachment.fileName}
                      </a>
                    </div>
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '12px',
                        backgroundColor: '#27272a',
                        border: '1px solid #3f3f46',
                        borderRadius: '8px',
                        color: '#ffffff',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#3f3f46'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {attachment.fileType === 'link' ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                        ) : isPDF ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        )}
                      </div>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#ffffff',
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word'
                      }}>
                        {attachment.fileName.length > 40 ? attachment.fileName.substring(0, 40) + '...' : attachment.fileName}
                      </span>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ 
        background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
        border: '1px solid #3f3f46', 
        borderRadius: '12px', 
        padding: '18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 12px 0', color: '#f9fafb', letterSpacing: '-0.3px' }}>Comments</h3>
        <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{testCase.comments || '-'}</p>
      </div>

      <AnimatePresence>
        {previewAttachment && (
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
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px',
            }}
            onClick={() => setPreviewAttachment(null)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewAttachment(null);
              }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '10px',
                backgroundColor: '#3f3f46',
                border: 'none',
                borderRadius: '50%',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '20px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
            <motion.img
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: 'tween', ease: 'easeOut', duration: 0.3 }}
              src={previewAttachment.url}
              alt={previewAttachment.fileName}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  );
}
