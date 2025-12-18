import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CalendarListItem } from "@/hooks/useCalendars";

export function CalendarSwitcher({
  calendars,
  value,
  onChange,
}: {
  calendars: CalendarListItem[];
  value: string;
  onChange: (ownerId: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[220px] bg-background/80 backdrop-blur-sm">
        <SelectValue placeholder="Select calendar" />
      </SelectTrigger>
      <SelectContent>
        {calendars.map((c) => (
          <SelectItem key={c.ownerId} value={c.ownerId}>
            {c.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

