'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
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

export default function CompletedPage() {
  const [completedProjects, setCompletedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResumeConfirm, setShowResumeConfirm] = useState<{ id: number; name: string } | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<{ id: number; name: string } | null>(null);

  // Body scroll lock for modals
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (showResumeConfirm || showArchiveConfirm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showResumeConfirm, showArchiveConfirm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResumeConfirm) setShowResumeConfirm(null);
        if (showArchiveConfirm) setShowArchiveConfirm(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResumeConfirm, showArchiveConfirm]);

  const fetchCompletedProjects = async () => {
    try {
      const res = await api.get('/projects/completed');
      setCompletedProjects(res.data);
    } catch (error) {
      console.error('Failed to fetch completed projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsActive = async (projectId: number) => {
    try {
      await api.put(`/projects/${projectId}`, { status: 'active' });
      fetchCompletedProjects();
      setShowResumeConfirm(null);
    } catch (error) {
      console.error('Failed to mark project as active:', error);
    }
  };

  const archiveProject = async (projectId: number) => {
    try {
      await api.put(`/projects/${projectId}/archive`);
      fetchCompletedProjects();
      setShowArchiveConfirm(null);
    } catch (error) {
      console.error('Failed to archive project:', error);
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
    fetchCompletedProjects();
  }, []);

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
          background: 'transparent',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.25)'
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#f9fafb', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 style={{ width: '24px', height: '24px', color: '#4ade80' }} />
            Completed Projects
          </h2>
        </div>
        
        {completedProjects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(39, 39, 42, 0.3)', borderRadius: '16px', border: '1px dashed rgba(113, 113, 122, 0.4)' }}
          >
            <div style={{ marginBottom: '16px', fontSize: '48px', opacity: 0.4 }}>📦</div>
            <p style={{ fontSize: '15px', color: '#a1a1aa', margin: '0 0 8px 0', fontWeight: '500' }}>No completed projects yet</p>
            <p style={{ fontSize: '13px', color: '#71717a', margin: 0 }}>Projects marked as complete will appear here</p>
          </motion.div>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              style={{ 
                overflowX: 'auto', 
                background: 'rgba(39, 39, 42, 0.5)', 
                border: '1px solid rgba(71, 85, 105, 0.4)', 
                borderRadius: '16px', 
                width: '100%'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%' }}>
                <thead style={{ background: 'rgba(30, 30, 35, 0.8)' }}>
                  <tr style={{ borderBottom: '1px solid rgba(71, 85, 105, 0.4)' }}>
                    <th style={{ textAlign: 'left', padding: '18px 24px', fontSize: '13px', fontWeight: '700', color: '#a1a1aa', minWidth: '220px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Name</th>
                    <th style={{ textAlign: 'center', padding: '18px 24px', fontSize: '13px', fontWeight: '700', color: '#e5e7eb', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</th>
                    <th style={{ textAlign: 'center', padding: '18px 24px', fontSize: '13px', fontWeight: '700', color: '#4ade80', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Passed</th>
                    <th style={{ textAlign: 'center', padding: '18px 24px', fontSize: '13px', fontWeight: '700', color: '#f87171', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed</th>
                    <th style={{ textAlign: 'center', padding: '18px 24px', fontSize: '13px', fontWeight: '700', color: '#facc15', minWidth: '80px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>To Fix</th>
                    <th style={{ textAlign: 'left', padding: '18px 24px', fontSize: '13px', fontWeight: '700', color: '#a1a1aa', minWidth: '220px', verticalAlign: 'middle', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedProjects.map((project, index) => {
                    const projectStats = getProjectStats(project);
                    return (
                      <motion.tr 
                        key={project.id} 
                        style={{ 
                          borderBottom: '1px solid rgba(55, 65, 81, 0.5)',
                          background: index % 2 === 0 ? 'rgba(24, 24, 27, 0.4)' : 'transparent'
                        }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.5 + (index * 0.08) }}
                      >
                        <td style={{ padding: '18px 24px', verticalAlign: 'middle' }}>
                          <Link 
                            href={`/dashboard/projects/${project.id}?from=completed`}
                            style={{ textDecoration: 'none' }}
                          >
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: 0, color: '#f9fafb', cursor: 'pointer', transition: 'color 0.2s ease' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#f9fafb'}>
                              {project.name}
                            </p>
                          </Link>
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '700', color: '#f9fafb' }}>{projectStats.total}</td>
                        <td style={{ padding: '18px 24px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '700', color: '#4ade80' }}>{projectStats.passed}</td>
                        <td style={{ padding: '18px 24px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '700', color: '#f87171' }}>{projectStats.failed}</td>
                        <td style={{ padding: '18px 24px', textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', fontWeight: '700', color: '#facc15' }}>{projectStats.toFix}</td>
                        <td style={{ padding: '18px 24px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                              onClick={() => setShowResumeConfirm({ id: project.id, name: project.name })}
                              style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                              }}
                            >
                              Resume
                            </button>
                            <button
                              onClick={() => setShowArchiveConfirm({ id: project.id, name: project.name })}
                              style={{
                                padding: '10px 20px',
                                background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
                                color: '#e5e7eb',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '700',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                              }}
                            >
                              Archive
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
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#3b82f6' }}>
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
                  onClick={() => markAsActive(showResumeConfirm.id)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
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

      <AnimatePresence>
        {showArchiveConfirm && (
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
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: '#71717a' }}>
                Archive Project?
              </h3>
              <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 24px 0' }}>
                Are you sure you want to archive <span style={{ color: '#ffffff', fontWeight: '500' }}>{showArchiveConfirm.name}</span>?
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowArchiveConfirm(null)}
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
                  onClick={() => archiveProject(showArchiveConfirm.id)}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#4b5563',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                  }}
                >
                  Yes, Archive
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
