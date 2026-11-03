// Tests lib/delete-account.mjs with fake Stripe and database clients (no network, no
// real accounts). Run: node scripts/test-delete-account.mjs
import { deleteAccount } from '../lib/delete-account.mjs'

function fakes({ profiles = {}, customers = [], subs = [], failCancel = null, failDeleteUser = false } = {}) {
  const calls = []
  const stripe = {
    customers: { list: async ({ email }) => ({ data: customers.filter((c) => c.email === email) }) },
    subscriptions: {
      list: async ({ customer, status }) => ({ data: subs.filter((s) => s.customer === customer && s.status === status) }),
      cancel: async (id) => {
        if (failCancel === id) throw new Error('stripe down')
        calls.push(['cancel', id])
      },
    },
  }
  const db = {
    from: (table) => ({
      select: () => ({ eq: (_c, id) => ({ maybeSingle: async () => ({ data: (profiles[table] || {})[id] || null }) }) }),
      delete: () => ({ eq: async (_c, id) => { calls.push(['delete-row', table, id]); return {} } }),
    }),
  }
  const deleteUser = async (id) => {
    calls.push(['delete-user', id])
    return failDeleteUser ? { error: new Error('fk') } : { error: null }
  }
  return { deps: { stripe, db, deleteUser, log: () => {} }, calls }
}

let failed = 0
const check = (name, cond) => { console.log(cond ? 'ok  ' : 'FAIL', name); if (!cond) failed++ }
const user = { id: 'u1', email: 'a@x.com' }
const idx = (calls, kind) => calls.findIndex((c) => c[0] === kind)

// 1. The reported bug: a Stripe customer found only by email (our profile has no id) is still cancelled.
{
  const { deps, calls } = fakes({ customers: [{ id: 'cus_A', email: 'a@x.com' }], subs: [{ id: 'sub_A', customer: 'cus_A', status: 'active' }] })
  const r = await deleteAccount(user, deps)
  check('finds a customer by email and cancels its subscription', r.ok && calls.some((c) => c[0] === 'cancel' && c[1] === 'sub_A'))
  check('cancels BEFORE deleting anything', idx(calls, 'cancel') < idx(calls, 'delete-row') && idx(calls, 'cancel') < idx(calls, 'delete-user'))
}
// 2. Customer id stored on the profile; every billable status is stopped, ended ones are left alone.
{
  const { deps, calls } = fakes({
    profiles: { profiles: { u1: { stripe_customer_id: 'cus_B' } } },
    subs: [
      { id: 'sub_active', customer: 'cus_B', status: 'active' },
      { id: 'sub_pastdue', customer: 'cus_B', status: 'past_due' },
      { id: 'sub_old', customer: 'cus_B', status: 'canceled' },
    ],
  })
  const r = await deleteAccount(user, deps)
  const cancelled = calls.filter((c) => c[0] === 'cancel').map((c) => c[1]).sort()
  check('cancels active and past_due, ignores already-cancelled', r.ok && cancelled.join() === 'sub_active,sub_pastdue')
}
// 3. Bundle buyer: a customer id stored only in the Checkride table is also found.
{
  const { deps, calls } = fakes({ profiles: { checkride_profiles: { u1: { stripe_customer_id: 'cus_C' } } }, subs: [{ id: 'sub_C', customer: 'cus_C', status: 'active' }] })
  const r = await deleteAccount(user, deps)
  check('finds a customer id stored only in checkride_profiles', r.ok && calls.some((c) => c[1] === 'sub_C'))
}
// 4. Someone else's subscription is never touched.
{
  const { deps, calls } = fakes({
    profiles: { profiles: { u1: { stripe_customer_id: 'cus_MINE' } } },
    subs: [{ id: 'sub_mine', customer: 'cus_MINE', status: 'active' }, { id: 'sub_theirs', customer: 'cus_OTHER', status: 'active' }],
    customers: [{ id: 'cus_OTHER', email: 'someone@else.com' }],
  })
  await deleteAccount(user, deps)
  check("never cancels another person's subscription", !calls.some((c) => c[1] === 'sub_theirs'))
}
// 5. If Stripe cannot cancel, NOTHING is deleted and the caller is told billing was not cancelled.
{
  const { deps, calls } = fakes({ customers: [{ id: 'cus_D', email: 'a@x.com' }], subs: [{ id: 'sub_D', customer: 'cus_D', status: 'active' }], failCancel: 'sub_D' })
  const r = await deleteAccount(user, deps)
  check('Stripe failure -> error billing_not_cancelled', !r.ok && r.error === 'billing_not_cancelled')
  check('Stripe failure -> no rows and no login deleted', !calls.some((c) => c[0].startsWith('delete')))
}
// 6. If the login cannot be deleted after billing stopped, say so (billing is already safe).
{
  const { deps, calls } = fakes({ customers: [{ id: 'cus_E', email: 'a@x.com' }], subs: [{ id: 'sub_E', customer: 'cus_E', status: 'active' }], failDeleteUser: true })
  const r = await deleteAccount(user, deps)
  check('login delete failure -> delete_incomplete, billing was cancelled', !r.ok && r.error === 'delete_incomplete' && calls.some((c) => c[1] === 'sub_E'))
}
// 7. Someone with no billing at all deletes cleanly.
{
  const { deps, calls } = fakes()
  const r = await deleteAccount(user, deps)
  check('no billing: deletes rows and login', r.ok && calls.some((c) => c[0] === 'delete-user'))
}
// 8. A missing email does not crash the Stripe lookup.
{
  const { deps } = fakes({ profiles: { profiles: { u1: { stripe_customer_id: 'cus_F' } } }, subs: [{ id: 'sub_F', customer: 'cus_F', status: 'active' }] })
  const r = await deleteAccount({ id: 'u1', email: null }, deps)
  check('works when the login has no email', r.ok)
}
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`)
process.exit(failed ? 1 : 0)
