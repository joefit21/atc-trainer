// Read-only audit of billing against accounts. Changes nothing.
//
//   node --env-file=.env.local scripts/billing-audit.mjs          emails masked
//   node --env-file=.env.local scripts/billing-audit.mjs --full   emails shown
//
// Finds the situations behind the cancellation complaints:
//   NO LOGIN      Stripe is billing someone whose account no longer exists
//   NOT LINKED    a login exists but no profile stores their Stripe customer id,
//                 so the Manage Subscription button cannot open their billing page
//   NOT FLAGGED   paying, but the profile is not marked subscribed (no access)
//   FREE ACCESS   marked subscribed with a Stripe customer id, but no live subscription
//                 (a cancellation the database missed)
// Exits with code 1 if anything is found, so it can run on a schedule.
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const full = process.argv.includes('--full')
const mask = (e) => (!e ? '(no email)' : full ? e : e.slice(0, 3) + '***@' + e.split('@')[1])
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BILLABLE = new Set(['active', 'trialing', 'past_due', 'unpaid'])
const TABLES = ['profiles', 'checkride_profiles', 'adm_profiles']
// Accounts that are subscribed on purpose without paying (owner and test accounts).
// Add more with BILLING_AUDIT_IGNORE=a@x.com,b@y.com
const IGNORE = new Set(['joe@flight-levels.com', ...(process.env.BILLING_AUDIT_IGNORE || '').split(',').filter(Boolean)].map((e) => e.toLowerCase()))

// All logins (paged).
const users = []
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error
  users.push(...data.users)
  if (data.users.length < 1000) break
}
const byEmail = new Map(users.map((u) => [(u.email || '').toLowerCase(), u]))

const rows = {}
for (const t of TABLES) {
  const { data, error } = await sb.from(t).select('*')
  if (error) throw new Error(`${t}: ${error.message}`)
  rows[t] = new Map(data.map((r) => [r.id, r]))
}

// Every live Stripe subscription, with its customer and product.
const subs = []
for (const status of BILLABLE) {
  for await (const s of stripe.subscriptions.list({ status, limit: 100, expand: ['data.customer'] })) subs.push(s)
}
const productName = new Map()
async function nameOf(id) {
  if (!productName.has(id)) productName.set(id, (await stripe.products.retrieve(id)).name)
  return productName.get(id)
}

const problems = []
let healthy = 0
const liveCustomers = new Set(subs.map((s) => s.customer.id))

for (const s of subs) {
  const c = s.customer
  const who = `${mask(c.email)} | ${await nameOf(s.items.data[0].price.product)} | ${s.status}`
  const u = byEmail.get((c.email || '').toLowerCase())
  if (!u) { problems.push(`NO LOGIN     ${who}  (sub ${s.id}, customer ${c.id})`); continue }
  const mine = TABLES.map((t) => rows[t].get(u.id)).filter(Boolean)
  if (!mine.some((r) => r.stripe_customer_id === c.id)) { problems.push(`NOT LINKED   ${who}  (customer ${c.id})`); continue }
  if (!mine.some((r) => r.is_subscribed || r.apple_active)) { problems.push(`NOT FLAGGED  ${who}  (customer ${c.id})`); continue }
  healthy++
}

// Reverse check: marked as paying through Stripe, but nothing live in Stripe.
for (const t of ['profiles', 'checkride_profiles']) {
  for (const r of rows[t].values()) {
    if (r.is_subscribed && r.stripe_customer_id && !liveCustomers.has(r.stripe_customer_id)) {
      const u = users.find((x) => x.id === r.id)
      if (IGNORE.has((u?.email || '').toLowerCase())) continue
      problems.push(`FREE ACCESS  ${mask(u?.email)} | ${t} marked subscribed but customer ${r.stripe_customer_id} has no live Stripe subscription`)
    }
  }
}

console.log(`Live Stripe subscriptions: ${subs.length} | healthy: ${healthy} | problems: ${problems.length}`)
for (const p of problems) console.log(' -', p)
if (problems.length === 0) console.log('Nothing to fix.')
process.exit(problems.length ? 1 : 0)
