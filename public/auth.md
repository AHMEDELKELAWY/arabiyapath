# Auth.md

## Purpose

This document describes how AI agents and MCP clients (ChatGPT, Claude, Cursor,
Codex, and other MCP-compatible tools) authenticate with the ArabiyaPath MCP
server. All per-user tools execute as the signed-in ArabiyaPath user under
row-level security.

- **MCP endpoint:** `https://wruizzwgevxdsaiblmsd.supabase.co/functions/v1/mcp`
- **MCP Server Card:** <https://arabiyapath.com/.well-known/mcp/server-card.json>
- **API Catalog (RFC 9727):** <https://arabiyapath.com/.well-known/api-catalog>
- **Agent Skills index:** <https://arabiyapath.com/.well-known/agent-skills/index.json>

## Authentication method

ArabiyaPath uses **OAuth 2.1 authorization code flow with PKCE (S256)**. Bearer
access tokens are presented on every MCP request via the standard header:

```
Authorization: Bearer <access_token>
```

Only OAuth-issued tokens are accepted. Copied browser/session tokens are
rejected — they lack the `client_id` claim required for OAuth verification.

## OAuth discovery

Standards-compliant discovery is published at the following URLs:

- **OpenID Connect discovery:**
  <https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1/.well-known/openid-configuration>
- **OAuth 2.0 Authorization Server metadata (RFC 8414):**
  <https://wruizzwgevxdsaiblmsd.supabase.co/.well-known/oauth-authorization-server>
- **Issuer:** `https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1`
- **Authorization endpoint:** `https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1/authorize`
- **Token endpoint:** `https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1/token`
- **JWKS URI:** `https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1/.well-known/jwks.json`
- **Consent page:** <https://arabiyapath.com/.lovable/oauth/consent>

The `arabiyapath.com` origin also publishes pointer copies of these documents
under `/.well-known/openid-configuration` and
`/.well-known/oauth-authorization-server` for agents that crawl the app origin
first.

## Protected resource

The MCP endpoint's Protected Resource metadata (RFC 9728) is published at:

<https://arabiyapath.com/.well-known/oauth-protected-resource>

```
resource:                https://wruizzwgevxdsaiblmsd.supabase.co/functions/v1/mcp
authorization_servers:   https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1
bearer_methods_supported: header
scopes_supported:        openid, email, profile
```

Unauthenticated requests to the MCP endpoint receive `401 Unauthorized` with a
`WWW-Authenticate: Bearer` challenge referencing this metadata URL, per the MCP
spec.

## Registration instructions

- **Dynamic Client Registration (RFC 7591) is supported.** MCP clients should
  POST their client metadata to the `registration_endpoint` returned by
  authorization server metadata:
  `https://wruizzwgevxdsaiblmsd.supabase.co/auth/v1/oauth/clients/register`
- **PKCE (S256) is required.** `code_challenge_method=S256`.
- **Redirect URIs** must match exactly (scheme, host, port, path). Localhost
  loopback and custom scheme redirects (e.g. `cursor://`) are accepted.
- **Manual registration** is not required for compatible clients — dynamic
  registration is the recommended path.

Recommended client flow:

1. Attempt to call the MCP endpoint; receive `401` with a `WWW-Authenticate`
   challenge pointing to the protected-resource metadata.
2. Fetch protected-resource metadata → authorization-server metadata.
3. Register dynamically at the `registration_endpoint`.
4. Run OAuth 2.1 authorization code + PKCE. The user signs in on
   arabiyapath.com and approves the ArabiyaPath consent screen.
5. Exchange the authorization code for an access token and refresh token.
6. Call the MCP endpoint with `Authorization: Bearer <access_token>`.

## Supported scopes

| Scope | Meaning |
| --- | --- |
| `openid` | Issue an OIDC ID token identifying the ArabiyaPath user. |
| `email` | Include the user's email address in the ID token. |
| `profile` | Include basic profile fields (name, preferred dialect). |

Scopes are identity scopes only. Access to app data is governed by
row-level-security policies on the ArabiyaPath backend, not by OAuth scope
strings. Requesting additional non-identity scopes is not required and will be
ignored.

## Contact

For agent-integration issues, protocol questions, or to report a bug in the
MCP server, email **admin@arabiyapath.com**.
