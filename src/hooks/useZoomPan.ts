import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const DRAG_THRESHOLD = 5; // pixels moved before considered a drag

export function useZoomPan() {
  const [state, setState] = useState<ZoomPanState>({
    scale: 0.6,
    translateX: 0,
    translateY: 0,
  });

  const isPanning = useRef(false);
  const hasDragged = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const startTranslate = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const target = e.currentTarget as HTMLElement | null;
    if (!target) return;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    setState((prev) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * delta));
      
      // Zoom toward cursor position
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const scaleRatio = newScale / prev.scale;
      const newTranslateX = x - (x - prev.translateX) * scaleRatio;
      const newTranslateY = y - (y - prev.translateY) * scaleRatio;

      return {
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    isPanning.current = true;
    hasDragged.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };
    startTranslate.current = { x: state.translateX, y: state.translateY };
  }, [state.translateX, state.translateY]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;

    const dx = e.clientX - startPoint.current.x;
    const dy = e.clientY - startPoint.current.y;

    // Check if moved beyond threshold
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasDragged.current = true;
    }

    setState((prev) => ({
      ...prev,
      translateX: startTranslate.current.x + dx,
      translateY: startTranslate.current.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    // Reset hasDragged after a short delay to allow click handlers to check it
    setTimeout(() => {
      hasDragged.current = false;
    }, 0);
  }, []);

  const isDragging = useCallback(() => hasDragged.current, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale * 0.8),
    }));
  }, []);

  const resetView = useCallback(() => {
    setState({
      scale: 0.6,
      translateX: 0,
      translateY: 0,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    scale: state.scale,
    translateX: state.translateX,
    translateY: state.translateY,
    handleWheel,
    handleMouseDown,
    zoomIn,
    zoomOut,
    resetView,
    isDragging,
  };
}
