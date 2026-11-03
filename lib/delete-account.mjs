// Account deletion for ATC Trainer, written so Stripe and the database are passed in:
// that lets every branch, including the failures, be tested with fakes.
//
// The rule it exists to enforce: billing is stopped BEFORE anything is deleted. A past
// version deleted the account and left the Stripe subscription running, so people
// kept being charged for an account that no longer existed.

// Subscriptions that can still bill (or be retried): all of them must stop.
export const BILLABLE = ['active', 'trialing', 'past_due', 'unpaid']

// Every Stripe customer that belongs to this person: the ids stored in any app's
// profile table, plus any customer with the same verified email. Flight Levels apps
// share one login and one Stripe account, so a bundle buyer can have several.
export async function customerIdsFor(user, { stripe, db }) {
  const ids = new Set()
  for (const table of ['profiles', 'checkride_profiles']) {
    const { data } = await db.from(table).select('stripe_customer_id').eq('id', user.id).maybeSingle()
    if (data?.stripe_customer_id) ids.add(data.stripe_customer_id)
  }
  if (user.email) {
    const found = await stripe.customers.list({ email: user.email, limit: 10 })
    for (const c of found.data) ids.add(c.id)
  }
  return [...ids]
}

// Cancels everything that could still charge this person. Throws if any cancel fails.
export async function stopBilling(user, deps) {
  const cancelled = []
  for (const customer of await customerIdsFor(user, deps)) {
    for (const status of BILLABLE) {
      const subs = await deps.stripe.subscriptions.list({ customer, status, limit: 20 })
      for (const sub of subs.data) {
        await deps.stripe.subscriptions.cancel(sub.id)
        cancelled.push(sub.id)
      }
    }
  }
  return cancelled
}

// Returns { ok: true, cancelled } or { ok: false, error }, where error is
// 'billing_not_cancelled' (nothing was deleted) or 'delete_incomplete' (billing is
// already stopped; the login or its data could not be fully removed).
export async function deleteAccount(user, deps) {
  let cancelled
  try {
    cancelled = await stopBilling(user, deps)
  } catch (e) {
    deps.log?.('could not cancel billing', e)
    return { ok: false, error: 'billing_not_cancelled' }
  }
  try {
    // Data rows first (foreign keys), then the login, which is shared across apps.
    await deps.db.from('profiles').delete().eq('id', user.id)
    await deps.db.from('checkride_profiles').delete().eq('id', user.id)
    const { error } = await deps.deleteUser(user.id)
    if (error) throw error
    return { ok: true, cancelled }
  } catch (e) {
    deps.log?.('delete incomplete (billing already cancelled)', e)
    return { ok: false, error: 'delete_incomplete' }
  }
}
