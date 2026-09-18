import React from 'react';
import {
  Upload,
  Scissors,
  Crop,
  Volume2,
  Sparkles,
  Maximize2,
  RotateCw,
  Stamp,
  SlidersHorizontal,
  Gauge,
  FileArchive,
  DownloadCloud,
} from 'lucide-react';
import { StudioTool } from '@/types/studio';

interface StudioToolsSidebarProps {
  activeTool: StudioTool;
  onSelectTool: (tool: StudioTool) => void;
}

export const StudioToolsSidebar: React.FC<StudioToolsSidebarProps> = ({
  activeTool,
  onSelectTool,
}) => {
  const tools: { id: StudioTool; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'import', label: 'Import', icon: Upload },
    { id: 'trim', label: 'Trim', icon: Scissors },
    { id: 'crop', label: 'Crop', icon: Crop },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'enhance', label: 'Enhance', icon: Sparkles },
    { id: 'resize', label: 'Resize', icon: Maximize2 },
    { id: 'rotate', label: 'Rotate', icon: RotateCw },
    { id: 'watermark', label: 'Watermark', icon: Stamp },
    { id: 'filters', label: 'Filters', icon: SlidersHorizontal },
    { id: 'speed', label: 'Speed', icon: Gauge },
    { id: 'compress', label: 'Compress', icon: FileArchive },
    { id: 'export', label: 'Export', icon: DownloadCloud },
  ];

  return (
    <aside className="w-20 md:w-24 border-r border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1220] flex flex-col py-3 overflow-y-auto select-none shrink-0 scrollbar-none">
      <div className="flex flex-col items-center gap-1.5 px-2">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-full py-2.5 px-1 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-none tracking-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

