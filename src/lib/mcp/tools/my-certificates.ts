import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_certificates",
  title: "My certificates",
  description:
    "Return the signed-in user's ArabiyaPath completion certificates with dialect, level, issue date, and public verification URL.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("certificates")
      .select(
        `id, issued_at, cert_code, public_url, dialects ( name ), levels ( name )`,
      )
      .eq("user_id", ctx.getUserId())
      .order("issued_at", { ascending: false });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const items = (data ?? []).map((row: any) => ({
      id: row.id,
      issued_at: row.issued_at,
      cert_code: row.cert_code,
      public_url: row.public_url,
      dialect_name: row.dialects?.name ?? null,
      level_name: row.levels?.name ?? null,
    }));

    return {
      content: [
        {
          type: "text",
          text:
            items.length === 0
              ? "No certificates earned yet."
              : JSON.stringify(items, null, 2),
        },
      ],
      structuredContent: { count: items.length, items },
    };
  },
});
