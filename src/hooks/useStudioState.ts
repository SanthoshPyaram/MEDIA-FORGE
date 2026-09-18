import { useState, useCallback, useEffect, useRef } from 'react';
import { StudioState } from '@/types/studio';

export const createDefaultStudioState = (duration = 60): StudioState => ({
  trim: {
    enabled: false,
    start: 0,
    end: duration,
  },
  crop: {
    enabled: false,
    preset: 'original',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
  transform: {
    rotate: 0,
    flipH: false,
    flipV: false,
  },
  audio: {
    originalAudioEnabled: true,
    originalVolume: 1.0,
    fadeIn: 0,
    fadeOut: 0,
    customAudioEnabled: false,
    customAudioFile: null,
    mode: 'mix',
    customVolume: 0.8,
    startAt: 0,
    behavior: 'cut',
  },
  watermark: {
    enabled: false,
    type: 'text',
    text: 'MediaForge',
    fontSize: 32,
    color: '#ffffff',
    hasBackground: true,
    position: 'bottom-right',
    opacity: 0.85,
    margin: 24,
    scale: 0.25,
  },
  watermarkModify: {
    enabled: false,
    mode: 'delogo',
    x: 50,
    y: 50,
    width: 160,
    height: 60,
    color: '#000000',
  },
  enhancement: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    gamma: 1.0,
    exposure: 0,
    denoise: 0,
    smartEnhance: false,
  },
  filter: 'original',
  speed: 1,
  compression: {
    preset: 'balanced',
  },
  exportSettings: {
    format: 'mp4',
    resolution: 'original',
    fps: 30,
  },
});

export function useStudioState(initialDuration = 60) {
  const [history, setHistory] = useState<StudioState[]>([createDefaultStudioState(initialDuration)]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentState = history[historyIndex] || history[0];

  const updateState = useCallback(
    (updater: Partial<StudioState> | ((prev: StudioState) => StudioState)) => {
      setHistory((prevHistory) => {
        const prev = prevHistory[historyIndex] || prevHistory[0];
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };

        // Truncate future if we performed an action after undo
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(next);

        // Cap history stack to 40 states to prevent memory bloat
        if (newHistory.length > 40) {
          newHistory.shift();
        }
        return newHistory;
      });

      setHistoryIndex((prevIdx) => Math.min(prevIdx + 1, 39));
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    setHistoryIndex((prevIdx) => Math.max(0, prevIdx - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((prevIdx) => Math.min(history.length - 1, prevIdx + 1));
  }, [history.length]);

  const resetAll = useCallback((duration = 60) => {
    const fresh = createDefaultStudioState(duration);
    setHistory([fresh]);
    setHistoryIndex(0);
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Global Keyboard Shortcuts (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return {
    state: currentState,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetAll,
    historyLength: history.length,
    historyIndex,
  };
}

