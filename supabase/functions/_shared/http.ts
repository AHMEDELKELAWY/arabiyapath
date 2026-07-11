// Shared helpers for consistent Edge Function responses.
// Import in a function like: `import { ok, fail, corsHeaders, handleOptions } from "../_shared/http.ts";`

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function ok(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    status: init.status ?? 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function fail(
  message: string,
  status = 500,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ error: message, ...extra }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/**
 * Wrap a handler with unified try/catch + CORS.
 * Usage:
 *   Deno.serve(withErrorHandling(async (req) => { ... return ok({...}) }))
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>,
  opts: { logName?: string } = {},
) {
  const name = opts.logName ?? "edge";
  return async (req: Request): Promise<Response> => {
    const preflight = handleOptions(req);
    if (preflight) return preflight;
    try {
      return await handler(req);
    } catch (err) {
      const anyErr = err as any;
      const status = typeof anyErr?.status === "number" ? anyErr.status : 500;
      const message = anyErr?.message || "Internal server error";
      console.error(`[${name}] error:`, message, anyErr?.stack || anyErr);
      return fail(message, status);
    }
  };
}
