import { fetch } from "scripting"
import { parseSearchResults, type Movie } from "./javdb"
export const CATEGORIES = ["全部", "有码", "无码", "欧美", "动漫", "FC2"]
const paths: Record<string, string> = { "全部": "/", "有码": "/censored", "无码": "/uncensored", "欧美": "/western", "动漫": "/anime", "FC2": "/fc2" }
export type CatalogPage = { movies: Movie[]; page: number; hasMore: boolean }
export async function fetchCatalog(category: string, page: number): Promise<CatalogPage> {
  if (!paths[category] || !Number.isInteger(page) || page < 1) throw new Error("分类或页码无效")
  const response = await fetch(`https://javdb.com${paths[category]}?page=${page}`, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "zh-CN,zh;q=0.9" } })
  if (response.status === 403 || response.status === 429) throw new Error("访问受限：网站拒绝或限制请求，请稍后重试。")
  if (!response.ok) throw new Error(`网站请求失败：HTTP ${response.status}`)
  const html = await response.text()
  return parseCatalog(html, page)
}
export function parseCatalog(html: string, page: number): CatalogPage {
  const movies = parseSearchResults(html)
  if (!movies.length) {
    if (/sign_in|users\/sign_in|login-form|登入|登錄|登录/.test(html) && /password|密碼|密码/.test(html)) throw new Error("此分类需要网站登录，当前匿名客户端无法读取。可在浏览器查看，不会自动登录。")
    if (/cf-chl-|Just a moment|captcha|challenge-platform/i.test(html)) throw new Error("访问受限：请在浏览器完成网站验证。")
    if (/age-verification|over.?18|成年確認|年龄确认/i.test(html)) throw new Error("网站需要年龄确认，请先在浏览器查看。")
    if (!/movie-list|沒有影片|没有影片|No results|沒有結果/i.test(html)) throw new Error("未识别影片列表，网站结构可能变化。")
  }
  const next = new RegExp(`(?:page=|page%3D)${page + 1}(?:[&"'#<\\s]|&amp;)`)
  return { movies, page, hasMore: movies.length > 0 && next.test(html) }
}
