type SupabaseLikeError = {
  message?: string;
  code?: string;
};

export function isMissingTableOrSchemaCacheError(error: SupabaseLikeError | null | undefined) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("schema cache") || message.includes("could not find the table");
}

