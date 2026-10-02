export type Plan = 'trial' | 'weekly' | 'yearly'

export const TRIAL = 0.99
export const YEAR = 34.99
export const YEAR_50_OFF = 17.49
export const WEEK = 6.99
// Yearly vs paying weekly for 52 weeks, rounded down.
export const YEARLY_SAVING_PCT = Math.floor((1 - YEAR / (WEEK * 52)) * 100)
export const OFFER_DURATION_MS = 10 * 60 * 1000
export const money = (value: number) => `$${value.toFixed(2)}`
export const yearlyPrice = (discounted: boolean) => (discounted ? YEAR_50_OFF : YEAR)
// The 50% offer only applies to the yearly plan.
export const isDiscounted = (plan: Plan, offerActive: boolean) => plan === 'yearly' && offerActive
export const amountDueToday = (plan: Plan, discounted: boolean) =>
  plan === 'trial' ? TRIAL : plan === 'yearly' ? yearlyPrice(discounted) : WEEK
export function renewalDate(plan: Plan) {
  const date = new Date()
  if (plan === 'trial') date.setDate(date.getDate() + 3)
  else if (plan === 'weekly') date.setDate(date.getDate() + 7)
  else date.setFullYear(date.getFullYear() + 1)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export const nextCharge = (plan: Plan) =>
  plan === 'yearly'
    ? `${money(YEAR)}/year on ${renewalDate(plan)}`
    : `${money(WEEK)}/week on ${renewalDate(plan)}`
export function price(plan: Plan, discounted: boolean) {
  const today = money(amountDueToday(plan, discounted))
  if (plan === 'trial')
    return { today, next: `Then ${money(WEEK)}/week starting ${renewalDate(plan)}` }
  if (plan === 'yearly')
    return { today, next: `Renews at ${money(YEAR)}/year on ${renewalDate(plan)}` }
  return { today, next: `Renews at ${money(WEEK)}/week on ${renewalDate(plan)}` }
}
