import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FREE_LESSON_URL = "https://arabiyapath.com/learn/gulf-arabic";
const BOOK_URL = "https://yourkeystoarabic.com";

interface EmailRequest {
  email: string;
  emailNumber: number;
}

const emailTemplates: Record<number, { subject: string; html: string }> = {
  0: {
    subject: "Your Free Gulf Arabic Lesson is Ready! 🎉",
    html: `
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">Welcome to ArabiyaPath!</h1>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Congratulations on taking your first step toward speaking Gulf Arabic!
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Your free lesson is ready. Click below to start learning the Arabic people actually speak in the Gulf.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${FREE_LESSON_URL}" style="display: inline-block; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Start Free Lesson →
        </a>
      </div>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        In this lesson, you'll learn:
      </p>
      <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
        <li>How Gulf Arabic actually sounds</li>
        <li>Basic greetings you can use today</li>
        <li>Pronunciation with native audio</li>
      </ul>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Over the next few days, I'll share more tips on learning Arabic the practical way.
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Happy learning!<br>
        The ArabiyaPath Team
      </p>
    `,
  },
  1: {
    subject: "Why Gulf Arabic Works Better Than Grammar-First Learning",
    html: `
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">The Problem With Traditional Arabic Learning</h1>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Most Arabic courses start with grammar rules and Modern Standard Arabic (Fusha).
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        But here's the problem: <strong>nobody speaks Fusha in daily life.</strong>
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        When you arrive in Dubai, Riyadh, or Doha, you'll hear Gulf Arabic everywhere — at work, in shops, with neighbors.
      </p>
      <h2 style="color: #1a1a1a; font-size: 20px; margin: 25px 0 15px;">The Speaking-First Approach</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        At ArabiyaPath, we flip the script:
      </p>
      <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
        <li><strong>Start with useful phrases</strong> — not abstract rules</li>
        <li><strong>Learn through listening</strong> — native audio from day one</li>
        <li><strong>Practice real scenarios</strong> — greetings, shopping, directions</li>
      </ul>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        This way, you're speaking Arabic within your first week — not your first year.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${FREE_LESSON_URL}" style="display: inline-block; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Continue Learning →
        </a>
      </div>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Tomorrow, I'll share something that can accelerate your progress even more.
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Talk soon,<br>
        The ArabiyaPath Team
      </p>
    `,
  },
  2: {
    subject: "Your Complete Roadmap to Arabic (No Overwhelm)",
    html: `
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">From Zero to Confident Speaker</h1>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        You've started your Gulf Arabic journey — that's huge!
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        But if you're wondering "what's next?" or feeling unsure about the path ahead, I have something for you.
      </p>
      <h2 style="color: #1a1a1a; font-size: 20px; margin: 25px 0 15px;">Introducing: Your Keys to Arabic</h2>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        This is the complete roadmap I wish I had when I started learning Arabic.
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        <strong>Your Keys to Arabic</strong> shows you:
      </p>
      <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
        <li>Which Arabic to learn first (and why it matters)</li>
        <li>The fastest path from beginner to confident speaker</li>
        <li>How to stay motivated when learning gets hard</li>
        <li>Real strategies used by successful Arabic learners</li>
      </ul>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${BOOK_URL}" style="display: inline-block; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Get the Book →
        </a>
      </div>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        If you prefer to continue with the free course, that's great too! You can always access it here:
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        <a href="${FREE_LESSON_URL}" style="color: #D97706;">Continue Free Course →</a>
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Either way, I'm here to help you speak Arabic with confidence.
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
        Best,<br>
        The ArabiyaPath Team
      </p>
    `,
  },
};

function wrapInTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          ${content}
        </div>
        <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
          <p>ArabiyaPath — Learn Arabic the Natural Way</p>
          <p><a href="https://arabiyapath.com" style="color: #888;">arabiyapath.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, emailNumber }: EmailRequest = await req.json();

    if (!email || emailNumber === undefined) {
      throw new Error("Missing email or emailNumber");
    }

    const template = emailTemplates[emailNumber];
    if (!template) {
      throw new Error(`Invalid email number: ${emailNumber}`);
    }

    // Get SMTP credentials
    const smtpHost = Deno.env.get("ZOHO_SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("ZOHO_SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("ZOHO_SMTP_USER");
    const smtpPass = Deno.env.get("ZOHO_SMTP_PASS");

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP credentials not configured");
    }

    console.log(`Sending email ${emailNumber} to ${email}`);

    // Create SMTP client and send email
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    await client.send({
      from: `ArabiyaPath <${smtpUser}>`,
      to: email,
      subject: template.subject,
      html: wrapInTemplate(template.html),
    });

    await client.close();

    console.log(`Email ${emailNumber} sent successfully to ${email}`);

    // Update subscriber record
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateField = `email_${emailNumber}_sent_at`;
    await supabase
      .from("funnel_subscribers")
      .update({ [updateField]: new Date().toISOString() })
      .eq("email", email);

    return new Response(
      JSON.stringify({ success: true, emailNumber }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending funnel email:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
