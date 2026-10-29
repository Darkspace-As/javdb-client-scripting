import type { Movie } from "./javdb"

export type LocalRecord = {
  movie: Movie
  favorite: boolean
  want: boolean
  watched: boolean
  note: string
  updatedAt: number
}

const KEY = "javdb.client.records.v1"
const HISTORY_KEY = "javdb.client.history.v1"

function readRecords(): Record<string, LocalRecord> {
  return Storage.get<Record<string, LocalRecord>>(KEY) ?? {}
}

function writeRecords(records: Record<string, LocalRecord>): void {
  Storage.set(KEY, records)
}

export function getRecord(id: string): LocalRecord | null {
  return readRecords()[id] ?? null
}

export function saveRecord(movie: Movie, patch: Partial<Omit<LocalRecord, "movie">>): LocalRecord {
  const records = readRecords()
  const previous = records[movie.id]
  const next: LocalRecord = {
    movie,
    favorite: previous?.favorite ?? false,
    want: previous?.want ?? false,
    watched: previous?.watched ?? false,
    note: previous?.note ?? "",
    updatedAt: Date.now(),
    ...patch,
  }
  records[movie.id] = next
  writeRecords(records)
  return next
}

export function listRecords(filter?: "favorite" | "want" | "watched"): LocalRecord[] {
  return Object.values(readRecords()).filter((record) => filter ? record[filter] : true)
}

export function addHistory(movie: Movie): void {
  const current = Storage.get<Movie[]>(HISTORY_KEY) ?? []
  const next = [movie, ...current.filter((item) => item.id !== movie.id)].slice(0, 50)
  Storage.set(HISTORY_KEY, next)
}

export function listHistory(): Movie[] {
  return Storage.get<Movie[]>(HISTORY_KEY) ?? []
}

export function exportLocalData(): string {
  return JSON.stringify({ records: readRecords(), history: listHistory() }, null, 2)
}
