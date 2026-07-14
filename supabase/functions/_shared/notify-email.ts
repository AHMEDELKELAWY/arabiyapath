// Shared helper to trigger a transactional email from server-side code
// (webhooks, capture flows). Uses SERVICE_ROLE_KEY as bearer so the
// send-transactional-email function (verify_jwt=true) accepts it.
// Failures are logged but never thrown — email must not break commerce flows.

export async function sendTransactionalEmail(params: {
  templateName: string
  recipientEmail: string
  idempotencyKey: string
  templateData?: Record<string, unknown>
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      console.error('notify-email: missing SUPABASE env')
      return
    }
    if (!params.recipientEmail) {
      console.warn('notify-email: skipped, no recipient', { template: params.templateName })
      return
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const t = await res.text()
      console.error('notify-email: send failed', { status: res.status, body: t, template: params.templateName })
    } else {
      console.log('notify-email: enqueued', { template: params.templateName, to: params.recipientEmail })
    }
  } catch (e) {
    console.error('notify-email: exception', e)
  }
}

// Look up the recipient's email + display name from a user_id.
export async function getUserContact(supabase: any, userId: string): Promise<{ email: string | null; name: string | null }> {
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', userId)
      .maybeSingle()
    let email = prof?.email ?? null
    const name = prof?.first_name
      ? `${prof.first_name}${prof.last_name ? ' ' + prof.last_name : ''}`
      : null
    if (!email) {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId)
      email = authUser?.user?.email ?? null
    }
    return { email, name }
  } catch (e) {
    console.error('getUserContact failed', e)
    return { email: null, name: null }
  }
}

export function formatDate(iso?: string | null): string | undefined {
  if (!iso) return undefined
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return undefined }
}

export function planLabel(plan?: string | null): string {
  switch (plan) {
    case 'monthly': return 'Monthly'
    case 'six_months': return '6 Months'
    case 'yearly': return 'Yearly'
    default: return plan || 'Membership'
  }
}
