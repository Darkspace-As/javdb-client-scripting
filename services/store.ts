import type { Movie } from "./javdb"

export type LocalRecord = {
  movie: Movie
  favorite: boolean
  want: boolean
  watched: boolean
  note: string
  updatedAt: number
}

export type ActressRecord = {
  name: string
  favorite: boolean
  updatedAt: number
}

export type LocalData = {
  records: Record<string, LocalRecord>
  history: Movie[]
  actresses: Record<string, ActressRecord>
}

const KEY = "javdb.client.records.v1"
const HISTORY_KEY = "javdb.client.history.v1"
const ACTRESS_KEY = "javdb.client.actresses.v1"
export const HOME_CACHE_KEY = "javdb.client.home-cache.v1"
export const LIBRARY_CACHE_KEY = "javdb.client.library-cache.v1"

function readRecords(): Record<string, LocalRecord> {
  return Storage.get<Record<string, LocalRecord>>(KEY) ?? {}
}
function writeRecords(records: Record<string, LocalRecord>): void { Storage.set(KEY, records) }
function readActresses(): Record<string, ActressRecord> { return Storage.get<Record<string, ActressRecord>>(ACTRESS_KEY) ?? {} }

export function getRecord(id: string): LocalRecord | null { return readRecords()[id] ?? null }

export function saveRecord(movie: Movie, patch: Partial<Omit<LocalRecord, "movie">>): LocalRecord {
  const records = readRecords()
  const previous = records[movie.id]
  const next: LocalRecord = { movie, favorite: previous?.favorite ?? false, want: previous?.want ?? false, watched: previous?.watched ?? false, note: previous?.note ?? "", updatedAt: Date.now(), ...patch }
  records[movie.id] = next
  writeRecords(records)
  return next
}

export function deleteRecords(ids: string[]): void {
  const records = readRecords()
  ids.forEach((id) => delete records[id])
  writeRecords(records)
}

export function listRecords(filter?: "favorite" | "want" | "watched"): LocalRecord[] {
  return Object.values(readRecords()).filter((record) => filter ? record[filter] : true).sort((a, b) => b.updatedAt - a.updatedAt)
}

export function addHistory(movie: Movie): void {
  const current = Storage.get<Movie[]>(HISTORY_KEY) ?? []
  Storage.set(HISTORY_KEY, [movie, ...current.filter((item) => item.id !== movie.id)].slice(0, 50))
}
export function listHistory(): Movie[] { return Storage.get<Movie[]>(HISTORY_KEY) ?? [] }
export function clearHistory(): void { Storage.set(HISTORY_KEY, []) }

export function isActressFavorite(name: string): boolean { return readActresses()[name]?.favorite ?? false }
export function setActressFavorite(name: string, favorite: boolean): void {
  const actresses = readActresses()
  actresses[name] = { name, favorite, updatedAt: Date.now() }
  Storage.set(ACTRESS_KEY, actresses)
}
export function listFavoriteActresses(): ActressRecord[] { return Object.values(readActresses()).filter((item) => item.favorite).sort((a, b) => a.name.localeCompare(b.name)) }

export function getCachedMovies(key: string): Movie[] { return Storage.get<Movie[]>(key) ?? [] }
export function setCachedMovies(key: string, movies: Movie[]): void { Storage.set(key, movies) }
export function getCachedRecords(): LocalRecord[] { return Storage.get<LocalRecord[]>(LIBRARY_CACHE_KEY) ?? [] }
export function setCachedRecords(records: LocalRecord[]): void { Storage.set(LIBRARY_CACHE_KEY, records) }

export function exportLocalData(): string {
  const data: LocalData = { records: readRecords(), history: listHistory(), actresses: readActresses() }
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), ...data }, null, 2)
}

export function importLocalData(json: string): { records: number; history: number; actresses: number } {
  const parsed = JSON.parse(json) as Partial<LocalData>
  if (!parsed || typeof parsed !== "object") throw new Error("JSON 格式无效")
  if (parsed.records && typeof parsed.records === "object") writeRecords(parsed.records as Record<string, LocalRecord>)
  if (Array.isArray(parsed.history)) Storage.set(HISTORY_KEY, parsed.history as Movie[])
  if (parsed.actresses && typeof parsed.actresses === "object") Storage.set(ACTRESS_KEY, parsed.actresses)
  return { records: Object.keys(parsed.records ?? {}).length, history: parsed.history?.length ?? 0, actresses: Object.keys(parsed.actresses ?? {}).length }
}
