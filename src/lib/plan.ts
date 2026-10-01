import source from './source-data.json'
import type { Answers } from './quiz'

type Template = { name: string; category: string; steps: number; level: number; minutes: number }
type Subject = { t: string; pro: string; cats: string[]; keys?: string[] }
const data = source as unknown as {
  LIB: Record<string, [string, string, number]>
  SUBJECT: Record<string, Subject>
  SKILL: Record<string, { t: string; chip: string; cap: number }>
  MINS: Record<string, { m: number; chip: string }>
  MODE: Record<string, string>
  CATLAB: Record<string, string>
}

export const templates: Record<string, Template> = Object.fromEntries(
  Object.entries(data.LIB).map(([key, [name, category, steps]]) => [
    key,
    {
      name,
      category,
      steps,
      level: steps <= 6 ? 1 : steps <= 9 ? 2 : 3,
      minutes: Math.round(steps * 2.2 + (category === 'Anime' ? 4 : 0)),
    },
  ]),
)
templates.photo = { name: 'Your own photo', category: 'Photos', steps: 6, level: 1, minutes: 15 }
export const categoryLabel = (key: string) => data.CATLAB[templates[key]?.category] || 'Your photo'
export const subject = (a: Answers) => data.SUBJECT[String(a.draw)] || data.SUBJECT.characters
export const skill = (a: Answers) => data.SKILL[String(a.level)] || data.SKILL.beginner
export const duration = (a: Answers) => data.MINS[String(a.time)] || data.MINS.mid
export const mode = (a: Answers) => data.MODE[String(a.device)] || data.MODE.phone
export const forKids = (a: Answers) => a.who === 'child' || a.who === 'both'
export const usesPhotos = (a: Answers) => a.photos === 'mostly' || a.photos === 'mix'
export const goalLabel = (a: Answers) =>
  ({ notrace: 'Try it with less tracing', daily: 'Your relaxing favorite' })[String(a.aim)] ||
  'First masterpiece'

export function makePlan(a: Answers): string[] {
  const s = subject(a),
    cap = skill(a).cap,
    minutes = duration(a).m
  let library = Object.keys(data.LIB).filter(
    (k) => !forKids(a) || !['vampire', 'devilgirl'].includes(k),
  )
  if (s.keys)
    library = library.filter((k) => s.keys!.includes(k) || !s.cats.includes(templates[k].category))
  let pool = library.filter(
    (k) => s.cats.includes(templates[k].category) && templates[k].level <= cap,
  )
  if (pool.length < 8)
    pool.push(
      ...library.filter(
        (k) =>
          s.cats.includes(templates[k].category) &&
          templates[k].level === cap + 1 &&
          !pool.includes(k),
      ),
    )
  if (pool.length < 8)
    pool.push(...library.filter((k) => templates[k].level <= cap && !pool.includes(k)))
  pool.sort(
    (x, y) =>
      Number(templates[y].minutes <= minutes) - Number(templates[x].minutes <= minutes) ||
      templates[x].steps - templates[y].steps ||
      x.localeCompare(y),
  )
  const take = (key: string) => {
    const index = pool.indexOf(key)
    if (index >= 0) pool.splice(index, 1)
    return key
  }
  let finish = pool.filter((k) => templates[k].minutes <= minutes + 10)
  if (!finish.length) finish = [...pool]
  if (a.aim === 'masterpiece') {
    const bigger = library.filter(
      (k) =>
        s.cats.includes(templates[k].category) &&
        templates[k].level <= cap + 1 &&
        templates[k].minutes <= minutes + 10,
    )
    if (bigger.length) finish = bigger
  }
  finish = [...finish].sort((x, y) => templates[y].steps - templates[x].steps || x.localeCompare(y))
  const finishKey = take(finish[a.aim === 'daily' ? Math.floor((finish.length - 1) / 2) : 0])
  const includePhoto = usesPhotos(a),
    needed = 6 - Number(includePhoto),
    days: string[] = []
  for (let i = 0; days.length < needed && pool.length && i < 300; i++) {
    const category = s.cats[i % s.cats.length]
    const key =
      pool.find((k) => templates[k].category === category) ||
      (i >= s.cats.length * 3 ? pool[0] : undefined)
    if (key) days.push(take(key))
  }
  days.sort((x, y) => templates[x].steps - templates[y].steps || x.localeCompare(y))
  if (includePhoto) days.splice(Math.min(4, days.length), 0, 'photo')
  if (finishKey) days.push(finishKey)
  return days
}
