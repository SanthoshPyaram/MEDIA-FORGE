export type WorkspaceCategory = 'home' | 'video' | 'image' | 'audio' | 'pdf' | 'document' | 'privacy';

export interface WorkspaceThemeConfig {
  id: WorkspaceCategory;
  name: string;
  badgeLabel: string;
  badgeEmoji: string;
  badgeClass: string;
  headerBorderAccent: string;
  logoGlowClass: string;
  navActiveBg: string;
  navActiveText: string;
  navActiveBorder: string;
  navActiveShadow: string;
  navActiveDot: string;
  primaryButtonGradient: string;
  primaryButtonShadow: string;
  ambientOrb1: string;
  ambientOrb2: string;
  glowHex: string;
}

export const WORKSPACE_THEMES: Record<WorkspaceCategory, WorkspaceThemeConfig> = {
  home: {
    id: 'home',
    name: 'Universal Hub',
    badgeLabel: 'Local Engine',
    badgeEmoji: '⚡',
    badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
    headerBorderAccent: 'from-indigo-500 via-purple-500 to-cyan-400',
    logoGlowClass: 'from-indigo-600 via-violet-600 to-cyan-500 shadow-indigo-500/25',
    navActiveBg: 'bg-indigo-50 dark:bg-indigo-500/15',
    navActiveText: 'text-indigo-600 dark:text-indigo-400',
    navActiveBorder: 'border-indigo-500/30',
    navActiveShadow: 'shadow-indigo-500/15 shadow-sm',
    navActiveDot: 'bg-indigo-500',
    primaryButtonGradient: 'from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500',
    primaryButtonShadow: 'shadow-indigo-600/25',
    ambientOrb1: 'bg-indigo-500/15 dark:bg-indigo-600/20',
    ambientOrb2: 'bg-cyan-500/15 dark:bg-cyan-600/15',
    glowHex: '#6366f1',
  },
  video: {
    id: 'video',
    name: 'Video Studio',
    badgeLabel: 'Video Studio',
    badgeEmoji: '🎬',
    badgeClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
    headerBorderAccent: 'from-violet-500 via-purple-600 to-fuchsia-500',
    logoGlowClass: 'from-violet-600 via-purple-600 to-fuchsia-500 shadow-violet-500/30',
    navActiveBg: 'bg-violet-50 dark:bg-violet-500/20',
    navActiveText: 'text-violet-600 dark:text-violet-300',
    navActiveBorder: 'border-violet-500/40',
    navActiveShadow: 'shadow-violet-500/25 shadow-md',
    navActiveDot: 'bg-violet-400',
    primaryButtonGradient: 'from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500',
    primaryButtonShadow: 'shadow-violet-600/30',
    ambientOrb1: 'bg-violet-600/25 dark:bg-violet-600/30',
    ambientOrb2: 'bg-purple-600/20 dark:bg-fuchsia-700/20',
    glowHex: '#8b5cf6',
  },
  image: {
    id: 'image',
    name: 'Image Studio',
    badgeLabel: 'Image Lab',
    badgeEmoji: '🖼️',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    headerBorderAccent: 'from-emerald-400 via-teal-500 to-cyan-400',
    logoGlowClass: 'from-emerald-500 via-teal-500 to-cyan-500 shadow-emerald-500/30',
    navActiveBg: 'bg-emerald-50 dark:bg-emerald-500/20',
    navActiveText: 'text-emerald-600 dark:text-emerald-300',
    navActiveBorder: 'border-emerald-500/40',
    navActiveShadow: 'shadow-emerald-500/25 shadow-md',
    navActiveDot: 'bg-emerald-400',
    primaryButtonGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    primaryButtonShadow: 'shadow-emerald-600/30',
    ambientOrb1: 'bg-emerald-500/25 dark:bg-emerald-600/30',
    ambientOrb2: 'bg-teal-500/20 dark:bg-cyan-600/20',
    glowHex: '#10b981',
  },
  audio: {
    id: 'audio',
    name: 'Audio Lab',
    badgeLabel: 'Audio Lab',
    badgeEmoji: '🎵',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    headerBorderAccent: 'from-amber-400 via-orange-500 to-yellow-400',
    logoGlowClass: 'from-amber-500 via-orange-500 to-yellow-500 shadow-amber-500/30',
    navActiveBg: 'bg-amber-50 dark:bg-amber-500/20',
    navActiveText: 'text-amber-600 dark:text-amber-300',
    navActiveBorder: 'border-amber-500/40',
    navActiveShadow: 'shadow-amber-500/25 shadow-md',
    navActiveDot: 'bg-amber-400',
    primaryButtonGradient: 'from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500',
    primaryButtonShadow: 'shadow-amber-600/30',
    ambientOrb1: 'bg-amber-500/25 dark:bg-amber-600/30',
    ambientOrb2: 'bg-orange-500/20 dark:bg-orange-600/20',
    glowHex: '#f59e0b',
  },
  pdf: {
    id: 'pdf',
    name: 'PDF Suite',
    badgeLabel: 'PDF Suite',
    badgeEmoji: '📄',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    headerBorderAccent: 'from-rose-400 via-red-500 to-pink-500',
    logoGlowClass: 'from-rose-500 via-red-500 to-pink-500 shadow-rose-500/30',
    navActiveBg: 'bg-rose-50 dark:bg-rose-500/20',
    navActiveText: 'text-rose-600 dark:text-rose-300',
    navActiveBorder: 'border-rose-500/40',
    navActiveShadow: 'shadow-rose-500/25 shadow-md',
    navActiveDot: 'bg-rose-400',
    primaryButtonGradient: 'from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500',
    primaryButtonShadow: 'shadow-rose-600/30',
    ambientOrb1: 'bg-rose-500/25 dark:bg-rose-600/30',
    ambientOrb2: 'bg-red-500/20 dark:bg-red-600/20',
    glowHex: '#f43f5e',
  },
  document: {
    id: 'document',
    name: 'Documents',
    badgeLabel: 'Docs Suite',
    badgeEmoji: '📊',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    headerBorderAccent: 'from-blue-400 via-sky-500 to-indigo-500',
    logoGlowClass: 'from-blue-600 via-sky-500 to-indigo-500 shadow-blue-500/30',
    navActiveBg: 'bg-blue-50 dark:bg-blue-500/20',
    navActiveText: 'text-blue-600 dark:text-blue-300',
    navActiveBorder: 'border-blue-500/40',
    navActiveShadow: 'shadow-blue-500/25 shadow-md',
    navActiveDot: 'bg-blue-400',
    primaryButtonGradient: 'from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500',
    primaryButtonShadow: 'shadow-blue-600/30',
    ambientOrb1: 'bg-blue-500/25 dark:bg-blue-600/30',
    ambientOrb2: 'bg-sky-500/20 dark:bg-sky-600/20',
    glowHex: '#3b82f6',
  },
  privacy: {
    id: 'privacy',
    name: 'Privacy & Security',
    badgeLabel: '100% Local',
    badgeEmoji: '🛡️',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    headerBorderAccent: 'from-emerald-400 via-cyan-500 to-indigo-500',
    logoGlowClass: 'from-emerald-500 via-cyan-500 to-indigo-500 shadow-emerald-500/30',
    navActiveBg: 'bg-emerald-50 dark:bg-emerald-500/20',
    navActiveText: 'text-emerald-600 dark:text-emerald-300',
    navActiveBorder: 'border-emerald-500/40',
    navActiveShadow: 'shadow-emerald-500/25 shadow-md',
    navActiveDot: 'bg-emerald-400',
    primaryButtonGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
    primaryButtonShadow: 'shadow-emerald-600/30',
    ambientOrb1: 'bg-emerald-500/20 dark:bg-emerald-600/25',
    ambientOrb2: 'bg-indigo-500/20 dark:bg-indigo-600/20',
    glowHex: '#10b981',
  },
};

export const getWorkspaceTheme = (view: string): WorkspaceThemeConfig => {
  if (view in WORKSPACE_THEMES) {
    return WORKSPACE_THEMES[view as WorkspaceCategory];
  }
  return WORKSPACE_THEMES.home;
};

