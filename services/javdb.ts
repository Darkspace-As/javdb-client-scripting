import { fetch } from "scripting"

export type Movie = {
  id: string
  code: string
  title: string
  date: string
  rating: string
  count: string
  cover: string
  actresses: string[]
  tags: string[]
  maker: string
  duration: string
  subtitle: boolean
  sourceURL: string
}

const BASE_URL = "https://javdb.com"

function decodeHTML(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim()
}

function stripHTML(input: string): string {
  return decodeHTML(input.replace(/<[^>]*>/g, " "))
}

function attr(html: string, name: string): string {
  const match = html.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))
  return match ? decodeHTML(match[1]) : ""
}

function firstMatch(html: string, pattern: RegExp): string {
  const match = html.match(pattern)
  return match ? stripHTML(match[1]) : ""
}

function parseScore(text: string): { rating: string; count: string } {
  const score = text.match(/([0-9]+(?:\.[0-9]+)?)\s*分[^0-9]*([0-9]+)\s*人/)
  return { rating: score?.[1] ?? "0", count: score?.[2] ?? "0" }
}

export function parseSearchResults(html: string): Movie[] {
  const blocks = html.match(/<a[^>]*class=["'][^"']*box[^"']*["'][\s\S]*?<\/a>/gi) ?? []
  const results: Movie[] = []
  for (const block of blocks) {
    const linkMatch = block.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*box[^"']*["'][^>]*>/i)
    if (!linkMatch) continue
    const sourceURL = new URL(linkMatch[1], BASE_URL).toString()
    const titleHTML = firstMatch(block, /<div[^>]*class=["'][^"']*video-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    const codeMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i)
    const rawTitle = titleHTML || attr(block, "title")
    const code = codeMatch ? decodeHTML(codeMatch[1]).trim() : rawTitle.split(/\s+/)[0]
    const title = rawTitle.replace(new RegExp(`^${code}\\s*`, "i"), "").trim()
    const imageMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i)
    const cover = imageMatch ? new URL(imageMatch[1], BASE_URL).toString() : ""
    const scoreText = firstMatch(block, /<div[^>]*class=["'][^"']*score[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    const { rating, count } = parseScore(scoreText)
    const meta = firstMatch(block, /<div[^>]*class=["'][^"']*meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    const date = meta.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ""
    const tags = Array.from(block.matchAll(/<span[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)).map((m: RegExpMatchArray) => stripHTML(m[1])).filter(Boolean)
    results.push({ id: sourceURL, code, title, date, rating, count, cover, actresses: [], tags, maker: "", duration: "", subtitle: /字幕|中文字幕|cnsub/i.test(block), sourceURL })
  }
  return results
}

function fieldBlock(html: string, label: string): string {
  const blocks = html.match(/<div[^>]*class=["'][^"']*panel-block[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]*class=["'][^"']*panel-block|<\/nav>)/gi) ?? []
  return blocks.find((block) => new RegExp(`<strong>\\s*${label}\\s*<\\/strong>`, "i").test(block)) ?? ""
}

function fieldValue(html: string, label: string): string {
  const block = fieldBlock(html, label)
  const match = block.match(/<span[^>]*class=["'][^"']*value[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)
  return match ? stripHTML(match[1]) : ""
}

function linksFromField(html: string, label: string, className?: string): string[] {
  const block = fieldBlock(html, label)
  const source = className
    ? `<a[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`
    : `<a[^>]*>([\\s\\S]*?)<\\/a>`
  return Array.from(block.matchAll(new RegExp(source, "gi"))).map((m: RegExpMatchArray) => stripHTML(m[1])).filter(Boolean)
}

export async function getMovieDetail(movie: Movie): Promise<Movie> {
  const response = await fetch(movie.sourceURL, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "zh-CN,zh;q=0.9" } })
  if (!response.ok) throw new Error(`详情请求失败：HTTP ${response.status}`)
  const html = await response.text()
  const scoreMatch = html.match(/([0-9]+(?:\.[0-9]+)?)\s*分[^0-9]{0,20}([0-9]+)\s*人/)
  const score = scoreMatch ? { rating: scoreMatch[1], count: scoreMatch[2] } : parseScore(fieldValue(html, "評分:"))
  const coverMatch = html.match(/<img[^>]*class=["'][^"']*video-cover[^"']*["'][^>]*src=["']([^"']+)["']/i)
  const titleMatch = html.match(/<strong[^>]*class=["'][^"']*current-title[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i)
  return {
    ...movie,
    title: titleMatch ? stripHTML(titleMatch[1]) : movie.title,
    date: fieldValue(html, "日期:") || movie.date,
    duration: fieldValue(html, "時長:") || movie.duration,
    maker: linksFromField(html, "片商:")[0] ?? movie.maker,
    actresses: linksFromField(html, "演員:", "actor-female"),
    tags: linksFromField(html, "類別:") || movie.tags,
    cover: coverMatch ? new URL(coverMatch[1], BASE_URL).toString() : movie.cover,
    rating: score.rating !== "0" ? score.rating : movie.rating,
    count: score.count !== "0" ? score.count : movie.count,
    subtitle: /字幕|中文字幕/i.test(html),
  }
}

export async function fetchJavDBPage(path = "/"): Promise<Movie[]> {
  const response = await fetch(`${BASE_URL}${path}`, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" } })
  if (!response.ok) throw new Error(`JavDB 请求失败：HTTP ${response.status}`)
  const html = await response.text()
  if (!/<a[^>]*class=["'][^"']*box/i.test(html)) throw new Error("JavDB 没有返回影片列表，可能需要先完成年龄确认或遇到了访问限制")
  return parseSearchResults(html)
}

export async function searchJavDB(keyword: string): Promise<Movie[]> {
  const query = keyword.trim()
  if (!query) return []
  return fetchJavDBPage(`/search?q=${encodeURIComponent(query)}`)
}
