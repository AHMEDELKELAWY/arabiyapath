// Deno test for the PayPal → membership email decision.
//
// Simulates:
//   - First PAYMENT.SALE.COMPLETED (paidCount = 1, current sale just recorded)
//     → membership-activated MUST enqueue, membership-renewed MUST NOT.
//   - Recurring PAYMENT.SALE.COMPLETED (paidCount = 2)
//     → membership-renewed MUST enqueue, membership-activated MUST NOT.
//
// Also verifies the end-to-end enqueue path by stubbing global fetch
// (which notify-email.ts hits at /functions/v1/send-transactional-email)
// and asserting the template name that would be enqueued.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideMembershipEmails } from "./membership-email-decision.ts";
import { sendTransactionalEmail } from "../_shared/notify-email.ts";

Deno.test("first payment → sendActivated only", () => {
  const d = decideMembershipEmails(1);
  assertEquals(d, { sendActivated: true, sendRenewed: false });
});

Deno.test("recurring payment → sendRenewed only", () => {
  const d = decideMembershipEmails(2);
  assertEquals(d, { sendActivated: false, sendRenewed: true });
});

Deno.test("later recurring payments → sendRenewed only", () => {
  for (const n of [3, 6, 12, 24]) {
    assertEquals(decideMembershipEmails(n), { sendActivated: false, sendRenewed: true });
  }
});

Deno.test("no payments yet (defensive, count=0) → treated as first", () => {
  assertEquals(decideMembershipEmails(0), { sendActivated: true, sendRenewed: false });
});

// End-to-end enqueue: simulate what the webhook would call after computing
// the decision, and assert the correct template lands in the fetch call to
// send-transactional-email.
Deno.test("first payment enqueues membership-activated via notify-email", async () => {
  Deno.env.set("SUPABASE_URL", "http://localhost");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
  const calls: { url: string; body: any }[] = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = ((input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ url, body });
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as typeof fetch;

  try {
    const d = decideMembershipEmails(1);
    if (d.sendActivated) {
      await sendTransactionalEmail({
        templateName: "membership-activated",
        recipientEmail: "user@example.com",
        idempotencyKey: "mem-activated-SUB-1",
        templateData: { name: "Sara", plan: "Monthly", billingPeriod: "Monthly" },
      });
    }
    if (d.sendRenewed) {
      await sendTransactionalEmail({
        templateName: "membership-renewed",
        recipientEmail: "user@example.com",
        idempotencyKey: "mem-renewed-SALE-1",
        templateData: { name: "Sara", plan: "Monthly" },
      });
    }
  } finally {
    globalThis.fetch = origFetch;
  }

  assertEquals(calls.length, 1);
  assertEquals(calls[0].body.templateName, "membership-activated");
  assertEquals(calls[0].body.idempotencyKey, "mem-activated-SUB-1");
});

Deno.test("recurring payment enqueues membership-renewed via notify-email", async () => {
  Deno.env.set("SUPABASE_URL", "http://localhost");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
  const calls: { url: string; body: any }[] = [];
  const origFetch = globalThis.fetch;
  globalThis.fetch = ((input: any, init?: any) => {
    const url = typeof input === "string" ? input : input.url;
    const body = init?.body ? JSON.parse(init.body) : null;
    calls.push({ url, body });
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }) as typeof fetch;

  try {
    const d = decideMembershipEmails(2);
    if (d.sendActivated) {
      await sendTransactionalEmail({
        templateName: "membership-activated",
        recipientEmail: "user@example.com",
        idempotencyKey: "mem-activated-SUB-1",
        templateData: {},
      });
    }
    if (d.sendRenewed) {
      await sendTransactionalEmail({
        templateName: "membership-renewed",
        recipientEmail: "user@example.com",
        idempotencyKey: "mem-renewed-SALE-2",
        templateData: { name: "Sara", plan: "Monthly" },
      });
    }
  } finally {
    globalThis.fetch = origFetch;
  }

  assertEquals(calls.length, 1);
  assertEquals(calls[0].body.templateName, "membership-renewed");
  assertEquals(calls[0].body.idempotencyKey, "mem-renewed-SALE-2");
});
