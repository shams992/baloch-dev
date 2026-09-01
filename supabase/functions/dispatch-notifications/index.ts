import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

type OutboxRow = {
  id: string
  kind: "order_seller_email" | "order_seller_whatsapp" | "product_marketing" | "order_status_email"
  payload: Record<string, unknown>
  status: string
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

function money(n: unknown) {
  const v = Number(n ?? 0)
  return `PKR ${v.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`
}

function originFromReq(req: Request) {
  const env = Deno.env.get("PUBLIC_SITE_URL") ?? ""
  if (env) return env.replace(/\/$/, "")
  const origin = req.headers.get("origin")
  return origin ?? "https://balochexporthub.com"
}

async function sendResend(opts: { to: string; subject: string; html: string }) {
  const key = Deno.env.get("RESEND_API_KEY")
  if (!key) return { sent: false as const, reason: "RESEND_API_KEY is not configured" }
  const from = Deno.env.get("RESEND_FROM") ?? "Baloch Export Hub <noreply@balochexporthub.com>"
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  })
  if (!res.ok) {
    const text = await res.text()
    return { sent: false as const, reason: `Resend ${res.status}: ${text}` }
  }
  return { sent: true as const }
}

async function sendWhatsApp(to: string, body: string) {
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID")
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN")
  const twilioFrom = Deno.env.get("TWILIO_WHATSAPP_FROM")
  const metaToken = Deno.env.get("META_WHATSAPP_TOKEN")
  const metaPhoneId = Deno.env.get("META_WHATSAPP_PHONE_ID")

  const digits = to.replace(/[^\d+]/g, "")
  if (!digits) return { sent: false as const, reason: "Missing WhatsApp number" }

  if (twilioSid && twilioToken && twilioFrom) {
    const auth = btoa(`${twilioSid}:${twilioToken}`)
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        From: twilioFrom.startsWith("whatsapp:") ? twilioFrom : `whatsapp:${twilioFrom}`,
        To: digits.startsWith("whatsapp:") ? digits : `whatsapp:${digits}`,
        Body: body,
      }),
    })
    if (!res.ok) return { sent: false as const, reason: `Twilio ${res.status}: ${await res.text()}` }
    return { sent: true as const }
  }

  if (metaToken && metaPhoneId) {
    const res = await fetch(`https://graph.facebook.com/v20.0/${metaPhoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits.replace(/^\+/, ""),
        type: "text",
        text: { body },
      }),
    })
    if (!res.ok) return { sent: false as const, reason: `Meta WhatsApp ${res.status}: ${await res.text()}` }
    return { sent: true as const }
  }

  return { sent: false as const, reason: "No WhatsApp provider configured (Twilio or Meta)" }
}

function orderEmailHtml(p: Record<string, unknown>) {
  const items = Array.isArray(p.items) ? p.items as Array<Record<string, unknown>> : []
  const addr = (p.address ?? {}) as Record<string, unknown>
  const rows = items.map((i) =>
    `<tr>
      <td style="padding:8px 0">${String(i.name ?? "")}</td>
      <td style="padding:8px 0;text-align:center">${String(i.qty ?? "")}</td>
      <td style="padding:8px 0;text-align:right">${money(i.price)}</td>
      <td style="padding:8px 0;text-align:right">${money(i.total)}</td>
    </tr>`
  ).join("")
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h1 style="font-size:22px">New Order — Baloch Export Hub</h1>
      <p>You received a new order for <strong>${String(p.store_name ?? "your store")}</strong>.</p>
      <h2 style="font-size:16px">Buyer</h2>
      <p>
        ${String(p.buyer_name ?? "")}<br/>
        ${String(p.buyer_email ?? "")}<br/>
        ${p.buyer_phone ? String(p.buyer_phone) : ""}
      </p>
      <p>
        ${String(addr.full_name ?? "")}<br/>
        ${String(addr.line1 ?? "")}, ${String(addr.city ?? "")}, ${String(addr.state ?? "")}<br/>
        ${String(addr.country ?? "")}
      </p>
      <h2 style="font-size:16px">Order ${String(p.order_code ?? "")}</h2>
      <p>Payment method: ${String(p.payment_method ?? "")}<br/>Current status: Submitted Order</p>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
      <p>Subtotal: ${money(p.subtotal)}<br/>Shipping: ${money(p.shipping)}<br/><strong>Total: ${money(p.total)}</strong></p>
      <p>Please open your Seller Dashboard to process this order.</p>
    </div>`
}

function productEmailHtml(p: Record<string, unknown>, site: string, token: string) {
  const href = `${site}${String(p.href ?? "/")}`
  const unsub = `${site}/unsubscribe?token=${token}`
  const img = p.image ? `<img src="${String(p.image)}" alt="" style="width:100%;max-height:280px;object-fit:cover;border-radius:12px"/>` : ""
  return `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h1 style="font-size:22px">New Product Added to Baloch Export Hub</h1>
      ${img}
      <h2>${String(p.product_name ?? "")}</h2>
      <p>${String(p.store_name ?? "")}</p>
      <p>${String(p.description ?? "")}</p>
      <p><a href="${href}">View Product</a></p>
      <p style="font-size:12px;color:#666"><a href="${unsub}">Unsubscribe</a></p>
    </div>`
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  if (!supabaseUrl || !anon || !service) return json({ error: "Supabase env missing" }, 500)

  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401)

  const admin = createClient(supabaseUrl, service)
  const { data: rows, error } = await admin
    .from("notification_outbox")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(40)

  if (error) return json({ error: error.message }, 500)

  const results: Array<{ id: string; status: string; error?: string }> = []
  const site = originFromReq(req)

  for (const row of (rows ?? []) as OutboxRow[]) {
    try {
      if (row.kind === "order_seller_email") {
        const to = String(row.payload.seller_email ?? "")
        if (!to) {
          await admin.from("notification_outbox").update({ status: "failed", error: "Missing seller email", processed_at: new Date().toISOString() }).eq("id", row.id)
          results.push({ id: row.id, status: "failed", error: "Missing seller email" })
          continue
        }
        const send = await sendResend({
          to,
          subject: `New Order ${String(row.payload.order_code ?? "")} — Baloch Export Hub`,
          html: orderEmailHtml(row.payload),
        })
        const status = send.sent ? "sent" : "skipped_no_provider"
        await admin.from("notification_outbox").update({ status, error: send.sent ? null : send.reason, processed_at: new Date().toISOString() }).eq("id", row.id)
        results.push({ id: row.id, status, error: send.sent ? undefined : send.reason })
      } else if (row.kind === "order_seller_whatsapp") {
        if (row.payload.whatsapp_verified !== true) {
          await admin.from("notification_outbox").update({ status: "skipped_no_provider", error: "WhatsApp number is not verified", processed_at: new Date().toISOString() }).eq("id", row.id)
          results.push({ id: row.id, status: "skipped_no_provider" })
          continue
        }
        const items = Array.isArray(row.payload.items) ? row.payload.items as Array<Record<string, unknown>> : []
        const first = items[0] ?? {}
        const body = [
          "New Order — Baloch Export Hub",
          "",
          `Order: #${String(row.payload.order_code ?? "")}`,
          `Buyer: ${String(row.payload.buyer_name ?? "")}`,
          `Product: ${String(first.name ?? "See dashboard")}`,
          `Quantity: ${String(first.qty ?? "")}`,
          `Total: ${money(row.payload.total)}`,
          "",
          "Please open your seller dashboard to view the complete order.",
        ].join("\n")
        const send = await sendWhatsApp(String(row.payload.whatsapp ?? ""), body)
        const status = send.sent ? "sent" : "skipped_no_provider"
        await admin.from("notification_outbox").update({ status, error: send.sent ? null : send.reason, processed_at: new Date().toISOString() }).eq("id", row.id)
        results.push({ id: row.id, status, error: send.sent ? undefined : send.reason })
      } else if (row.kind === "product_marketing" || row.kind === "order_status_email") {
        if (row.kind === "product_marketing") {
          const { data: subs } = await admin.from("email_subscribers").select("email, unsubscribe_token").eq("is_subscribed", true)
          const key = Deno.env.get("RESEND_API_KEY")
          if (!key) {
            await admin.from("notification_outbox").update({ status: "skipped_no_provider", error: "RESEND_API_KEY is not configured", processed_at: new Date().toISOString() }).eq("id", row.id)
            results.push({ id: row.id, status: "skipped_no_provider", error: "RESEND_API_KEY is not configured" })
            continue
          }
          let failed = 0
          for (const sub of subs ?? []) {
            const send = await sendResend({
              to: sub.email,
              subject: `New Product Added to Baloch Export Hub — ${String(row.payload.product_name ?? "")}`,
              html: productEmailHtml(row.payload, site, sub.unsubscribe_token),
            })
            if (!send.sent) failed += 1
          }
          const status = failed && !(subs ?? []).length ? "skipped_no_provider" : "sent"
          await admin.from("notification_outbox").update({
            status: (subs ?? []).length ? "sent" : "sent",
            error: (subs ?? []).length === 0 ? "No active subscribers" : (failed ? `${failed} send(s) failed` : null),
            processed_at: new Date().toISOString(),
          }).eq("id", row.id)
          results.push({ id: row.id, status })
        }
      } else {
        await admin.from("notification_outbox").update({ status: "failed", error: "Unknown kind", processed_at: new Date().toISOString() }).eq("id", row.id)
        results.push({ id: row.id, status: "failed" })
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      await admin.from("notification_outbox").update({ status: "failed", error: message, processed_at: new Date().toISOString() }).eq("id", row.id)
      results.push({ id: row.id, status: "failed", error: message })
    }
  }

  return json({ ok: true, processed: results.length, results })
})
