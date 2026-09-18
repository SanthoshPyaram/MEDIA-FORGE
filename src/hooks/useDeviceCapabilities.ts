import { useState, useEffect } from 'react';

export interface DeviceCapabilities {
  hasWebAssembly: boolean;
  hasSharedArrayBuffer: boolean;
  hasWebWorkers: boolean;
  hasWebCodecs: boolean;
  isCrossOriginIsolated: boolean;
  hardwareConcurrency: number;
  deviceMemory?: number;
  isCompatible: boolean;
  warnings: string[];
}

export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasWebAssembly: true,
    hasSharedArrayBuffer: false,
    hasWebWorkers: true,
    hasWebCodecs: false,
    isCrossOriginIsolated: false,
    hardwareConcurrency: 4,
    isCompatible: true,
    warnings: [],
  });

  useEffect(() => {
    const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    const hasSAB = typeof SharedArrayBuffer !== 'undefined';
    const hasWorkers = typeof Worker !== 'undefined';
    const hasCodecs = typeof (window as any).VideoEncoder !== 'undefined';
    const isIsolated = window.crossOriginIsolated === true;
    const concurrency = navigator.hardwareConcurrency || 4;
    const memory = (navigator as any).deviceMemory;

    const warnings: string[] = [];
    if (!hasWasm) {
      warnings.push('WebAssembly is not supported. Advanced video and audio conversions may not function.');
    }
    if (!hasSAB) {
      warnings.push('SharedArrayBuffer is disabled. Video transcoding will run with fallback single-thread mode.');
    }
    if (memory && memory < 4) {
      warnings.push(`Device has ${memory}GB memory reported. Processing files larger than 150MB may hit browser tab limits.`);
    }

    setCapabilities({
      hasWebAssembly: hasWasm,
      hasSharedArrayBuffer: hasSAB,
      hasWebWorkers: hasWorkers,
      hasWebCodecs: hasCodecs,
      isCrossOriginIsolated: isIsolated,
      hardwareConcurrency: concurrency,
      deviceMemory: memory,
      isCompatible: hasWasm && hasWorkers,
      warnings,
    });
  }, []);

  return capabilities;
}

