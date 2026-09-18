import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useJobQueue } from '@/context/JobQueueContext';
import { useAuth } from '@/context/AuthContext';
import {
  Sun,
  Moon,
  Laptop,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Sparkles,
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  FileSpreadsheet,
  LogOut,
  Lock,
} from 'lucide-react';
import { getWorkspaceTheme, WORKSPACE_THEMES } from '@/lib/theme/workspaceThemes';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenQueue: () => void;
  onOpenAuth?: (portal?: 'USER' | 'ADMIN') => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenQueue, onOpenAuth }) => {
  const { theme, setTheme } = useTheme();
  const { jobs } = useJobQueue();
  const { user, isAdmin, logout } = useAuth();

  const activeJobsCount = jobs.filter((j) => j.status === 'PROCESSING' || j.status === 'QUEUED').length;
  const currentTheme = getWorkspaceTheme(currentView);

  const navItems = [
    { id: 'home', label: 'Home', icon: Sparkles },
    { id: 'video', label: 'Studio (Video)', icon: Film },
    { id: 'image', label: 'Image', icon: ImageIcon },
    { id: 'audio', label: 'Audio', icon: Music },
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'document', label: 'Documents', icon: FileSpreadsheet },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Audit', icon: ShieldAlert }] : []),
    { id: 'privacy', label: 'Privacy', icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-[#090d16]/85 border-b border-slate-200/80 dark:border-white/10 transition-colors">
      {/* Dynamic Animated Workspace Top Accent Line */}
      <div
        className={`h-[2.5px] w-full bg-gradient-to-r ${
          currentView === 'admin'
            ? 'from-rose-500 via-red-600 to-amber-500'
            : currentTheme.headerBorderAccent
        } transition-all duration-700 ease-in-out`}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo with Dynamic Glow */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div
            className={`relative w-9 h-9 rounded-xl bg-gradient-to-tr ${
              currentView === 'admin'
                ? 'from-rose-600 via-red-600 to-amber-500 shadow-rose-500/30'
                : currentTheme.logoGlowClass
            } p-0.5 transition-all duration-700 ease-in-out group-hover:scale-105`}
          >
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-slate-200 dark:to-slate-300">
                MEDIAFORGE
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border transition-all duration-500 flex items-center gap-1 ${
                  currentView === 'admin'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : currentTheme.badgeClass
                }`}
              >
                <span>{currentView === 'admin' ? '🛡️' : currentTheme.badgeEmoji}</span>
                <span>{currentView === 'admin' ? 'Admin Mode' : currentTheme.badgeLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation with Animated Category Accents */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isAdminTab = item.id === 'admin';
            const itemTheme = isAdminTab
              ? {
                  navActiveBg: 'bg-rose-500/15 dark:bg-rose-500/20',
                  navActiveText: 'text-rose-600 dark:text-rose-400',
                  navActiveBorder: 'border-rose-500/40',
                  navActiveShadow: 'shadow-rose-500/20 shadow-md',
                  navActiveDot: 'bg-rose-400',
                }
              : WORKSPACE_THEMES[item.id as keyof typeof WORKSPACE_THEMES] || currentTheme;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  isActive
                    ? `${itemTheme.navActiveBg} ${itemTheme.navActiveText} border ${itemTheme.navActiveBorder} ${itemTheme.navActiveShadow}`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${itemTheme.navActiveDot} animate-pulse ml-0.5`}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Queue Button with Animated Status Accent */}
          <button
            onClick={onOpenQueue}
            aria-label="Job Queue"
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Queue</span>
            {activeJobsCount > 0 && (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white animate-pulse transition-colors duration-500 ${
                  currentView === 'video'
                    ? 'bg-violet-600'
                    : currentView === 'image'
                    ? 'bg-emerald-600'
                    : currentView === 'audio'
                    ? 'bg-amber-600'
                    : currentView === 'pdf'
                    ? 'bg-rose-600'
                    : currentView === 'document'
                    ? 'bg-blue-600'
                    : 'bg-indigo-600'
                }`}
              >
                {activeJobsCount}
              </span>
            )}
          </button>

          {/* Theme Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-xl p-0.5 border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setTheme('light')}
              aria-label="Light mode"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              aria-label="Dark mode"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-white dark:bg-slate-800 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              aria-label="System theme"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Authenticated User Badge & Logout */}
          {user && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/10">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  user.role === 'admin'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                }`}
              >
                <span>{user.role === 'admin' ? '🛡️' : '👤'}</span>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-xl hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                title="Logout of MediaForge"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Unauthenticated: Sign In to Access & Admin Portal Triggers */}
          {!user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
              <button
                onClick={() => onOpenAuth?.('ADMIN')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer"
                title="Administrator Control Portal"
              >
                <span>🛡️</span>
                <span>Admin</span>
              </button>

              <button
                onClick={() => onOpenAuth?.('USER')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:brightness-110 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Sign In to Access</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar with Matching Colors */}
      <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-200 dark:border-white/5 overflow-x-auto px-2 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const isAdminTab = item.id === 'admin';
          const itemTheme = isAdminTab
            ? {
                navActiveBg: 'bg-rose-500/15 text-rose-400',
                navActiveText: 'text-rose-400',
              }
            : WORKSPACE_THEMES[item.id as keyof typeof WORKSPACE_THEMES] || currentTheme;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                isActive
                  ? `${itemTheme.navActiveBg} ${itemTheme.navActiveText}`
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
