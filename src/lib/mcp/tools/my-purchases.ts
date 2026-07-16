import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_purchases",
  title: "My purchases",
  description:
    "Return the signed-in user's ArabiyaPath purchases (courses, bundles, memberships) with product scope and status.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("purchases")
      .select(
        `id, status, created_at, products ( name, scope, dialect_id, level_id, price )`,
      )
      .eq("user_id", ctx.getUserId())
      .order("created_at", { ascending: false });

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const items = (data ?? []).map((row: any) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      product_name: row.products?.name ?? null,
      scope: row.products?.scope ?? null,
      dialect_id: row.products?.dialect_id ?? null,
      level_id: row.products?.level_id ?? null,
      price: row.products?.price ?? null,
    }));

    return {
      content: [
        {
          type: "text",
          text:
            items.length === 0
              ? "No purchases on record."
              : JSON.stringify(items, null, 2),
        },
      ],
      structuredContent: { count: items.length, items },
    };
  },
});
