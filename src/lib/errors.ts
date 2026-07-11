import { toast } from "sonner";

/**
 * Extract a user-friendly message from any thrown value.
 * Handles Supabase PostgrestError, FunctionsHttpError, standard Error, and unknowns.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  const anyErr = err as any;

  // Supabase Functions error: { context: Response }
  if (anyErr?.context && typeof anyErr.context === "object") {
    if (typeof anyErr.message === "string" && anyErr.message) return anyErr.message;
  }

  // Supabase PostgrestError { message, details, hint, code }
  if (typeof anyErr?.message === "string" && anyErr.message.trim()) {
    return anyErr.message;
  }
  if (typeof anyErr?.error_description === "string") return anyErr.error_description;
  if (typeof anyErr?.error === "string") return anyErr.error;

  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

/**
 * Classify errors for smarter UX (retry vs. auth vs. network vs. validation).
 */
export function classifyError(err: unknown): "network" | "auth" | "not_found" | "validation" | "rate_limit" | "server" | "unknown" {
  const anyErr = err as any;
  const status: number | undefined = anyErr?.status ?? anyErr?.statusCode ?? anyErr?.context?.status;
  const code: string | undefined = anyErr?.code;
  const msg = getErrorMessage(err, "").toLowerCase();

  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed")) {
    return "network";
  }
  if (status === 401 || status === 403 || code === "PGRST301" || msg.includes("jwt") || msg.includes("row-level security")) {
    return "auth";
  }
  if (status === 404 || code === "PGRST116") return "not_found";
  if (status === 400 || status === 422) return "validation";
  if (status === 429) return "rate_limit";
  if (typeof status === "number" && status >= 500) return "server";
  return "unknown";
}

/**
 * Show a toast for an error and log it. Use in catch blocks and mutation onError.
 */
export function toastError(err: unknown, fallback = "Something went wrong"): string {
  const message = getErrorMessage(err, fallback);
  const kind = classifyError(err);

  // Don't spam auth toasts (usually handled by redirect flows).
  if (kind === "auth") {
    console.warn("[auth error]", err);
  } else {
    console.error("[error]", err);
  }

  const friendly =
    kind === "network"
      ? "Network problem. Check your connection and try again."
      : kind === "rate_limit"
      ? "Too many requests. Please slow down and try again."
      : kind === "server"
      ? "Server error. Please try again in a moment."
      : message;

  toast.error(friendly);
  return friendly;
}

/**
 * Wrap an async action with try/catch + error toast. Returns undefined on failure.
 */
export async function withErrorToast<T>(fn: () => Promise<T>, fallback?: string): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    toastError(err, fallback);
    return undefined;
  }
}
