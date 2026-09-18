import React, { useState, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CompatibilityBanner } from '@/components/layout/CompatibilityBanner';
import { Hero } from '@/components/home/Hero';
import { UniversalUploadZone } from '@/components/home/UniversalUploadZone';
import { SupportedToolsGrid } from '@/components/home/SupportedToolsGrid';
import { HowItWorks } from '@/components/home/HowItWorks';
import { PrivacyHero } from '@/components/home/PrivacyHero';
import { FormatsMatrix } from '@/components/home/FormatsMatrix';
import { FaqSection } from '@/components/home/FaqSection';
import { ProcessingModal } from '@/components/shared/ProcessingModal';
import { ResultCard } from '@/components/shared/ResultCard';
import { QueueDrawer } from '@/components/shared/QueueDrawer';
import { SmartProcessModal } from '@/components/shared/SmartProcessModal';
import { VideoImportModal, ImportTab } from '@/components/shared/VideoImportModal';

import { VideoWorkspace } from '@/components/workspaces/VideoWorkspace';
import { ImageWorkspace } from '@/components/workspaces/ImageWorkspace';
import { AudioWorkspace } from '@/components/workspaces/AudioWorkspace';
import { PdfWorkspace } from '@/components/workspaces/PdfWorkspace';
import { DocumentWorkspace } from '@/components/workspaces/DocumentWorkspace';
import { PrivacyPage } from '@/components/privacy/PrivacyPage';
import { AdminAuditDashboard } from '@/components/admin/AdminAuditDashboard';
import { SecurityGateway } from '@/components/auth/SecurityGateway';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useJobQueue } from '@/context/JobQueueContext';
import { DetectedFileInfo } from '@/types/job';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, ShieldAlert, Lock } from 'lucide-react';
import { getWorkspaceTheme } from '@/lib/theme/workspaceThemes';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();

  const [currentView, setCurrentView] = useState<string>('home');
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [activeFileInfo, setActiveFileInfo] = useState<DetectedFileInfo | null>(null);
  const [smartProcessTarget, setSmartProcessTarget] = useState<DetectedFileInfo | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importModalTab, setImportModalTab] = useState<ImportTab>('upload');
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  // Authentication Gateway Modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPortalMode, setAuthPortalMode] = useState<'USER' | 'ADMIN'>('USER');

  const openAuth = (portal: 'USER' | 'ADMIN' = 'USER') => {
    setAuthPortalMode(portal);
    setIsAuthModalOpen(true);
  };

  const handleNavigate = (view: string) => {
    if (!isAuthenticated && view !== 'home' && view !== 'privacy') {
      openAuth(view === 'admin' ? 'ADMIN' : 'USER');
      return;
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const heroVideoInputRef = useRef<HTMLInputElement>(null);

  const { jobs, activeJobId, addJob, startJob, cancelJob } = useJobQueue();

  const activeJob = jobs.find((j) => j.id === activeJobId && (j.status === 'PROCESSING' || j.status === 'QUEUED'));
  const latestCompletedJob = jobs.find((j) => j.status === 'COMPLETED' && j.outputBlob);
  const latestFailedJob = jobs.find((j) => j.status === 'FAILED');

  // Triggered when file is dropped on upload zone
  const handleFileDetected = (fileInfo: DetectedFileInfo) => {
    if (!isAuthenticated) {
      openAuth('USER');
      return;
    }
    setActiveFileInfo(fileInfo);
    if (fileInfo.category === 'video') setCurrentView('video');
    else if (fileInfo.category === 'image') setCurrentView('image');
    else if (fileInfo.category === 'audio') setCurrentView('audio');
    else if (fileInfo.category === 'pdf') setCurrentView('pdf');
    else if (fileInfo.category === 'document') setCurrentView('document');
  };

  const handleHeroVideoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAuthenticated) {
      openAuth('USER');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp4';
    const info: DetectedFileInfo = {
      file,
      name: file.name,
      extension: ext,
      mimeType: file.type || 'video/mp4',
      realMimeType: file.type || 'video/mp4',
      category: 'video',
      size: file.size,
      formattedSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      supportedOperations: [],
    };
    setActiveFileInfo(info);
    setCurrentView('video');
  };

  const handleBatchDetected = (batch: DetectedFileInfo[]) => {
    if (!isAuthenticated) {
      openAuth('USER');
      return;
    }
    batch.forEach((info) => {
      addJob(info, info.category === 'video' ? 'transcode' : info.category === 'image' ? 'convert' : 'process', {});
    });
    setIsQueueOpen(true);
  };

  const handleSmartProcessTrigger = (fileInfo: DetectedFileInfo) => {
    if (!isAuthenticated) {
      openAuth('USER');
      return;
    }
    setSmartProcessTarget(fileInfo);
  };

  const handleSmartProcessConfirm = async (options: Record<string, any>) => {
    if (!smartProcessTarget) return;
    const info = smartProcessTarget;
    setSmartProcessTarget(null);

    const jobId = addJob(info, 'smart_process', options);
    await startJob(jobId);
  };

  const handleStartCustomJob = async (
    fileInfo: DetectedFileInfo,
    operation: string,
    options: Record<string, any>
  ) => {
    if (!isAuthenticated) {
      openAuth('USER');
      return;
    }
    const jobId = addJob(fileInfo, operation, options);
    await startJob(jobId);
  };

  // 1. Loading state while verifying token
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
            Verifying Security Session...
          </span>
        </div>
      </div>
    );
  }


  const currentTheme = getWorkspaceTheme(currentView);

  return (
    <div
      data-workspace={currentView}
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors relative overflow-x-hidden"
    >
      {/* Dynamic Ambient Background Aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 transition-opacity duration-1000 opacity-25 dark:opacity-30">
        <div
          className={`absolute -top-32 -right-32 w-80 h-80 sm:w-[500px] sm:h-[500px] rounded-full blur-[130px] transition-all duration-700 ${
            currentView === 'admin' ? 'bg-rose-500/20' : currentTheme.ambientOrb1
          }`}
        />
        <div
          className={`absolute top-1/3 -left-32 w-80 h-80 sm:w-[450px] sm:h-[450px] rounded-full blur-[130px] transition-all duration-700 ${
            currentView === 'admin' ? 'bg-amber-500/15' : currentTheme.ambientOrb2
          }`}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <CompatibilityBanner />
        <Header
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenQueue={() => {
            if (!isAuthenticated) {
              openAuth('USER');
              return;
            }
            setIsQueueOpen(true);
          }}
          onOpenAuth={openAuth}
        />

        {/* Hidden file picker for hero video button */}
        <input
          type="file"
          ref={heroVideoInputRef}
          accept="video/*"
          onChange={handleHeroVideoPick}
          className="hidden"
        />

        {/* Main Content View Switcher */}
        <main className="flex-1 flex flex-col">
          {currentView === 'home' && (
            <>
              <Hero
                onUploadVideo={() => {
                  if (!isAuthenticated) {
                    openAuth('USER');
                    return;
                  }
                  setImportModalTab('upload');
                  setIsImportModalOpen(true);
                }}
                onImportUrl={() => {
                  if (!isAuthenticated) {
                    openAuth('USER');
                    return;
                  }
                  setImportModalTab('url');
                  setIsImportModalOpen(true);
                }}
                onScrollToUpload={() => {
                  const el = document.getElementById('upload-zone');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              />

              {/* Private Platform Access Card */}
              {!isAuthenticated && (
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 my-4">
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            Private Platform Access
                          </span>
                          <span className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            Authorized Users Only
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          MediaForge is restricted to approved devices. Sign in to convert and process files.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => openAuth('ADMIN')}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-all cursor-pointer whitespace-nowrap"
                      >
                        Admin Portal
                      </button>
                      <button
                        onClick={() => openAuth('USER')}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold shadow-sm shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sign In</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div id="upload-zone" className="my-8">
                <UniversalUploadZone
                  onFileDetected={handleFileDetected}
                  onBatchDetected={handleBatchDetected}
                  onSmartProcess={handleSmartProcessTrigger}
                />
              </div>

              {/* Display Completed Result Card if one just finished */}
              {latestCompletedJob && (
                <div className="my-12 px-4">
                  <ResultCard
                    job={latestCompletedJob}
                    onReset={() => {
                      setActiveFileInfo(null);
                    }}
                    onEditAgain={() => {
                      if (latestCompletedJob.category === 'video') {
                        setCurrentView('video');
                      }
                    }}
                  />
                </div>
              )}

              <SupportedToolsGrid
                onSelectCategory={(cat) => {
                  handleNavigate(cat);
                }}
              />
              <HowItWorks />
              <PrivacyHero />
              <FormatsMatrix />
              <FaqSection />
            </>
          )}

          {/* Display Completed Result Card in workspaces if one just finished */}
          {currentView !== 'home' && currentView !== 'privacy' && currentView !== 'admin' && latestCompletedJob && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <ResultCard
                job={latestCompletedJob}
                onReset={() => {
                  setActiveFileInfo(null);
                }}
                onEditAgain={() => {
                  if (latestCompletedJob.category === 'video') {
                    setCurrentView('video');
                  }
                }}
              />
            </div>
          )}

          {currentView === 'video' && (
            <VideoWorkspace
              initialFile={activeFileInfo?.category === 'video' ? activeFileInfo : null}
              onStartJob={handleStartCustomJob}
              onBackToHome={() => setCurrentView('home')}
            />
          )}

          {currentView === 'image' && (
            <ImageWorkspace
              initialFile={activeFileInfo?.category === 'image' ? activeFileInfo : null}
              onStartJob={handleStartCustomJob}
            />
          )}

          {currentView === 'audio' && (
            <AudioWorkspace
              initialFile={activeFileInfo?.category === 'audio' || activeFileInfo?.category === 'video' ? activeFileInfo : null}
              onStartJob={handleStartCustomJob}
            />
          )}

          {currentView === 'pdf' && (
            <PdfWorkspace
              initialFile={activeFileInfo?.category === 'pdf' ? activeFileInfo : null}
              onStartJob={handleStartCustomJob}
            />
          )}

          {currentView === 'document' && (
            <DocumentWorkspace
              initialFile={activeFileInfo?.category === 'document' ? activeFileInfo : null}
              onStartJob={handleStartCustomJob}
            />
          )}

          {currentView === 'admin' && (
            isAdmin ? (
              <AdminAuditDashboard onBackToHome={() => setCurrentView('home')} />
            ) : (
              <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-lg font-bold text-red-400">Access Restricted</h3>
                <p className="text-xs text-slate-400">
                  You are logged in as a standard user. Admin credentials are required to view device audit logs.
                </p>
                <button
                  onClick={() => setCurrentView('home')}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
                >
                  Return to Home
                </button>
              </div>
            )
          )}

          {currentView === 'privacy' && <PrivacyPage />}
        </main>

        {currentView !== 'video' && currentView !== 'admin' && (
          <Footer
            onNavigate={(v) => {
              setCurrentView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* Batch Processing Queue Drawer */}
        <QueueDrawer isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

        {/* Professional Video Import Modal (Upload, URL, My Content) */}
        <VideoImportModal
          isOpen={isImportModalOpen}
          initialTab={importModalTab}
          onClose={() => setIsImportModalOpen(false)}
          onImportFile={(info) => {
            setActiveFileInfo(info);
            setCurrentView('video');
          }}
        />

        {/* Smart Process Modal */}
        {smartProcessTarget && (
          <SmartProcessModal
            fileInfo={smartProcessTarget}
            isOpen={Boolean(smartProcessTarget)}
            onClose={() => setSmartProcessTarget(null)}
            onConfirm={handleSmartProcessConfirm}
          />
        )}

        {/* Active Processing Modal */}
        {activeJob && (
          <ProcessingModal
            job={activeJob}
            onCancel={() => cancelJob(activeJob.id)}
          />
        )}

        {/* User-Friendly Error Modal */}
        {latestFailedJob && latestFailedJob.error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 shadow-2xl text-left">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold">Processing Failed</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
                Your browser could not process this file locally. The container or codec might be restricted, or the file size exceeded the tab memory limit.
              </p>

              {/* Expandable Technical Details */}
              <div className="mb-5">
                <button
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                >
                  <span>{showErrorDetails ? 'Hide technical log' : 'View technical details'}</span>
                  {showErrorDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showErrorDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-950 font-mono text-[10px] text-red-500 dark:text-red-400 overflow-x-auto max-h-36">
                    {latestFailedJob.error.details || latestFailedJob.error.message}
                  </pre>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => {
                    latestFailedJob.error = undefined;
                    setCurrentView('home');
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold"
                >
                  Choose Another Format
                </button>
                <button
                  onClick={() => {
                    latestFailedJob.error = undefined;
                    startJob(latestFailedJob.id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Gateway Modal (User Sign-In / Admin Control) */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <SecurityGateway
              initialPortal={authPortalMode}
              onClose={() => setIsAuthModalOpen(false)}
              onSuccess={() => setIsAuthModalOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
