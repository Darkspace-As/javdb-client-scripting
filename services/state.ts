import type { Movie } from "./javdb"
export type Page = { id: number } & ({ type: "movie"; movie: Movie } | { type: "actress"; name: string } | { type: "history" } | { type: "settings" } | { type: "catalog"; category: string } | { type: "actresses" } | { type: "resources" } | { type: "collection" })
export type NewPage = Page extends infer P ? P extends { id: number } ? Omit<P, "id"> : never : never
export function popPage(pages: Page[]): Page[] { return pages.slice(0, -1) }
export function appendUnique<T extends { id: string }>(previous: T[], incoming: T[]): T[] {
  const seen = new Set(previous.map(item => item.id))
  return [...previous, ...incoming.filter(item => { if (seen.has(item.id)) return false; seen.add(item.id); return true })]
}
export function safeRating(value: string): number | null {
  if (!value.trim()) return 0
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null
}
