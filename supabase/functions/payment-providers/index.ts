import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

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

const PROVIDERS = ["easypaisa", "jazzcash", "sadapay", "bank_transfer", "cod"] as const
type Provider = typeof PROVIDERS[number]

function providerConfigured(provider: Provider) {
  if (provider === "cod" || provider === "bank_transfer") return true
  if (provider === "easypaisa") return Boolean(Deno.env.get("EASYPAISA_MERCHANT_ID") && Deno.env.get("EASYPAISA_STORE_ID") && Deno.env.get("EASYPAISA_HASH_KEY"))
  if (provider === "jazzcash") return Boolean(Deno.env.get("JAZZCASH_MERCHANT_ID") && Deno.env.get("JAZZCASH_PASSWORD") && Deno.env.get("JAZZCASH_INTEGERITY_SALT"))
  if (provider === "sadapay") return Boolean(Deno.env.get("SADAPAY_MERCHANT_ID") && Deno.env.get("SADAPAY_API_KEY"))
  return false
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  const authHeader = req.headers.get("Authorization") ?? ""
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  const userClient = createClient(supabaseUrl, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: userData } = await userClient.auth.getUser()
  if (!userData.user) return json({ error: "Not authenticated" }, 401)

  let body: { provider?: string; order_id?: string; action?: string }
  try { body = await req.json() } catch { return json({ error: "Invalid JSON" }, 400) }

  const provider = String(body.provider ?? "") as Provider
  if (!PROVIDERS.includes(provider)) return json({ error: "Unsupported payment method" }, 400)

  const admin = createClient(supabaseUrl, service)
  const { data: order } = await admin.from("orders").select("id, buyer_id, total, payment, payment_method").eq("id", body.order_id).maybeSingle()
  if (!order || order.buyer_id !== userData.user.id) return json({ error: "Order not found" }, 404)

  if (provider === "cod") {
    return json({
      ok: true,
      provider,
      status: "pending",
      payment: "pending",
      message: "Cash on delivery recorded. The order is not marked paid until the seller confirms delivery.",
    })
  }

  if (provider === "bank_transfer") {
    return json({
      ok: true,
      provider,
      status: "awaiting_proof",
      payment: "pending",
      instructions: Deno.env.get("BANK_TRANSFER_INSTRUCTIONS") ?? "Transfer the order total to the platform bank account shown at checkout, then upload your payment proof. The order stays pending until an admin confirms the transfer.",
    })
  }

  if (!providerConfigured(provider)) {
    await admin.from("payment_transactions").update({
      status: "awaiting_provider",
      metadata: { note: "Merchant credentials are not configured. Order remains unpaid." },
      updated_at: new Date().toISOString(),
    }).eq("order_id", order.id).eq("provider", provider)
    return json({
      ok: true,
      provider,
      configured: false,
      status: "awaiting_provider",
      payment: "pending",
      message: `${provider} merchant credentials are not configured. The order was created with payment pending and will not be marked paid from the client.`,
    }, 200)
  }

  // Live wallet APIs require merchant credentials and signed callbacks.
  // Do not mark paid here — webhooks must confirm asynchronously.
  return json({
    ok: true,
    provider,
    configured: true,
    status: "awaiting_provider",
    payment: "pending",
    message: "Redirect/checkout with the payment provider is not fully wired. Orders stay pending until a verified server-side webhook marks them paid.",
  })
})
