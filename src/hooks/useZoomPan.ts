import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const DRAG_THRESHOLD = 5; // pixels moved before considered a drag

function normalizeWheelDelta(e: WheelEvent) {
  let { deltaX, deltaY } = e;
  if (e.deltaMode === 1) {
    deltaX *= 16;
    deltaY *= 16;
  } else if (e.deltaMode === 2) {
    deltaX *= window.innerWidth;
    deltaY *= window.innerHeight;
  }
  return { deltaX, deltaY };
}

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
  const activePointerId = useRef<number | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    const target = e.currentTarget as HTMLElement | null;
    if (!target) return;

    const isZoomGesture = e.ctrlKey;
    const { deltaX, deltaY } = normalizeWheelDelta(e);

    e.preventDefault();

    if (!isZoomGesture) {
      setState((prev) => ({
        ...prev,
        translateX: prev.translateX - deltaX,
        translateY: prev.translateY - deltaY,
      }));
      return;
    }

    const delta = deltaY > 0 ? 0.9 : 1.1;

    setState((prev) => {
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, prev.scale * delta)
      );

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

  const startPanning = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    hasDragged.current = false;
    startPoint.current = { x: clientX, y: clientY };
    startTranslate.current = { x: state.translateX, y: state.translateY };
  }, [state.translateX, state.translateY]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPanning(e.clientX, e.clientY);
  }, [startPanning]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track a single pointer at a time (1-finger pan on touch, left-click pan on mouse).
    if (!e.isPrimary) return;
    if (activePointerId.current != null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    activePointerId.current = e.pointerId;
    startPanning(e.clientX, e.clientY);

    // Keep receiving pointer events even if the pointer leaves the element.
    const el = e.currentTarget as HTMLElement | null;
    try {
      el?.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore capture failures (e.g. element not in DOM).
    }
  }, [startPanning]);

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

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isPanning.current) return;
    if (activePointerId.current == null) return;
    if (e.pointerId !== activePointerId.current) return;

    // With touch input we want to prevent native scrolling while panning.
    if (e.pointerType === 'touch') {
      e.preventDefault();
    }

    const dx = e.clientX - startPoint.current.x;
    const dy = e.clientY - startPoint.current.y;

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
    activePointerId.current = null;
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
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handleMouseUp);
    window.addEventListener('pointercancel', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handleMouseUp);
      window.removeEventListener('pointercancel', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handlePointerMove]);

  return {
    scale: state.scale,
    translateX: state.translateX,
    translateY: state.translateY,
    handleWheel,
    handleMouseDown,
    handlePointerDown,
    zoomIn,
    zoomOut,
    resetView,
    isDragging,
  };
}
