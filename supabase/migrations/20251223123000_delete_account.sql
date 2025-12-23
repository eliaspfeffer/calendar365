-- Allow users to delete their own account (and all private data via FK cascades).

CREATE OR REPLACE FUNCTION public.delete_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  deleting_user_id UUID;
BEGIN
  deleting_user_id := auth.uid();
  IF deleting_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Cleanup for tables that don't FK to auth.users (so cascades won't fire).
  DELETE FROM public.note_connections WHERE user_id = deleting_user_id;

  -- Deleting the auth user cascades to all app-owned tables via FK constraints.
  DELETE FROM auth.users WHERE id = deleting_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_account() TO authenticated;
