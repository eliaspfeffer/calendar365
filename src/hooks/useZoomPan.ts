import { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

const DEFAULT_MIN_SCALE = 0.3;
const DEFAULT_MAX_SCALE = 3;
const DRAG_THRESHOLD = 5; // pixels moved before considered a drag
const PINCH_THRESHOLD = 2; // pixels distance change before considered a pinch

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

type ZoomPanOptions = {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
};

export function useZoomPan(options: ZoomPanOptions = {}) {
  const minScaleRef = useRef(options.minScale ?? DEFAULT_MIN_SCALE);
  const maxScaleRef = useRef(options.maxScale ?? DEFAULT_MAX_SCALE);
  const initialScaleRef = useRef(options.initialScale ?? 0.6);

  useEffect(() => {
    minScaleRef.current = options.minScale ?? DEFAULT_MIN_SCALE;
  }, [options.minScale]);

  useEffect(() => {
    maxScaleRef.current = options.maxScale ?? DEFAULT_MAX_SCALE;
  }, [options.maxScale]);

  useEffect(() => {
    initialScaleRef.current = options.initialScale ?? 0.6;
  }, [options.initialScale]);

  const [state, setState] = useState<ZoomPanState>({
    scale: initialScaleRef.current,
    translateX: 0,
    translateY: 0,
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const minScale = minScaleRef.current;
    const maxScale = maxScaleRef.current;
    setState((prev) => {
      if (prev.scale >= minScale && prev.scale <= maxScale) return prev;
      return {
        ...prev,
        scale: Math.max(minScale, Math.min(maxScale, prev.scale)),
      };
    });
  }, [options.minScale, options.maxScale]);

  const isPanning = useRef(false);
  const isPinching = useRef(false);
  const hasDragged = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });
  const startTranslate = useRef({ x: 0, y: 0 });
  const activePointerId = useRef<number | null>(null);
  const interactionElement = useRef<HTMLElement | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number; pointerType: string }>());
  const pinchStart = useRef<{
    distance: number;
    scale: number;
    contentPoint: { x: number; y: number };
  } | null>(null);

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
      const minScale = minScaleRef.current;
      const maxScale = maxScaleRef.current;
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, prev.scale * delta)
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
    const s = stateRef.current;
    startTranslate.current = { x: s.translateX, y: s.translateY };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    startPanning(e.clientX, e.clientY);
  }, [startPanning]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    interactionElement.current = e.currentTarget as HTMLElement | null;

    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      if (activePointerId.current != null) return;
      activePointerId.current = e.pointerId;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, pointerType: e.pointerType });
      startPanning(e.clientX, e.clientY);
    } else {
      // Cap at 2 pointers for pinch zoom.
      if (pointers.current.size >= 2) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY, pointerType: e.pointerType });

      if (pointers.current.size === 1) {
        activePointerId.current = e.pointerId;
        startPanning(e.clientX, e.clientY);
      } else if (pointers.current.size === 2) {
        isPinching.current = true;
        hasDragged.current = true;

        const el = interactionElement.current;
        const rect = el?.getBoundingClientRect();
        if (!rect) {
          isPinching.current = false;
          pinchStart.current = null;
          return;
        }

        const pts = Array.from(pointers.current.values());
        const p0 = pts[0];
        const p1 = pts[1];
        const midpoint = {
          x: (p0.x + p1.x) / 2 - rect.left,
          y: (p0.y + p1.y) / 2 - rect.top,
        };

        const s = stateRef.current;
        pinchStart.current = {
          distance: Math.hypot(p1.x - p0.x, p1.y - p0.y),
          scale: s.scale,
          contentPoint: {
            x: (midpoint.x - s.translateX) / s.scale,
            y: (midpoint.y - s.translateY) / s.scale,
          },
        };
      }
    }

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
    const tracked = pointers.current.get(e.pointerId);
    if (tracked) {
      pointers.current.set(e.pointerId, { ...tracked, x: e.clientX, y: e.clientY });
    }

    if (tracked?.pointerType === 'touch') {
      e.preventDefault();
    }

    if (isPinching.current && pointers.current.size === 2) {
      const el = interactionElement.current;
      const rect = el?.getBoundingClientRect();
      const start = pinchStart.current;
      if (!rect || !start || start.distance === 0) return;

      const pts = Array.from(pointers.current.values());
      const p0 = pts[0];
      const p1 = pts[1];
      const distance = Math.hypot(p1.x - p0.x, p1.y - p0.y);

      // Avoid treating tiny jitter as a pinch.
      if (Math.abs(distance - start.distance) > PINCH_THRESHOLD) {
        hasDragged.current = true;
      }

      const newScaleRaw = start.scale * (distance / start.distance);
      const minScale = minScaleRef.current;
      const maxScale = maxScaleRef.current;
      const newScale = Math.max(minScale, Math.min(maxScale, newScaleRaw));

      const midpoint = {
        x: (p0.x + p1.x) / 2 - rect.left,
        y: (p0.y + p1.y) / 2 - rect.top,
      };

      const newTranslateX = midpoint.x - start.contentPoint.x * newScale;
      const newTranslateY = midpoint.y - start.contentPoint.y * newScale;

      setState({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });
      return;
    }

    if (!isPanning.current) return;
    if (activePointerId.current == null) return;
    if (e.pointerId !== activePointerId.current) return;

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

  const stopInteraction = useCallback(() => {
    isPanning.current = false;
    isPinching.current = false;
    activePointerId.current = null;
    interactionElement.current = null;
    pointers.current.clear();
    pinchStart.current = null;
    // Reset hasDragged after a short delay to allow click handlers to check it.
    setTimeout(() => {
      hasDragged.current = false;
    }, 0);
  }, []);

  const handleMouseUp = useCallback(() => {
    // Mouse interactions are single-pointer; pointerup handler will clear tracked pointers.
    if (activePointerId.current == null) return;
    stopInteraction();
  }, [stopInteraction]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const wasTracked = pointers.current.has(e.pointerId);
    pointers.current.delete(e.pointerId);

    if (e.pointerType === 'touch') {
      e.preventDefault();
    }

    if (!wasTracked) return;

    if (pointers.current.size === 0) {
      stopInteraction();
      return;
    }

    if (pointers.current.size === 1) {
      // Transition from pinch back to pan with the remaining pointer.
      isPinching.current = false;
      pinchStart.current = null;
      const [remainingId, remaining] = Array.from(pointers.current.entries())[0];
      activePointerId.current = remainingId;
      isPanning.current = true;
      startPoint.current = { x: remaining.x, y: remaining.y };
      const s = stateRef.current;
      startTranslate.current = { x: s.translateX, y: s.translateY };
    }
  }, [stopInteraction]);

  const isDragging = useCallback(() => hasDragged.current, []);

  const zoomIn = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.min(maxScaleRef.current, prev.scale * 1.2),
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setState((prev) => ({
      ...prev,
      scale: Math.max(minScaleRef.current, prev.scale * 0.8),
    }));
  }, []);

  const resetView = useCallback(() => {
    setState({
      scale: Math.max(minScaleRef.current, Math.min(maxScaleRef.current, initialScaleRef.current)),
      translateX: 0,
      translateY: 0,
    });
  }, []);

  const setView = useCallback(
    (next: Partial<ZoomPanState> | ((prev: ZoomPanState) => ZoomPanState)) => {
      if (typeof next === "function") {
        setState(next);
        return;
      }
      setState((prev) => ({ ...prev, ...next }));
    },
    []
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerUp, { passive: false });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [handleMouseMove, handleMouseUp, handlePointerMove, handlePointerUp]);

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
    setView,
    isDragging,
  };
}
