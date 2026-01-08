import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { StickyNote, NoteConnection, StickyColor } from "@/types/calendar";

// Helper to call RPC functions that aren't in the generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = supabase.rpc.bind(supabase) as (name: string, params?: Record<string, unknown>) => Promise<{ data: any; error: any }>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

interface UsePublicShareEditParams {
  slug: string;
  password: string | null;
}

interface InsertNoteParams {
  calendarId: string;
  date?: string | null;
  text: string;
  color: StickyColor;
  posX?: number | null;
  posY?: number | null;
  sortOrder?: number | null;
}

interface UpdateNoteParams {
  noteId: string;
  text: string;
  color: StickyColor;
}

interface MoveNoteParams {
  noteId: string;
  date?: string | null;
  posX?: number | null;
  posY?: number | null;
  sortOrder?: number | null;
}

export function usePublicShareEdit({ slug, password }: UsePublicShareEditParams) {
  const insertNote = useCallback(
    async (params: InsertNoteParams): Promise<Result<StickyNote>> => {
      const { data, error } = await rpc("public_share_insert_sticky_note", {
        p_slug: slug,
        p_password: password,
        p_calendar_id: params.calendarId,
        p_date: params.date ?? null,
        p_text: params.text,
        p_color: params.color,
        p_pos_x: params.posX ?? null,
        p_pos_y: params.posY ?? null,
        p_sort_order: params.sortOrder ?? null,
      });

      if (error) {
        console.error("Error inserting note via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        date: string | null;
        text: string;
        color: StickyColor;
        is_struck: boolean;
        pos_x: number | null;
        pos_y: number | null;
        sort_order: number | null;
        created_at: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          date: row.date,
          text: row.text,
          color: row.color,
          is_struck: row.is_struck,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          sort_order: row.sort_order,
          created_at: row.created_at,
        },
      };
    },
    [slug, password]
  );

  const updateNote = useCallback(
    async (params: UpdateNoteParams): Promise<Result<StickyNote>> => {
      const { data, error } = await rpc("public_share_update_sticky_note", {
        p_slug: slug,
        p_password: password,
        p_note_id: params.noteId,
        p_text: params.text,
        p_color: params.color,
      });

      if (error) {
        console.error("Error updating note via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        date: string | null;
        text: string;
        color: StickyColor;
        is_struck: boolean;
        pos_x: number | null;
        pos_y: number | null;
        sort_order: number | null;
        created_at: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          date: row.date,
          text: row.text,
          color: row.color,
          is_struck: row.is_struck,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          sort_order: row.sort_order,
          created_at: row.created_at,
        },
      };
    },
    [slug, password]
  );

  const setNoteStruck = useCallback(
    async (noteId: string, isStruck: boolean): Promise<Result<StickyNote>> => {
      const { data, error } = await rpc("public_share_set_sticky_note_struck", {
        p_slug: slug,
        p_password: password,
        p_note_id: noteId,
        p_is_struck: isStruck,
      });

      if (error) {
        console.error("Error setting note struck via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        date: string | null;
        text: string;
        color: StickyColor;
        is_struck: boolean;
        pos_x: number | null;
        pos_y: number | null;
        sort_order: number | null;
        created_at: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          date: row.date,
          text: row.text,
          color: row.color,
          is_struck: row.is_struck,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          sort_order: row.sort_order,
          created_at: row.created_at,
        },
      };
    },
    [slug, password]
  );

  const moveNote = useCallback(
    async (params: MoveNoteParams): Promise<Result<StickyNote>> => {
      const { data, error } = await rpc("public_share_move_sticky_note", {
        p_slug: slug,
        p_password: password,
        p_note_id: params.noteId,
        p_date: params.date ?? null,
        p_pos_x: params.posX ?? null,
        p_pos_y: params.posY ?? null,
        p_sort_order: params.sortOrder ?? null,
      });

      if (error) {
        console.error("Error moving note via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        date: string | null;
        text: string;
        color: StickyColor;
        is_struck: boolean;
        pos_x: number | null;
        pos_y: number | null;
        sort_order: number | null;
        created_at: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          date: row.date,
          text: row.text,
          color: row.color,
          is_struck: row.is_struck,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          sort_order: row.sort_order,
          created_at: row.created_at,
        },
      };
    },
    [slug, password]
  );

  const updateNoteCalendar = useCallback(
    async (noteId: string, calendarId: string): Promise<Result<StickyNote>> => {
      const { data, error } = await rpc("public_share_update_sticky_note_calendar", {
        p_slug: slug,
        p_password: password,
        p_note_id: noteId,
        p_calendar_id: calendarId,
      });

      if (error) {
        console.error("Error updating note calendar via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        date: string | null;
        text: string;
        color: StickyColor;
        is_struck: boolean;
        pos_x: number | null;
        pos_y: number | null;
        sort_order: number | null;
        created_at: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          date: row.date,
          text: row.text,
          color: row.color,
          is_struck: row.is_struck,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          sort_order: row.sort_order,
          created_at: row.created_at,
        },
      };
    },
    [slug, password]
  );

  const setNoteSortOrder = useCallback(
    async (noteId: string, sortOrder: number): Promise<Result<StickyNote>> => {
      const { data, error } = await rpc("public_share_set_sticky_note_sort_order", {
        p_slug: slug,
        p_password: password,
        p_note_id: noteId,
        p_sort_order: sortOrder,
      });

      if (error) {
        console.error("Error setting note sort order via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        date: string | null;
        text: string;
        color: StickyColor;
        is_struck: boolean;
        pos_x: number | null;
        pos_y: number | null;
        sort_order: number | null;
        created_at: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          date: row.date,
          text: row.text,
          color: row.color,
          is_struck: row.is_struck,
          pos_x: row.pos_x,
          pos_y: row.pos_y,
          sort_order: row.sort_order,
          created_at: row.created_at,
        },
      };
    },
    [slug, password]
  );

  const deleteNote = useCallback(
    async (noteId: string): Promise<Result<boolean>> => {
      const { data, error } = await rpc("public_share_delete_sticky_note", {
        p_slug: slug,
        p_password: password,
        p_note_id: noteId,
      });

      if (error) {
        console.error("Error deleting note via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      return { ok: true, data: Boolean(data) };
    },
    [slug, password]
  );

  const insertConnection = useCallback(
    async (sourceNoteId: string, targetNoteId: string): Promise<Result<NoteConnection>> => {
      const { data, error } = await rpc("public_share_insert_note_connection", {
        p_slug: slug,
        p_password: password,
        p_source_note_id: sourceNoteId,
        p_target_note_id: targetNoteId,
      });

      if (error) {
        console.error("Error inserting connection via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      const row = data as {
        id: string;
        calendar_id: string;
        user_id: string;
        source_note_id: string;
        target_note_id: string;
      } | null;

      if (!row) {
        return { ok: false, error: "No data returned" };
      }

      return {
        ok: true,
        data: {
          id: row.id,
          calendar_id: row.calendar_id,
          user_id: row.user_id,
          source_note_id: row.source_note_id,
          target_note_id: row.target_note_id,
        },
      };
    },
    [slug, password]
  );

  const deleteConnection = useCallback(
    async (connectionId: string): Promise<Result<boolean>> => {
      const { data, error } = await rpc("public_share_delete_note_connection", {
        p_slug: slug,
        p_password: password,
        p_connection_id: connectionId,
      });

      if (error) {
        console.error("Error deleting connection via public share:", error);
        return { ok: false, error: parseError(error.message) };
      }

      return { ok: true, data: Boolean(data) };
    },
    [slug, password]
  );

  return {
    insertNote,
    updateNote,
    setNoteStruck,
    moveNote,
    updateNoteCalendar,
    setNoteSortOrder,
    deleteNote,
    insertConnection,
    deleteConnection,
  };
}

function parseError(message: string): string {
  const lower = message?.toLowerCase?.() ?? "";
  if (lower.includes("view only")) return "This link is view-only";
  if (lower.includes("not found")) return "Not found";
  if (lower.includes("not allowed")) return "Not allowed";
  if (lower.includes("invalid password")) return "Invalid password";
  if (lower.includes("too many attempts")) return "Too many attempts. Please try again later.";
  return message ?? "An error occurred";
}

