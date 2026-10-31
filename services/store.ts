import { validateBackup } from "./backup"
import { safeRating } from "./state"
import type { Movie } from "./javdb"

export type LocalRecord = {
  movie: Movie
  favorite: boolean
  want: boolean
  watched: boolean
  note: string
  personalRating: number
  updatedAt: number
}
export type ActressRecord = { name: string; favorite: boolean; updatedAt: number }
export type AppSettings = { useCache: boolean; preferredCategory: string; showAdultWarning: boolean }
export type LocalData = { records: Record<string, LocalRecord>; history: Movie[]; actresses: Record<string, ActressRecord>; searchHistory: string[]; settings: AppSettings }

const KEY = "javdb.client.records.v1"
const HISTORY_KEY = "javdb.client.history.v1"
const ACTRESS_KEY = "javdb.client.actresses.v1"
const SEARCH_KEY = "javdb.client.search-history.v1"
const SETTINGS_KEY = "javdb.client.settings.v1"
export const HOME_CACHE_KEY = "javdb.client.home-cache.v1"
export const LIBRARY_CACHE_KEY = "javdb.client.library-cache.v1"

function readRecords(): Record<string, LocalRecord> { return Storage.get<Record<string, LocalRecord>>(KEY) ?? {} }
function writeRecords(records: Record<string, LocalRecord>): void { Storage.set(KEY, records) }
function readActresses(): Record<string, ActressRecord> { return Storage.get<Record<string, ActressRecord>>(ACTRESS_KEY) ?? {} }
export function getRecord(id: string): LocalRecord | null { return readRecords()[id] ?? null }
export function saveRecord(movie: Movie, patch: Partial<Omit<LocalRecord, "movie">>): LocalRecord { if (patch.personalRating !== undefined && safeRating(String(patch.personalRating)) === null) throw new Error("个人评分必须为0至10的有限数"); const records = readRecords(); const previous = records[movie.id]; const next: LocalRecord = { movie, favorite: previous?.favorite ?? false, want: previous?.want ?? false, watched: previous?.watched ?? false, note: previous?.note ?? "", personalRating: previous?.personalRating ?? 0, updatedAt: Date.now(), ...patch }; records[movie.id] = next; writeRecords(records); return next }
export function deleteRecords(ids: string[]): void { const records = readRecords(); ids.forEach((id) => delete records[id]); writeRecords(records) }
export function moveRecords(ids: string[], target: "favorite" | "want" | "watched"): void { const records = readRecords(); ids.forEach((id) => { const record = records[id]; if (!record) return; records[id] = { ...record, [target]: true, updatedAt: Date.now() } }); writeRecords(records) }
export function listRecords(filter?: "favorite" | "want" | "watched"): LocalRecord[] { return Object.values(readRecords()).filter((record) => filter ? record[filter] : true).sort((a, b) => b.updatedAt - a.updatedAt) }
export function addHistory(movie: Movie): void { const current = Storage.get<Movie[]>(HISTORY_KEY) ?? []; Storage.set(HISTORY_KEY, [movie, ...current.filter((item) => item.id !== movie.id)].slice(0, 50)) }
export function listHistory(): Movie[] { return Storage.get<Movie[]>(HISTORY_KEY) ?? [] }
export function clearHistory(): void { Storage.set(HISTORY_KEY, []) }
export function isActressFavorite(name: string): boolean { return readActresses()[name]?.favorite ?? false }
export function setActressFavorite(name: string, favorite: boolean): void { const actresses = readActresses(); actresses[name] = { name, favorite, updatedAt: Date.now() }; Storage.set(ACTRESS_KEY, actresses) }
export function listFavoriteActresses(): ActressRecord[] { return Object.values(readActresses()).filter((item) => item.favorite).sort((a, b) => a.name.localeCompare(b.name)) }
export function listSearchHistory(): string[] { return Storage.get<string[]>(SEARCH_KEY) ?? [] }
export function addSearchHistory(query: string): void { const value = query.trim(); if (!value) return; Storage.set(SEARCH_KEY, [value, ...listSearchHistory().filter((item) => item !== value)].slice(0, 20)) }
export function clearSearchHistory(): void { Storage.set(SEARCH_KEY, []) }
export function getSettings(): AppSettings { return Storage.get<AppSettings>(SETTINGS_KEY) ?? { useCache: true, preferredCategory: "全部", showAdultWarning: true } }
export function saveSettings(patch: Partial<AppSettings>): AppSettings { const next = { ...getSettings(), ...patch }; Storage.set(SETTINGS_KEY, next); return next }
export function getCachedMovies(key: string): Movie[] { return Storage.get<Movie[]>(key) ?? [] }
export function setCachedMovies(key: string, movies: Movie[]): void { Storage.set(key, movies) }
export function getCachedRecords(): LocalRecord[] { return Storage.get<LocalRecord[]>(LIBRARY_CACHE_KEY) ?? [] }
export function setCachedRecords(records: LocalRecord[]): void { Storage.set(LIBRARY_CACHE_KEY, records) }
export function exportLocalData(): string { const data: LocalData = { records: readRecords(), history: listHistory(), actresses: readActresses(), searchHistory: listSearchHistory(), settings: getSettings() }; return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), ...data }, null, 2) }
export function previewImport(json: string) { const data = validateBackup(json); return { records: Object.keys(data.records).length, history: data.history.length, actresses: Object.keys(data.actresses).length } }
function writeData(data: LocalData): void { writeRecords(data.records); Storage.set(HISTORY_KEY, data.history); Storage.set(ACTRESS_KEY, data.actresses); Storage.set(SEARCH_KEY, data.searchHistory); Storage.set(SETTINGS_KEY, data.settings) }
export function importLocalData(json: string, mode: "merge" | "replace" = "merge"): { records: number; history: number; actresses: number } {
  const imported = validateBackup(json)
  const current: LocalData = { records: readRecords(), history: listHistory(), actresses: readActresses(), searchHistory: listSearchHistory(), settings: getSettings() }
  const next: LocalData = mode === "replace" ? imported : {
    records: { ...current.records }, actresses: { ...current.actresses }, settings: current.settings,
    history: [...imported.history, ...current.history.filter(m => !imported.history.some(i => i.id === m.id))].slice(0, 50),
    searchHistory: [...new Set([...imported.searchHistory, ...current.searchHistory])].slice(0, 20)
  }
  if (mode === "merge") {
    Object.entries(imported.records).forEach(([id, record]) => { if (!next.records[id] || record.updatedAt > next.records[id].updatedAt) next.records[id] = record })
    Object.entries(imported.actresses).forEach(([name, record]) => { if (!next.actresses[name] || record.updatedAt > next.actresses[name].updatedAt) next.actresses[name] = record })
  }
  Storage.set("javdb.client.pre-import-recovery.v2", current)
  try { writeData(next) } catch (error) { writeData(current); throw error }
  return previewImport(json)
}
