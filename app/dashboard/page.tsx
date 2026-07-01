'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProjectStore } from '@/stores/useProjectStore';
import api, { getErrorMessage } from '@/lib/api';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface DashboardStats {
  totalProjects: number;
  totalTestCases: number;
  statusCounts: {
    [key: string]: number;
  };
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
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  isArchived: boolean;
  createdById: number;
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  testCases: TestCase[];
  _count?: {
    testCases: number;
  };
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { projects, fetchProjects, isLoading } = useProjectStore();
  const { addNotification } = useNotificationStore();
  const [showForm, setShowForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Body scroll lock for modal
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalStyle;
    }
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [showForm]);

  // Clear error when form is opened or name changes
  useEffect(() => {
    if (showForm) {
      setCreateError(null);
    }
  }, [showForm]);
  
  const getUserRoleForProject = (project: Project) => {
    if (!user) return 'viewer';
    if (project.createdById === user.id) {
      return 'author';
    }
    const member = project.members?.find(m => m.userId === user.id);
    return member?.role || 'viewer';
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
      await fetchProjects();
    } catch (error) {
      console.error('Failed to fetch data:', error);
      addNotification({
        message: getErrorMessage(error),
        type: 'error',
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Keyboard shortcuts - Escape to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm]);


  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    try {
      await api.post('/projects', newProject);
      setShowForm(false);
      setNewProject({ name: '', description: '' });
      fetchData();
      addNotification({
        message: 'Project created successfully!',
        type: 'success',
      });
    } catch (error: any) {
      console.error('Failed to create project:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create project';
      setCreateError(errorMessage);
    }
  };

  const getProjectStats = (project: Project) => {
    const testCases = project.testCases || [];
    const total = testCases.length;
    const passed = testCases.filter((tc: any) => tc.status === 'PASS').length;
    const failed = testCases.filter((tc: any) => tc.status === 'FAILED').length;
    const blocked = testCases.filter((tc: any) => tc.status === 'BLOCKED').length;
    const toFix = testCases.filter((tc: any) => tc.status === 'TO_FIX').length;
    const open = testCases.filter((tc: any) => tc.status === 'OPEN').length;
    const critical = testCases.filter((tc: any) => tc.severity === 'CRITICAL').length;
    const high = testCases.filter((tc: any) => tc.severity === 'HIGH').length;
    const bugs = testCases.filter((tc: any) => tc.issueType === 'BUG').length;
    
    let progress = 0;
    if (total > 0) {
      progress = Math.round((passed / total) * 100);
    }

    return { total, passed, failed, blocked, toFix, open, critical, high, bugs, progress };
  };

  const getSortedProjects = (search: string) => {
    return [...projects]
      .filter(project => 
        project.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const aStats = getProjectStats(a);
        const bStats = getProjectStats(b);
        
        return bStats.progress - aStats.progress;
      });
  };


  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="p-7 bg-background text-foreground min-h-screen">
      <div className="flex justify-between items-start mb-10 flex-wrap gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2 font-medium">Welcome back, <span className="text-foreground font-bold">{user?.name}</span>. Here's what's happening with your projects.</p>
        </div>

        <div className="text-right p-5 bg-gradient-to-br from-card to-gray-900/60 rounded-2xl border border-border shadow-xl">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.2em] font-extrabold mb-2">Today</p>
          <p className="text-lg font-extrabold mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <p className="text-sm font-extrabold mt-1 text-primary">{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-[1000] backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, type: "spring" }}
              className="bg-gradient-to-b from-card to-gray-900/60 border border-border p-8 rounded-3xl w-full max-w-lg shadow-2xl"
            >
              <h2 className="text-2xl font-extrabold mb-6 text-card-foreground">Create New Project</h2>
              {createError && (
                <div className="bg-gradient-to-r from-red-900/30 to-red-950/40 border border-red-500/50 text-red-200 px-4 py-3 rounded-2xl mb-4 text-sm">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateProject} className="flex flex-col gap-5">
                <div>
                  <label className="block mb-2 text-base font-medium">Project Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => {
                      setNewProject({ ...newProject, name: e.target.value });
                      setCreateError(null);
                    }}
                    required
                    className="w-full px-4 py-3.5 text-base bg-input border border-border rounded-2xl text-foreground focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-base font-medium">Details</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3.5 text-base bg-input border border-border rounded-2xl text-foreground resize-y focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 text-sm font-semibold bg-muted text-muted-foreground border border-border rounded-2xl hover:bg-muted/80 transition-colors duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-3 text-sm font-extrabold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/20"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      ) : (
        <>
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {[
              { title: "Total Projects", value: stats?.totalProjects || 0, color: "gray" },
              { title: "Total Test Cases", value: stats?.totalTestCases || 0, color: "gray" },
              { title: "Passed", value: stats?.statusCounts?.PASS || 0, color: "green" },
              { title: "Failed", value: stats?.statusCounts?.FAILED || 0, color: "red" },
              { title: "To Fix", value: stats?.statusCounts?.TO_FIX || 0, color: "yellow" },
              { title: "Open", value: stats?.statusCounts?.OPEN || 0, color: "blue" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1, type: "spring" }}
                whileHover={{ scale: 1.03, y: -4 }}
                className={`relative overflow-hidden border rounded-3xl p-6 shadow-xl transition-all duration-500 ${
                  stat.color === "green" 
                    ? "bg-gradient-to-br from-green-900/40 to-green-950/60 border-green-500/30 hover:border-green-500/50 shadow-green-500/10" 
                    : stat.color === "red" 
                    ? "bg-gradient-to-br from-red-900/40 to-red-950/60 border-red-500/30 hover:border-red-500/50 shadow-red-500/10" 
                    : stat.color === "yellow" 
                    ? "bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border-yellow-500/30 hover:border-yellow-500/50 shadow-yellow-500/10" 
                    : stat.color === "blue" 
                    ? "bg-gradient-to-br from-blue-900/40 to-blue-950/60 border-blue-500/30 hover:border-blue-500/50 shadow-blue-500/10" 
                    : "bg-gradient-to-br from-gray-800/80 to-gray-900/90 border-gray-700/50 hover:border-gray-600/60"
                }`}
              >
                {/* Decorative gradient overlay */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-20 blur-2xl ${
                  stat.color === "green" ? "bg-green-500" :
                  stat.color === "red" ? "bg-red-500" :
                  stat.color === "yellow" ? "bg-yellow-500" :
                  stat.color === "blue" ? "bg-blue-500" : "bg-gray-500"
                }`} />
                
                <div className="relative">
                  <h3 className={`text-[11px] font-extrabold mb-3 uppercase tracking-[0.2em] ${
                    stat.color === "green" ? "text-green-300" :
                    stat.color === "red" ? "text-red-300" :
                    stat.color === "yellow" ? "text-yellow-300" :
                    stat.color === "blue" ? "text-blue-300" :
                    "text-gray-400"
                  }`}>{stat.title}</h3>
                  <p className={`text-4xl font-black leading-tight ${
                    stat.color === "green" ? "text-green-200" :
                    stat.color === "red" ? "text-red-200" :
                    stat.color === "yellow" ? "text-yellow-200" :
                    stat.color === "blue" ? "text-blue-200" :
                    "text-white"
                  }`}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            id="test-project-summary"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-gradient-to-b from-card to-gray-900/50 border border-border rounded-3xl p-8 mb-8 shadow-2xl w-full max-w-full overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8 flex-wrap gap-5">
              <h2 className="text-2xl font-extrabold text-card-foreground tracking-tight">Test Project Summary</h2>
              <div className="flex gap-3 flex-wrap items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11 pr-5 py-4 text-sm bg-input border border-border rounded-2xl text-foreground min-w-[240px] focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0a7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold px-7 py-4 rounded-2xl hover:from-green-600 hover:to-emerald-700 shadow-xl shadow-green-500/20 transition-all duration-300 flex items-center gap-3 transform hover:-translate-y-0.5"
                >
                  <Plus size={22} />
                  NEW PROJECT
                </button>
              </div>
            </div>
            
            {projects.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="text-center py-20 bg-gradient-to-b from-gray-900/30 to-gray-900/10 rounded-3xl border-2 border-dashed border-gray-700"
              >
                <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center">
                  <Plus size={40} className="text-muted-foreground" />
                </div>
                <p className="text-lg text-muted-foreground font-medium">No projects yet. Create one to get started!</p>
              </motion.div>
            ) : (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="overflow-x-auto rounded-3xl border border-border w-full shadow-xl"
                >
                  <table className="w-full border-collapse min-w-full">
                    <thead className="bg-gradient-to-r from-gray-900 to-gray-800">
                      <tr className="border-b-2 border-blue-500/20">
                        <th className="text-left px-7 py-6 text-[11px] font-extrabold text-gray-400 min-w-[200px] uppercase tracking-[0.15em]">Project Name</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-gray-400 min-w-[70px] uppercase tracking-[0.15em]">Total</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-green-400 min-w-[70px] uppercase tracking-[0.15em]">Passed</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-red-400 min-w-[70px] uppercase tracking-[0.15em]">Failed</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-yellow-400 min-w-[70px] uppercase tracking-[0.15em]">To Fix</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-blue-400 min-w-[70px] uppercase tracking-[0.15em]">Open</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-red-400 min-w-[70px] uppercase tracking-[0.15em]">Critical</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-orange-400 min-w-[70px] uppercase tracking-[0.15em]">High</th>
                        <th className="text-center px-7 py-6 text-[11px] font-extrabold text-pink-400 min-w-[70px] uppercase tracking-[0.15em]">Bugs</th>
                        <th className="text-left px-7 py-6 text-[11px] font-extrabold text-gray-400 min-w-[220px] uppercase tracking-[0.15em]">Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const sortedProjects = getSortedProjects(searchQuery);
                        const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const endIndex = startIndex + itemsPerPage;
                        const currentProjects = sortedProjects.slice(startIndex, endIndex);
                        
                        return currentProjects.map((project, index) => {
                          const projectStats = getProjectStats(project);
                          const globalIndex = startIndex + index;
                          
                          return (
                            <motion.tr 
                              key={project.id} 
                              className="border-b border-gray-700/50 hover:bg-gradient-to-r from-gray-800/30 to-gray-900/20 transition-all duration-300 group cursor-pointer" 
                              style={{ backgroundColor: globalIndex % 2 === 0 ? 'rgba(30, 30, 35, 0.4)' : 'rgba(24, 24, 27, 0.3)' }}
                              initial={{ opacity: 0, x: -30 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.5, delay: 0.5 + (index * 0.1) }}
                              whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.08)' }}
                            >
                              <td className="px-7 py-5">
                                <div>
                                  <Link 
                                    href={`/dashboard/projects/${project.id}`} 
                                    className="text-card-foreground no-underline font-bold text-base hover:text-blue-400 transition-colors duration-200 group-hover:translate-x-2 inline-block"
                                  >
                                    {project.name}
                                  </Link>
                                  {project.createdById !== user?.id && (
                                    <div className="mt-3 flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground">Shared by: {project.createdBy.name}</span>
                                      <span className="text-[11px] font-extrabold px-3 py-1.5 rounded-full" style={{ backgroundColor: getUserRoleForProject(project) === 'author' ? '#facc15' : getUserRoleForProject(project) === 'editor' ? '#3b82f6' : '#6b7280', color: getUserRoleForProject(project) === 'author' ? '#000' : '#fff' }}>
                                        {getUserRoleForProject(project) === 'author' ? 'Full Access' : getUserRoleForProject(project) === 'editor' ? 'Edit Access' : 'View Only'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-white">{projectStats.total}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-green-400">{projectStats.passed}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-red-400">{projectStats.failed}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-yellow-400">{projectStats.toFix}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-blue-400">{projectStats.open}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-red-500">{projectStats.critical}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-orange-400">{projectStats.high}</td>
                              <td className="px-7 py-5 text-center text-sm font-extrabold text-pink-400">{projectStats.bugs}</td>
                              <td className="px-7 py-5">
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 h-4 bg-gray-800 rounded-3xl overflow-hidden shadow-inner ring-2 ring-gray-700">
                                    <motion.div 
                                      style={{ 
                                        width: projectStats.progress > 0 ? `${projectStats.progress}%` : '0px', 
                                        background: projectStats.progress === 100 ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                                      }}
                                      className="h-full rounded-3xl transition-all duration-700 ease-out shadow-lg"
                                      initial={{ width: "0%" }}
                                      animate={{ width: projectStats.progress > 0 ? `${projectStats.progress}%` : "0px" }}
                                      transition={{ duration: 1.2, delay: 0.7 + (index * 0.1), ease: "easeOut" }}
                                    />
                                  </div>
                                  <span className={`text-sm font-extrabold min-w-[55px] ${projectStats.progress === 100 ? 'text-green-400' : 'text-white'}`}>
                                    {projectStats.progress}%
                                  </span>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </motion.div>
                
                {/* Pagination Controls */}
                {(() => {
                  const sortedProjects = getSortedProjects(searchQuery);
                  const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
                  
                  if (totalPages <= 1) return null;
                  
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                      className="flex justify-between items-center mt-8"
                    >
                      <div className="text-sm text-muted-foreground font-medium">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedProjects.length)} of {sortedProjects.length} projects
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-5 py-3 text-sm font-bold rounded-2xl border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-all duration-300"
                        >
                          Previous
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-5 py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${
                              currentPage === page 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-card text-foreground border border-border hover:bg-gray-800'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-5 py-3 text-sm font-bold rounded-2xl border border-border bg-card text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-all duration-300"
                        >
                          Next
                        </button>
                      </div>
                    </motion.div>
                  );
                })()}
              </>
            )}</motion.div>
        </>
      )}
    </div>
  );
}