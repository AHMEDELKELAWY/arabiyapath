import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ContactRequest = {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
  // Honeypot: must be empty
  company?: string;
  pageUrl?: string;
  timestamp?: string;
};

const isValidEmail = (email: string) => {
  // Basic email validation (server-side). Not perfect, but prevents obvious garbage.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const clamp = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

const getClientIp = (req: Request) => {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
};

// Best-effort in-memory rate limit (per edge instance)
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimitStore = new Map<string, number[]>();

const checkRateLimit = (key: string) => {
  const now = Date.now();
  const existing = rateLimitStore.get(key) || [];
  const recent = existing.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) return false;
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const ip = getClientIp(req);

  try {
    if (!checkRateLimit(`contact:${ip}`)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const body = (await req.json()) as Partial<ContactRequest>;

    const firstName = clamp(String(body.firstName ?? "").trim(), 80);
    const lastName = clamp(String(body.lastName ?? "").trim(), 80);
    const email = clamp(String(body.email ?? "").trim(), 255);
    const subject = clamp(String(body.subject ?? "").trim(), 160);
    const message = clamp(String(body.message ?? "").trim(), 4000);
    const company = String(body.company ?? "").trim();
    const pageUrl = clamp(String(body.pageUrl ?? "").trim(), 2048);
    const timestamp = clamp(
      String(body.timestamp ?? new Date().toISOString()).trim(),
      64
    );

    // Honeypot check
    if (company.length > 0) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!firstName || !lastName || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email address." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const token = Deno.env.get("POSTMARK_SERVER_TOKEN");
    const fromEmail = Deno.env.get("POSTMARK_FROM_EMAIL");

    if (!token || !fromEmail) {
      console.error("Missing Postmark env vars", {
        hasToken: Boolean(token),
        hasFrom: Boolean(fromEmail),
      });
      return new Response(
        JSON.stringify({ error: "Email provider not configured." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const to = "admin@arabiyapath.com";
    const finalSubject = `[ArabiyaPath] New Contact Message: ${subject}`;

    const textBody = [
      "New Contact Message (ArabiyaPath)",
      "",
      `First name: ${firstName}`,
      `Last name: ${lastName}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      "Message:",
      message,
      "",
      `Timestamp: ${timestamp}`,
      `Page URL: ${pageUrl || "(not provided)"}`,
      `IP: ${ip}`,
    ].join("\n");

    const htmlBody = `
      <h2>New Contact Message (ArabiyaPath)</h2>
      <p><strong>First name:</strong> ${escapeHtml(firstName)}<br/>
      <strong>Last name:</strong> ${escapeHtml(lastName)}<br/>
      <strong>Email:</strong> ${escapeHtml(email)}<br/>
      <strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <h3>Message</h3>
      <pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${escapeHtml(message)}</pre>
      <hr/>
      <p><strong>Timestamp:</strong> ${escapeHtml(timestamp)}<br/>
      <strong>Page URL:</strong> ${escapeHtml(pageUrl || "(not provided)")}<br/>
      <strong>IP:</strong> ${escapeHtml(ip)}</p>
    `.trim();

    const postmarkResp = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: fromEmail,
        To: to,
        Subject: finalSubject,
        ReplyTo: email,
        TextBody: textBody,
        HtmlBody: htmlBody,
        MessageStream: "outbound",
      }),
    });

    const respText = await postmarkResp.text();
    let respJson: Record<string, unknown> | null = null;
    try {
      respJson = respText ? JSON.parse(respText) : null;
    } catch {
      respJson = null;
    }

    if (!postmarkResp.ok) {
      console.error("Postmark send failed", {
        status: postmarkResp.status,
        body: respJson ?? respText,
      });
      return new Response(
        JSON.stringify({ error: "Failed to send email." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Postmark returns ErrorCode=0 for success
    const errorCode = Number((respJson as any)?.ErrorCode ?? 0);
    if (Number.isFinite(errorCode) && errorCode !== 0) {
      console.error("Postmark returned non-zero ErrorCode", respJson);
      return new Response(
        JSON.stringify({ error: "Failed to send email." }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Contact email sent", {
      to,
      subject: finalSubject,
      messageId: (respJson as any)?.MessageID,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("send-contact-email error", error);
    return new Response(JSON.stringify({ error: "Unexpected error." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
