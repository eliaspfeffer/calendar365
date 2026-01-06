export async function toHelpfulEdgeFunctionError(err: unknown) {
  const baseMessage =
    (err as { message?: unknown } | null | undefined)?.message && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "Request failed";

  const context = (err as { context?: unknown } | null | undefined)?.context;
  if (!(context instanceof Response)) return baseMessage;

  let text = "";
  try {
    text = await context.clone().text();
  } catch {
    // ignore
  }

  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
    const detail = typeof parsed?.error === "string" ? parsed.error : typeof parsed?.message === "string" ? parsed.message : null;
    if (detail) return detail;
  } catch {
    // ignore
  }

  if (text.trim()) return text.trim();
  return `${baseMessage} (HTTP ${context.status})`;
}

