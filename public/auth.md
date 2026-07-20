# Agent Authentication — ArabiyaPath

ArabiyaPath exposes an MCP server for AI agents (ChatGPT, Claude, Cursor,
Codex, and other MCP-compatible clients). All per-user tools run as the
signed-in ArabiyaPath user under row-level security.

## Endpoints

- **MCP server:** `https://wruizzwgevxdsaiblmsd.supabase.co/functions/v1/mcp`
- **Server Card:** <https://arabiyapath.com/.well-known/mcp/server-card.json>
- **Agent Skills Index:** <https://arabiyapath.com/.well-known/agent-skills/index.json>
- **API Catalog (RFC 9727):** <https://arabiyapath.com/.well-known/api-catalog>

## Authentication

ArabiyaPath uses **OAuth 2.1 with PKCE** and supports **Dynamic Client
Registration (RFC 7591)**. Discovery is standards-compliant:

- **Protected Resource metadata (RFC 9728):**
  <https://arabiyapath.com/.well-known/oauth-protected-resource>
- **Authorization Server metadata (RFC 8414):**
  <https://wruizzwgevxdsaiblmsd.supabase.co/.well-known/oauth-authorization-server>
- **OpenID Configuration:**
  <https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1/.well-known/openid-configuration>
- **Issuer:** `https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1`
- **Accepted audiences:** `authenticated`
- **Supported scopes:** `openid`, `email`, `profile`
- **PKCE:** `S256` required
- **Consent screen:** <https://arabiyapath.com/.lovable/oauth/consent>

### Flow (for MCP clients)

1. Client discovers the MCP endpoint and receives a `401 Unauthorized` with a
   `WWW-Authenticate: Bearer` challenge referencing the protected-resource
   metadata URL above.
2. Client fetches the protected-resource metadata, then the authorization
   server metadata.
3. Client registers dynamically at the `registration_endpoint` (RFC 7591).
4. Client runs the standard authorization code + PKCE flow. The user signs in
   at arabiyapath.com and approves the ArabiyaPath consent screen.
5. Client presents the access token as `Authorization: Bearer <token>` to the
   MCP endpoint. Tokens are Supabase-issued JWTs; verification is enforced by
   the MCP server against the issuer's JWKS.

Do **not** use raw Supabase session tokens copied from a browser. Only OAuth
tokens issued through the flow above are accepted by the MCP server (they
carry the `client_id` claim required for OAuth-client verification).

## Tool inventory

The full list is served from
<https://arabiyapath.com/.well-known/agent-skills/index.json>. All tools are
read-only, idempotent, and closed-world (no external side effects).

| Tool | Purpose |
| --- | --- |
| `whoami` | Signed-in user's profile, preferred dialect, admin flag. |
| `list_courses` | Dialects → levels → units catalog. |
| `my_progress` | Recently completed lessons for the user. |
| `my_purchases` | User's purchases (courses, bundles, memberships). |
| `my_certificates` | User's completion certificates with public URLs. |

## Contact

For agent-integration issues email **admin@arabiyapath.com**.
