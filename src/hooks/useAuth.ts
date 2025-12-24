import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/integrations/supabase/client';

function toHelpfulAuthError(error: unknown, context?: Record<string, unknown>): Error | null {
  if (!error) return null;
  const err = error as { message?: unknown; status?: unknown; code?: unknown; name?: unknown };
  const message = typeof err?.message === "string" && err.message.trim() ? err.message.trim() : "Unknown auth error";

  const details: string[] = [];
  if (typeof err?.code === "string" && err.code) details.push(`code=${err.code}`);
  if (typeof err?.status === "number") details.push(`status=${err.status}`);
  if (typeof err?.name === "string" && err.name) details.push(`name=${err.name}`);

  let suffix = details.length ? ` (${details.join(", ")})` : "";

  // Supabase sometimes returns generic mailer errors; add next steps.
  const messageLc = message.toLowerCase();
  if (messageLc.includes("error sending magic link email") || messageLc.includes("error sending confirmation email")) {
    suffix += `${suffix ? " " : ""}Check Supabase Auth Logs and your SMTP/mailer configuration.`;
  }

  // Keep the original error available for debugging.
  const finalError = new Error(`${message}${suffix}`);
  if (typeof console !== "undefined") {
    console.error("Supabase auth error", { error, ...context });
  }
  return finalError;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error getting session:", err);
        setSession(null);
        setUser(null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error("Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.") };
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: toHelpfulAuthError(error) };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error("Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."), needsEmailConfirmation: false };
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error: toHelpfulAuthError(error), needsEmailConfirmation: !error && !data.session };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    const { error } = await supabase.auth.signOut();
    return { error: error ?? null };
  };

  return {
    user,
    session,
    isLoading,
    signInWithPassword,
    signUpWithPassword,
    signOut,
  };
}
