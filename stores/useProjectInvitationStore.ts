import { create } from 'zustand';
import api from '@/lib/api';

interface ProjectInvitation {
  id: number;
  project: { id: number; name: string };
  invitedBy: { id: number; name: string; email: string };
  createdAt: string;
}

interface InvitationStore {
  invitations: ProjectInvitation[];
  isLoading: boolean;
  fetchInvitations: () => Promise<void>;
  removeInvitation: (id: number) => void;
}

export const useProjectInvitationStore = create<InvitationStore>((set) => ({
  invitations: [],
  isLoading: true,
  fetchInvitations: async () => {
    try {
      const res = await api.get('/projects/invitations/pending');
      set({ invitations: res.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      set({ isLoading: false });
    }
  },
  removeInvitation: (id: number) => {
    set((state) => ({
      invitations: state.invitations.filter(inv => inv.id !== id),
    }));
  },
}));
