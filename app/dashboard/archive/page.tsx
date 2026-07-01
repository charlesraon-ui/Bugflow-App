'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

interface TestCase {
  id: number;
  status: string;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  testCases: TestCase[];
}

export default function ArchivePage() {
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
  const [showResumeConfirm, setShowResumeConfirm] = useState<{ id: number; name: string } | null>(null);

  // Body scroll lock for modals
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (showDeleteConfirm || showResumeConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showDeleteConfirm, showResumeConfirm]);

  const fetchArchivedProjects = async () => {
    try {
      const res = await api.get('/projects/archived');
      setArchivedProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch archived projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const resumeProject = async (projectId: number) => {
    try {
      await api.put(`/projects/${projectId}/resume`);
      fetchArchivedProjects();
      setShowResumeConfirm(null);
    } catch (error) {
      console.error('Failed to resume project:', error);
    }
  };

  const deleteProject = async (projectId: number) => {
    try {
      await api.delete(`/projects/${projectId}`);
      fetchArchivedProjects();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const getProjectStats = (project: Project) => {
    const testCases = project.testCases || [];
    const total = testCases.length;
    const passed = testCases.filter((tc) => tc.status === 'PASS').length;
    const failed = testCases.filter((tc) => tc.status === 'FAILED').length;
    const blocked = testCases.filter((tc) => tc.status === 'BLOCKED').length;
    const toFix = testCases.filter((tc) => tc.status === 'TO_FIX').length;
    
    let progress = 0;
    if (total > 0) {
      progress = Math.round((passed / total) * 100);
    }

    return { total, passed, failed, blocked, toFix, progress };
  };

  useEffect(() => {
    fetchArchivedProjects();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (showDeleteConfirm) setShowDeleteConfirm(null);
        if (showResumeConfirm) setShowResumeConfirm(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteConfirm, showResumeConfirm]);

  if (loading) {
    return (
      <div style={{ padding: '32px', backgroundColor: '#0a0a0a', color: '#ffffff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '20px', color: '#a1a1aa' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#0f0f0f', color: '#ffffff', minHeight: '100vh' }}>
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}
      >
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#71717a', textDecoration: 'none', transition: 'color 0.2s ease', fontWeight: '500', fontSize: '14px' }}>
          <ArrowLeft style={{ width: '20px', height: '20px' }} />
          <span>Back to Dashboard</span>
        </Link>
      </motion.div>

      <motion.div 
        style={{ 
          background: 'linear-gradient(135deg, #18181b 0%, #1f1f1f 100%)', 
          border: '1px solid #3f3f46', 
          borderRadius: '16px', 
          padding: '28px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#f9fafb', letterSpacing: '-0.3px' }}>📁 Archived Projects</h2>
        </div>
        
        {archivedProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ textAlign: 'center', padding: '40px' }}
          >
            <p style={{ fontSize: '16px', color: '#a1a1aa', margin: '0 0 12px 0' }}>No archived projects yet.</p>
            <p style={{ fontSize: '14px', color: '#71717a', margin: 0 }}>When you end a project, it will appear here.</p>
          </motion.div>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              style={{ overflowX: 'auto', backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '12px', width: '100%' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%' }}>
                <thead style={{ backgroundColor: '#1f1f1f' }}>
                  <tr style={{ borderBottom: '1px solid #3f3f46' }}>
                    <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#71717a', minWidth: '200px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Name</th>
                    <th style={{ textAlign: 'center', padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#ffffff', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#4ade80', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passed</th>
                    <th style={{ textAlign: 'center', padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#f87171', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed</th>
                    <th style={{ textAlign: 'center', padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#facc15', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Fix</th>
                    <th style={{ textAlign: 'left', padding: '14px 18px', fontSize: '13px', fontWeight: '700', color: '#71717a', minWidth: '200px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedProjects.map((project, index) => {
                    const projectStats = getProjectStats(project);
                    return (
                      <motion.tr 
                        key={project.id} 
                        style={{ borderBottom: '1px solid #3f3f46' }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + (index * 0.08) }}
                      >
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <Link 
                            href={`/dashboard/projects/${project.id}?from=archive`}
                            style={{ textDecoration: 'none' }}
                          >
                            <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#ffffff', cursor: 'pointer' }}>
                              {project.name}
                            </p>
                          </Link>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>{projectStats.total}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>{projectStats.passed}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>{projectStats.failed}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '600', color: '#eab308' }}>{projectStats.toFix}</td>
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              onClick={() => setShowResumeConfirm({ id: project.id, name: project.name })}
                              style={{
                                padding: '10px 18px',
                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                color: '#000000',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                boxShadow: '0 1px 3px rgba(34, 197, 94, 0.3)'
                              }}
                            >
                              Resume
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ id: project.id, name: project.name })}
                              style={{
                                padding: '10px 18px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                boxShadow: '0 1px 3px rgba(239, 68, 68, 0.3)'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>


          </>
        )}
      </motion.div>

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
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: "spring" }}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#ef4444' }}>
                Delete Project?
              </h3>
              <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
                Are you sure you want to delete <span style={{ color: '#ffffff', fontWeight: '500' }}>{showDeleteConfirm.name}</span>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
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
                  onClick={() => deleteProject(showDeleteConfirm.id)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResumeConfirm && (
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
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: "spring" }}
              style={{
                backgroundColor: '#1f1f1f',
                border: '1px solid #3f3f46',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '400px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#22c55e' }}>
                Resume Project?
              </h3>
              <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
                Are you sure you want to resume <span style={{ color: '#ffffff', fontWeight: '500' }}>{showResumeConfirm.name}</span>?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowResumeConfirm(null)}
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
                  onClick={() => resumeProject(showResumeConfirm.id)}
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
                  Yes, Resume
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
