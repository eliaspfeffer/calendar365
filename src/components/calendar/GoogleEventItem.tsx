import type { GoogleCalendarDayEvent } from "@/types/googleCalendar";
import { cn } from "@/lib/utils";

export function GoogleEventItem({
  event,
  compact = false,
}: {
  event: GoogleCalendarDayEvent;
  compact?: boolean;
}) {
  const label = event.isContinuation ? "↳" : event.startTimeLabel ?? "";
  const text = `${label ? `${label} ` : ""}${event.summary}`;

  return (
    <a
      href={event.htmlLink || undefined}
      target={event.htmlLink ? "_blank" : undefined}
      rel={event.htmlLink ? "noreferrer" : undefined}
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

