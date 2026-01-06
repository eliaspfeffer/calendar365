import YAML from "yaml";
import type { StickyColor } from "@/types/calendar";
import { coerceStickyColor } from "@/lib/stickyNoteColors";

export type YamlNoteEntry = {
  id?: string;
  date?: string | null;
  float?: { x: number; y: number } | null;
  text: string;
  color?: StickyColor;
  connection?: string[] | null;
};

export type YamlCalendarNotesDocumentV1 = {
  schema: "calendar365.notes.v1";
  language: "YAML 1.2";
  calendar: string;
  default_color?: StickyColor;
  mode?: "merge" | "replace";
  notes: YamlNoteEntry[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function coerceString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function coerceStringOrNull(value: unknown): string | null {
  if (value === null) return null;
  return coerceString(value);
}

function coerceFloat(value: unknown): { x: number; y: number } | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return null;
  const x = typeof value.x === "number" && Number.isFinite(value.x) ? value.x : null;
  const y = typeof value.y === "number" && Number.isFinite(value.y) ? value.y : null;
  if (x === null || y === null) return null;
  return { x, y };
}

function coerceConnection(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const s = coerceString(value);
    return s ? [s] : null;
  }
  if (Array.isArray(value)) {
    const out = value.map(coerceString).filter((v): v is string => Boolean(v));
    return out.length > 0 ? out : null;
  }
  return null;
}

export function stringifyYamlNotesDocument(doc: YamlCalendarNotesDocumentV1): string {
  return YAML.stringify(doc, { lineWidth: 0 });
}

export type ParseYamlNotesResult =
  | { ok: true; value: YamlCalendarNotesDocumentV1; warnings: string[] }
  | { ok: false; errors: string[] };

export function parseYamlNotesDocument(input: string): ParseYamlNotesResult {
  let raw: unknown;
  try {
    raw = YAML.parse(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid YAML";
    return { ok: false, errors: [message] };
  }

  if (!isRecord(raw)) return { ok: false, errors: ["Expected a YAML mapping/object at the top level."] };

  const errors: string[] = [];
  const warnings: string[] = [];

  const schema = raw.schema;
  if (schema !== "calendar365.notes.v1") {
    errors.push(`Unsupported or missing schema. Expected "calendar365.notes.v1".`);
  }

  const calendar = coerceString(raw.calendar);
  if (!calendar) errors.push(`Missing "calendar" (string).`);

  const defaultColorRaw = coerceString(raw.default_color);
  const default_color = defaultColorRaw ? coerceStickyColor(defaultColorRaw, "yellow") : undefined;
  if (defaultColorRaw && default_color !== defaultColorRaw) {
    warnings.push(`default_color: coerced "${defaultColorRaw}" -> "${default_color}"`);
  }

  const mode = raw.mode === "merge" || raw.mode === "replace" ? raw.mode : undefined;

  if (!Array.isArray(raw.notes)) errors.push(`Missing "notes" (array).`);

  if (errors.length > 0) return { ok: false, errors };

  const notesRaw = raw.notes as unknown[];
  const notes: YamlNoteEntry[] = [];

  for (let i = 0; i < notesRaw.length; i += 1) {
    const entry = notesRaw[i];
    if (!isRecord(entry)) {
      errors.push(`notes[${i}]: expected an object`);
      continue;
    }

    const text = coerceString(entry.text);
    if (!text) {
      errors.push(`notes[${i}].text: required (string)`);
      continue;
    }

    const id = coerceString(entry.id) ?? undefined;
    const date = entry.date === undefined ? null : coerceStringOrNull(entry.date);
    const float = entry.float === undefined ? null : coerceFloat(entry.float);

    const colorRaw = entry.color === undefined ? null : coerceString(entry.color);
    const color = colorRaw ? coerceStickyColor(colorRaw, "yellow") : undefined;
    if (colorRaw && colorRaw !== color) warnings.push(`notes[${i}].color: coerced "${colorRaw}" -> "${color}"`);

    const connection = coerceConnection(entry.connection ?? entry.connects_to);
    if (entry.connects_to !== undefined && entry.connection === undefined) {
      warnings.push(`notes[${i}]: "connects_to" is deprecated; use "connection"`);
    }

    notes.push({
      id,
      date,
      float,
      text,
      color,
      connection,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      schema: "calendar365.notes.v1",
      language: "YAML 1.2",
      calendar: calendar!,
      default_color,
      mode,
      notes,
    },
    warnings,
  };
}

export function makeYamlNotesExample(calendarName: string): string {
  return [
    "# Language: YAML 1.2",
    "# Comments start with '#'.",
    "#",
    "# Schema: calendar365.notes.v1",
    "# - Edit this file, then import it back into the app.",
    "# - Keep 'id' if you want to update an existing note; remove 'id' to create a new one.",
    "# - A note can either have a fixed 'date' (YYYY-MM-DD) OR be undated with a 'float' position.",
    "# - 'connection' uses the other note's full text (human readable). Exact match recommended.",
    "",
    'schema: "calendar365.notes.v1"',
    'language: "YAML 1.2"',
    `calendar: "${calendarName.replaceAll('"', '\\"')}"`,
    "# default_color: yellow   # optional: omitted colors will use this",
    "# mode: merge   # merge (default) or replace (delete existing notes in this calendar)",
    "notes:",
    "  # One entry per note",
    "  - # id: \"uuid-from-export\"  # keep to update the same note",
    "    date: 2026-01-06",
    "    text: |",
    "      Example note text (multi-line is allowed).",
    "      - Markdown-ish text is fine; it’s stored as plain text.",
    "    # color: green  # optional (defaults to default_color)",
    "    # connection: [\"Some other note text\"]  # optional",
    "",
    "  - float: { x: 220, y: 140 }  # undated note position",
    "    text: \"Undated note that floats on the canvas\"",
    "    color: pink  # optional (only needed if not default_color)",
    "",
  ].join("\n");
}
