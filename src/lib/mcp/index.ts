import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listCourses from "./tools/list-courses";
import myProgress from "./tools/my-progress";
import myPurchases from "./tools/my-purchases";
import myCertificates from "./tools/my-certificates";

// Build the direct Supabase auth issuer from the project ref that Vite inlines
// at build time. Never derive it from SUPABASE_URL — on Lovable Cloud that is
// the `.lovable.cloud` proxy, and mcp-js rejects any token whose configured
// issuer doesn't match the direct `supabase.co` issuer the discovery document
// publishes. The fallback keeps the issuer well-formed during the throwaway
// manifest-extract eval.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "arabiyapath-mcp",
  title: "ArabiyaPath",
  version: "0.1.0",
  instructions:
    "Tools for your ArabiyaPath account. Use `whoami` for profile details, `list_courses` to browse dialects/levels/units, `my_progress` for recently completed lessons, `my_purchases` for owned courses and memberships, and `my_certificates` for earned certificates. All tools act as the signed-in user; per-user data is protected by row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listCourses, myProgress, myPurchases, myCertificates],
});
