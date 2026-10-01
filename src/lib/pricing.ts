export const YEAR = 34.99
export const YEAR_10_OFF = 31.99
export const WEEK = 6.99
export const money = (value: number) => `$${value.toFixed(2)}`
export function renewalDate(plan: 'yearly' | 'weekly') {
  const date = new Date()
  if (plan === 'weekly') date.setDate(date.getDate() + 7)
  else date.setFullYear(date.getFullYear() + 1)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function price(plan: 'yearly' | 'weekly') {
  return plan === 'yearly'
    ? {
        today: `${money(YEAR_10_OFF)}. 10% off the first year`,
        next: `Renews at ${money(YEAR)}/year on ${renewalDate(plan)}`,
      }
    : { today: money(WEEK), next: `Renews at ${money(WEEK)}/week on ${renewalDate(plan)}` }
}
