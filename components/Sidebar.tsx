'use client';

import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Folder, 
  Archive, 
  CheckCircle2, 
  Users, 
  LogOut 
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    { 
      id: 'dashboard',
      label: 'Dashboard', 
      href: '/dashboard', 
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    { 
      id: 'projects',
      label: 'Projects', 
      href: '/dashboard', 
      icon: Folder,
      active: pathname.startsWith('/dashboard/projects')
    },
    { 
      id: 'completed',
      label: 'Completed', 
      href: '/dashboard/completed', 
      icon: CheckCircle2,
      active: pathname === '/dashboard/completed'
    },
    { 
      id: 'archived',
      label: 'Archived', 
      href: '/dashboard/archive', 
      icon: Archive,
      active: pathname === '/dashboard/archive'
    },
    { 
      id: 'share',
      label: 'Share', 
      href: '/dashboard/share', 
      icon: Users,
      active: pathname === '/dashboard/share'
    },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col z-50">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Bug<span className="text-yellow-400">Flow</span>
        </h1>
      </div>

      <div className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              if (item.id === 'projects' && pathname === '/dashboard') {
                // If already on dashboard, scroll to test project summary
                const summarySection = document.getElementById('test-project-summary');
                if (summarySection) {
                  summarySection.scrollIntoView({ behavior: 'smooth' });
                }
              } else if (item.id === 'dashboard' && pathname === '/dashboard') {
                // If already on dashboard, scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                // Otherwise, navigate to the page
                router.push(item.href);
              }
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
              item.active 
                ? 'bg-zinc-800 text-white border border-zinc-700' 
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-4">
        <div className="px-4">
          <p className="text-sm text-zinc-400">Signed in as</p>
          <p className="text-white font-medium truncate">{user?.name}</p>
        </div>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Logout</h3>
            <p className="text-zinc-400 mb-6">Are you sure you want to log out?</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  logout();
                  setShowLogoutConfirm(false);
                  router.push('/login');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
