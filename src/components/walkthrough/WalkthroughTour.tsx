import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type WalkthroughStep = {
  id: string;
  title: string;
  body: string;
  targetSelector?: string;
  optional?: boolean;
  when?: (ctx: { isAuthed: boolean }) => boolean;
  onEnter?: () => void;
};

const STORAGE_KEY = "calendar365_walkthrough_v1_completed";

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function getRectForSelector(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!(el instanceof HTMLElement)) return null;
  const rect = el.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return rect;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function WalkthroughTour({
  open,
  onOpenChange,
  isAuthed,
  onRequestOpenSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthed: boolean;
  onRequestOpenSettings: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 24, left: 24 });

  const ctx = useMemo(() => ({ isAuthed }), [isAuthed]);

  const steps: WalkthroughStep[] = useMemo(
    () => [
      {
        id: "welcome",
        title: "Welcome to Calendar365",
        body:
          "A year-at-a-glance calendar where you can place sticky notes on days, keep an inbox, and zoom/pan like a canvas. You can try it instantly — sign in later to unlock sharing and multiple calendars.",
      },
      {
        id: "canvas",
        title: "Click any day to add a note",
        body:
          "Click a date to create a sticky note. Notes can be edited anytime, and you can move them between days by dragging.",
        targetSelector: '[data-tour-id=\"calendar-canvas\"]',
      },
      {
        id: "zoom",
        title: "Zoom & pan",
        body:
          "Use the controls to zoom, or scroll/trackpad to zoom. Drag the background to pan around the calendar.",
        targetSelector: '[data-tour-id=\"zoom-controls\"]',
      },
      {
        id: "inbox",
        title: "Inbox for “not scheduled yet”",
        body:
          "Notes without a date live in the inbox. Drag them onto a day when you know where they belong.",
        targetSelector: '[data-tour-id=\"inbox-panel\"]',
        optional: true,
      },
      {
        id: "years",
        title: "Add or hide years",
        body:
          "Need more runway? Add future years, or hide the last year to keep the view focused. Your notes stay safe.",
        targetSelector: '[data-tour-id=\"year-controls\"]',
        optional: true,
      },
      {
        id: "settings",
        title: "Personalize the view",
        body:
          "Open Settings for things like year range, colors, text overflow behavior, and Google Calendar sync (optional).",
        targetSelector: '[data-tour-id=\"settings-button\"]',
      },
      {
        id: "google",
        title: "Google Calendar sync (optional)",
        body:
          "If enabled, your Google events appear right inside the year view. It refreshes live while this tab is open.",
        targetSelector: '[data-tour-id=\"settings-google-sync\"]',
        optional: true,
        onEnter: () => {
          onRequestOpenSettings();
        },
      },
      {
        id: "auth",
        title: isAuthed ? "You’re signed in" : "Sign in when you’re ready",
        body: isAuthed
          ? "You now have access to multiple calendars, sharing, and collaboration features."
          : "Signing in lets you create multiple calendars, share them publicly, and invite others — while keeping your notes in sync.",
        targetSelector: '[data-tour-id=\"auth-button\"]',
      },
    ],
    [isAuthed, onRequestOpenSettings]
  );

  const visibleStepIndices = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < steps.length; i += 1) {
      const s = steps[i];
      if (s.when && !s.when(ctx)) continue;
      out.push(i);
    }
    return out;
  }, [steps, ctx]);

  const currentVisibleIndex = useMemo(() => {
    const idx = visibleStepIndices.indexOf(stepIndex);
    return idx >= 0 ? idx : 0;
  }, [stepIndex, visibleStepIndices]);

  const currentStep = useMemo(() => steps[stepIndex] ?? steps[0]!, [steps, stepIndex]);

  const goToVisibleIndex = (nextVisibleIndex: number) => {
    const step = visibleStepIndices[nextVisibleIndex];
    if (typeof step !== "number") return;
    setStepIndex(step);
  };

  const goNext = () => goToVisibleIndex(currentVisibleIndex + 1);
  const goBack = () => goToVisibleIndex(currentVisibleIndex - 1);

  const finish = () => {
    if (dontShowAgain) safeLocalStorageSet(STORAGE_KEY, "1");
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;
    setStepIndex(visibleStepIndices[0] ?? 0);
    const t = window.setTimeout(() => {
      primaryButtonRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    currentStep.onEnter?.();
  }, [open, currentStep]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish();
      }
      if (e.key === "ArrowRight") {
        if (currentVisibleIndex < visibleStepIndices.length - 1) goNext();
      }
      if (e.key === "ArrowLeft") {
        if (currentVisibleIndex > 0) goBack();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, currentVisibleIndex, visibleStepIndices.length]);

  useEffect(() => {
    if (!open) return;
    let raf = 0;

    const compute = () => {
      const selector = currentStep.targetSelector;
      const rect = selector ? getRectForSelector(selector) : null;
      setTargetRect(rect);
      raf = window.requestAnimationFrame(compute);
    };

    raf = window.requestAnimationFrame(compute);
    return () => window.cancelAnimationFrame(raf);
  }, [open, currentStep.targetSelector]);

  useLayoutEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;

    const margin = 14;
    const { innerWidth: vw, innerHeight: vh } = window;
    const cardRect = card.getBoundingClientRect();

    if (!targetRect) {
      setCardPos({
        left: clamp((vw - cardRect.width) / 2, margin, Math.max(margin, vw - cardRect.width - margin)),
        top: clamp((vh - cardRect.height) / 2, margin, Math.max(margin, vh - cardRect.height - margin)),
      });
      return;
    }

    const prefersBelow = targetRect.bottom + margin + cardRect.height <= vh - margin;
    const prefersAbove = targetRect.top - margin - cardRect.height >= margin;

    const top = prefersBelow
      ? targetRect.bottom + margin
      : prefersAbove
        ? targetRect.top - margin - cardRect.height
        : clamp(vh - cardRect.height - margin, margin, vh - cardRect.height - margin);

    const left = clamp(
      targetRect.left + targetRect.width / 2 - cardRect.width / 2,
      margin,
      vw - cardRect.width - margin
    );

    setCardPos({ top, left });
  }, [open, targetRect, currentStep.id]);

  useEffect(() => {
    if (!open) return;
    if (!currentStep.optional) return;
    if (!currentStep.targetSelector) return;
    if (targetRect) return;
    const t = window.setTimeout(() => {
      if (currentVisibleIndex < visibleStepIndices.length - 1) goNext();
    }, 450);
    return () => window.clearTimeout(t);
  }, [open, currentStep, targetRect, currentVisibleIndex, visibleStepIndices.length]);

  if (!open) return null;

  const isLast = currentVisibleIndex === visibleStepIndices.length - 1;
  const progressLabel = `${currentVisibleIndex + 1}/${visibleStepIndices.length}`;

  const highlightStyle: React.CSSProperties | undefined = targetRect
    ? (() => {
        const pad = 10;
        const top = Math.max(10, targetRect.top - pad);
        const left = Math.max(10, targetRect.left - pad);
        const width = Math.min(window.innerWidth - left - 10, targetRect.width + pad * 2);
        const height = Math.min(window.innerHeight - top - 10, targetRect.height + pad * 2);
        return {
          top,
          left,
          width,
          height,
          boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.58)",
        };
      })()
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      <div
        className={cn("fixed inset-0", targetRect ? "bg-transparent" : "bg-black/55 backdrop-blur-sm")}
        onMouseDown={() => finish()}
        aria-hidden="true"
      />

      {highlightStyle && (
        <div
          className="fixed rounded-2xl border border-white/20 ring-2 ring-primary/80 shadow-2xl pointer-events-none transition-[top,left,width,height] duration-150 ease-out"
          style={highlightStyle}
          aria-hidden="true"
        />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        className="fixed w-[min(420px,calc(100vw-2rem))] rounded-2xl border border-border bg-card/95 backdrop-blur-sm shadow-2xl p-4"
        style={cardPos}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{progressLabel}</div>
            <div className="text-lg font-semibold leading-tight">{currentStep.title}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => finish()} aria-label="Close tour">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-2 text-sm text-muted-foreground">{currentStep.body}</div>

        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          Don’t show this automatically again
        </label>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button variant="outline" onClick={() => finish()}>
            Skip
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => goBack()}
              disabled={currentVisibleIndex === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              ref={primaryButtonRef}
              onClick={() => {
                if (isLast) finish();
                else goNext();
              }}
              aria-label={isLast ? "Finish tour" : "Next step"}
            >
              {isLast ? "Done" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
