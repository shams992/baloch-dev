import type { Order, OrderItem, Profile, Store } from '@/lib/types'
import { formatDate, formatMoney } from '@/lib/util'

export interface VoucherInput {
  order: Order
  items: OrderItem[]
  store: Store
  seller?: Profile | null
}

/** Open a print-ready voucher so the seller can save it as PDF. */
export function downloadOrderVoucher(input: VoucherInput) {
  const html = buildVoucherHtml(input)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', `Order voucher ${input.order.code}`)
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    document.body.removeChild(iframe)
    throw new Error('Could not open the voucher. Please allow pop-ups and try again.')
  }
  doc.open()
  doc.write(html)
  doc.close()
  const win = iframe.contentWindow
  if (!win) {
    document.body.removeChild(iframe)
    throw new Error('Could not print the voucher.')
  }
  const cleanup = () => {
    setTimeout(() => iframe.remove(), 800)
  }
  win.onafterprint = cleanup
  setTimeout(() => {
    win.focus()
    win.print()
  }, 350)
}

function esc(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildVoucherHtml({ order, items, store, seller }: VoucherInput): string {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const fullOrder = items.length === order.items.length
  const shipping = fullOrder ? order.shipping : 0
  const total = fullOrder ? order.total : subtotal
  const rows = items.map((i) => `
    <tr>
      <td>
        <div class="prod">
          ${i.image ? `<img src="${esc(i.image)}" alt="" />` : '<div class="ph"></div>'}
          <div>
            <strong>${esc(i.name)}</strong>
            <div class="muted">Qty ${i.qty} · ${esc(formatMoney(i.price))}</div>
          </div>
        </div>
      </td>
      <td class="num">${esc(formatMoney(i.price * i.qty))}</td>
    </tr>`).join('')

  const addr = order.address
  const shipTo = [addr.full_name, addr.line1, [addr.city, addr.state].filter(Boolean).join(', '), addr.country, addr.phone]
    .filter(Boolean).map(esc).join('<br/>')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>BEH-${esc(order.code)}-voucher</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #15201e; font-family: Georgia, 'Times New Roman', serif; background: #fff; }
    .wrap { max-width: 720px; margin: 0 auto; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 2px solid #b9821f; padding-bottom: 16px; }
    .brand h1 { margin: 0; font-size: 22px; letter-spacing: -0.02em; }
    .brand h1 span { color: #b9821f; }
    .tag { margin: 8px 0 0; font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #6d7874; }
    .meta { text-align: right; font-size: 12px; color: #3d4a47; }
    .meta strong { display: block; font-size: 16px; color: #15201e; margin-bottom: 4px; }
    h2 { font-size: 13px; letter-spacing: 0.14em; text-transform: uppercase; color: #0d7d76; margin: 22px 0 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .box { border: 1px solid #e6ddcc; border-radius: 10px; padding: 12px 14px; font-size: 13px; line-height: 1.45; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #6d7874; border-bottom: 1px solid #e6ddcc; padding: 8px 0; }
    td { padding: 10px 0; border-bottom: 1px solid #f0eadf; vertical-align: middle; font-size: 13px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .prod { display: flex; align-items: center; gap: 10px; }
    .prod img, .ph { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; background: #f4efe6; }
    .muted { color: #6d7874; font-size: 11px; margin-top: 2px; }
    .totals { margin-left: auto; width: 240px; margin-top: 12px; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #15201e; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; }
    footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e6ddcc; font-size: 11px; color: #6d7874; display: flex; justify-content: space-between; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <h1>Baloch <span>Export Hub</span></h1>
        <p class="tag">Craft • Culture • Trade</p>
      </div>
      <div class="meta">
        <strong>Order voucher</strong>
        ${esc(order.code)}<br/>
        ${esc(formatDate(order.created_at, true))}<br/>
        Status: ${esc(order.status)}
      </div>
    </header>

    <div class="grid">
      <div>
        <h2>Seller</h2>
        <div class="box">
          <strong>${esc(store.name)}</strong><br/>
          ${store.location ? esc(store.location) + '<br/>' : ''}
          ${seller?.full_name ? esc(seller.full_name) + '<br/>' : ''}
          ${seller?.phone ? esc(seller.phone) : ''}
        </div>
      </div>
      <div>
        <h2>Buyer</h2>
        <div class="box">
          <strong>${esc(order.buyer_name)}</strong><br/>
          ${shipTo}
        </div>
      </div>
    </div>

    <h2>Products</h2>
    <table>
      <thead><tr><th>Item</th><th class="num">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${esc(formatMoney(subtotal))}</span></div>
      ${fullOrder ? `<div><span>Shipping</span><span>${esc(formatMoney(shipping))}</span></div>` : ''}
      <div class="grand"><span>Grand total</span><span>${esc(formatMoney(total))}</span></div>
    </div>

    <footer>
      <span>Baloch Export Hub · Craft • Culture • Trade</span>
      <span>Payment: ${esc(order.payment)}${order.payment_method ? ' · ' + esc(order.payment_method) : ''}</span>
    </footer>
  </div>
</body>
</html>`
}
