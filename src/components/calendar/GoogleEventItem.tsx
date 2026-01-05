import type { GoogleCalendarDayEvent } from "@/types/googleCalendar";
import { cn } from "@/lib/utils";

export function GoogleEventItem({
  event,
  compact = false,
}: {
  event: GoogleCalendarDayEvent;
  compact?: boolean;
}) {
  const label = event.isContinuation
    ? "↳"
    : event.isAllDay
      ? ""
      : event.startTimeLabel ?? "";
  const text = `${label ? `${label} ` : ""}${event.summary}`;
  const href = event.webLink || event.htmlLink || undefined;

  return (
    <a
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      onClick={(e) => e.stopPropagation()}
      title={`${event.calendarSummary ? `${event.calendarSummary}: ` : ""}${event.summary}`}
      className={cn(
        "block w-full rounded px-1 py-0.5 text-[10px] leading-tight",
        "bg-primary/10 text-foreground/90 hover:bg-primary/15",
        compact && "truncate"
      )}
    >
      <span className={cn(compact && "truncate")}>{text}</span>
    </a>
  );
}
