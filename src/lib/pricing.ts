export type Plan = 'trial' | 'weekly' | 'yearly'

export const TRIAL = 0.99
export const YEAR = 63
export const YEAR_50_OFF = 31.49
export const WEEK = 6.99
export const money = (value: number) => `$${value.toFixed(2)}`
export const amountDueToday = (plan: Plan) =>
  plan === 'trial' ? TRIAL : plan === 'yearly' ? YEAR_50_OFF : WEEK
export function renewalDate(plan: Plan) {
  const date = new Date()
  if (plan === 'trial') date.setDate(date.getDate() + 3)
  else if (plan === 'weekly') date.setDate(date.getDate() + 7)
  else date.setFullYear(date.getFullYear() + 1)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function price(plan: Plan) {
  if (plan === 'trial')
    return {
      today: money(amountDueToday(plan)),
      next: `Then ${money(WEEK)}/week starting ${renewalDate(plan)}`,
    }
  if (plan === 'yearly')
    return {
      today: money(amountDueToday(plan)),
      next: `Renews at ${money(YEAR)}/year on ${renewalDate(plan)}`,
    }
  return {
    today: money(amountDueToday(plan)),
    next: `Renews at ${money(WEEK)}/week on ${renewalDate(plan)}`,
  }
}
