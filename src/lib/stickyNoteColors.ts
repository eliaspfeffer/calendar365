import type { StickyColor } from "@/types/calendar";

export const STICKY_NOTE_COLORS: Array<{ value: StickyColor; className: string; label: string }> = [
  { value: "yellow", className: "bg-sticky-yellow", label: "Yellow" },
  { value: "pink", className: "bg-sticky-pink", label: "Pink" },
  { value: "green", className: "bg-sticky-green", label: "Green" },
  { value: "blue", className: "bg-sticky-blue", label: "Blue" },
  { value: "orange", className: "bg-sticky-orange", label: "Orange" },
  { value: "purple", className: "bg-sticky-purple", label: "Purple" },
];

export function coerceStickyColor(value: unknown, fallback: StickyColor = "yellow"): StickyColor {
  if (value === "yellow") return "yellow";
  if (value === "pink") return "pink";
  if (value === "green") return "green";
  if (value === "blue") return "blue";
  if (value === "orange") return "orange";
  if (value === "purple") return "purple";
  return fallback;
}

