import { create } from 'zustand';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'qa' | 'developer';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('bugflow_token') : null;
  const storedUser = typeof window !== 'undefined' ? localStorage.getItem('bugflow_user') : null;

  return {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken,
    isAuthenticated: !!storedToken,
    login: (token: string, user: User) => {
      localStorage.setItem('bugflow_token', token);
      localStorage.setItem('bugflow_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('bugflow_token');
      localStorage.removeItem('bugflow_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
