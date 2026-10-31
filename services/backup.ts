import type { LocalData, LocalRecord, ActressRecord, AppSettings } from "./store"
import type { Movie } from "./javdb"
const categories = ["全部", "有码", "无码", "欧美", "动漫", "FC2"]
function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 必须为对象`)
  return value as Record<string, unknown>
}
function text(value: unknown, label: string): string { if (typeof value !== "string" || value.length > 20000) throw new Error(`${label} 必须为合理长度字符串`); return value }
function bool(value: unknown): boolean { if (typeof value !== "boolean") throw new Error("标记必须是布尔值"); return value }
function number(value: unknown): number { if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new Error("数值无效"); return value }
function strings(value: unknown): string[] { if (!Array.isArray(value) || value.length > 10000) throw new Error("字符串列表无效"); return value.map(item => text(item, "列表项")) }
function movie(value: unknown): Movie {
  const o = object(value, "影片")
  const id = text(o.id, "影片ID"); if (!id || ["__proto__", "constructor", "prototype"].includes(id)) throw new Error("影片ID无效")
  const url = (v: unknown, cover = false) => { const s = text(v, "网址"); if (!s) return ""; const u = new URL(s); if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("不安全的网址"); if (!cover && u.hostname !== "javdb.com" && !u.hostname.endsWith(".javdb.com")) throw new Error("影片原页须属于 JavDB"); return s }
  return { id, code: text(o.code, "番号"), title: text(o.title, "标题"), date: text(o.date, "日期"), rating: text(o.rating, "评分"), count: text(o.count, "人数"), cover: url(o.cover, true), actresses: strings(o.actresses), tags: strings(o.tags), maker: text(o.maker, "片商"), duration: text(o.duration, "片长"), subtitle: bool(o.subtitle), sourceURL: url(o.sourceURL) }
}
export function validateBackup(json: string): LocalData {
  if (json.length > 10 * 1024 * 1024) throw new Error("备份文件超过 10 MB")
  const o = object(JSON.parse(json), "备份")
  if (o.version !== 1 && o.version !== 2) throw new Error("仅支持版本 1 / 2 备份")
  const records: Record<string, LocalRecord> = {}
  for (const [id, value] of Object.entries(object(o.records, "影片记录"))) {
    const r = object(value, "记录"); const m = movie(r.movie)
    if (id !== m.id) throw new Error("记录键与影片ID不一致")
    const rating = r.personalRating === undefined && o.version === 1 ? 0 : number(r.personalRating)
    if (rating > 10) throw new Error("个人评分必须在0到10之间")
    records[id] = { movie: m, favorite: bool(r.favorite), want: bool(r.want), watched: bool(r.watched), note: text(r.note, "备注"), personalRating: rating, updatedAt: number(r.updatedAt) }
  }
  if (!Array.isArray(o.history)) throw new Error("历史须为数组")
  const history = o.history.map(movie).slice(0, 50)
  const actresses: Record<string, ActressRecord> = {}
  for (const [name, value] of Object.entries(object(o.actresses ?? {}, "女优记录"))) {
    if (["__proto__", "constructor", "prototype"].includes(name)) throw new Error("女优键无效")
    const a = object(value, "女优"); if (a.name !== name) throw new Error("女优键不一致")
    actresses[name] = { name, favorite: bool(a.favorite), updatedAt: number(a.updatedAt) }
  }
  const s = object(o.settings ?? { useCache: true, preferredCategory: "全部", showAdultWarning: true }, "设置")
  const category = text(s.preferredCategory, "分类"); if (!categories.includes(category)) throw new Error("设置分类无效")
  const settings: AppSettings = { useCache: bool(s.useCache), preferredCategory: category, showAdultWarning: bool(s.showAdultWarning) }
  const searchHistory = strings(o.searchHistory ?? []).slice(0, 20)
  return { records, history, actresses, settings, searchHistory }
}
