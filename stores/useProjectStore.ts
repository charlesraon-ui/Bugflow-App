import { create } from 'zustand';
import api from '@/lib/api';

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
  expectedResult?: string | null;
  actualResult?: string | null;
  testData?: string | null;
  stepsToReproduce?: string | null;
  severity: string;
  priority: string;
  issueType: string;
  status: string;
  assignedToId?: number | null;
  rootCause?: string | null;
  actionPlan?: string | null;
  developerSolution?: string | null;
  developerPushDate?: string | null;
  verifiedById?: number | null;
  verificationDate?: string | null;
  comments?: string | null;
  logsDate: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
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
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  testCases: TestCase[];
  _count?: {
    testCases: number;
  };
}

interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  updateProject: (updatedProject: Project) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  isLoading: true,
  fetchProjects: async () => {
    try {
      const res = await api.get('/projects', { params: { status: 'active' } });
      set({ projects: res.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      set({ isLoading: false });
    }
  },
  updateProject: (updatedProject: Project) => {
    set((state) => ({
      projects: state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      ),
    }));
  },
}));
