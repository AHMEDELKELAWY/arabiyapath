import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "my_progress",
  title: "My learning progress",
  description:
    "Return the signed-in user's recently completed ArabiyaPath lessons, with unit, level, and dialect names.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("How many recent lessons to return. Defaults to 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_progress")
      .select(
        `lesson_id, completed_at, lessons ( title, units ( title, levels ( name, dialects ( name ) ) ) )`,
      )
      .eq("user_id", ctx.getUserId())
      .order("completed_at", { ascending: false })
      .limit(limit ?? 20);

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }

    const items = (data ?? []).map((row: any) => ({
      lesson_id: row.lesson_id,
      lesson_title: row.lessons?.title ?? null,
      unit_title: row.lessons?.units?.title ?? null,
      level_name: row.lessons?.units?.levels?.name ?? null,
      dialect_name: row.lessons?.units?.levels?.dialects?.name ?? null,
      completed_at: row.completed_at,
    }));

    return {
      content: [
        {
          type: "text",
          text:
            items.length === 0
              ? "No completed lessons yet."
              : JSON.stringify(items, null, 2),
        },
      ],
      structuredContent: { count: items.length, items },
    };
  },
});
