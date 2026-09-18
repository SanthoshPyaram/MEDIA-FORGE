import React, { useState, useRef, useCallback } from 'react';

interface BeforeAfterCompareProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export const BeforeAfterCompare: React.FC<BeforeAfterCompareProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Original',
  afterLabel = 'Enhanced',
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      className={`relative select-none overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900 ${className}`}
    >
      {/* After image (full background) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="w-full h-auto object-contain max-h-[500px] mx-auto block"
        draggable={false}
      />
      <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-bold text-cyan-400 border border-cyan-500/30">
        {afterLabel}
      </div>

      {/* Before image (clipped overlay) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="w-full h-auto object-contain max-h-[500px] mx-auto block"
          draggable={false}
        />
        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-[11px] font-bold text-slate-300 border border-white/20">
          {beforeLabel}
        </div>
      </div>

      {/* Divider slider line & handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-indigo-500 shadow-xl flex items-center justify-center text-xs text-indigo-500 font-bold">
          ⇄
        </div>
      </div>
    </div>
  );
};

