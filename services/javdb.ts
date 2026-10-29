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
  const blocks = html.match(/<div[^>]*class=["'][^"']*item[^"']*["'][\s\S]*?<\/div>\s*<\/div>/gi) ?? []
  const results: Movie[] = []

  for (const block of blocks) {
    const linkMatch = block.match(/<a[^>]*class=["']box["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    if (!linkMatch) continue

    const sourceURL = new URL(linkMatch[1], BASE_URL).toString()
    const titleHTML = firstMatch(block, /<div[^>]*class=["'][^"']*video-title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    const codeMatch = block.match(/<strong[^>]*>([^<]+)<\/strong>/i)
    const title = titleHTML || attr(block, "title")
    const code = codeMatch ? decodeHTML(codeMatch[1]).trim() : title.split(/\s+/)[0]
    const imageMatch = block.match(/<img[^>]*src=["']([^"']+)["']/i)
    const cover = imageMatch ? new URL(imageMatch[1], BASE_URL).toString() : ""
    const scoreText = firstMatch(block, /<div[^>]*class=["'][^"']*score[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    const { rating, count } = parseScore(scoreText)
    const meta = firstMatch(block, /<div[^>]*class=["'][^"']*meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
    const date = meta.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? ""
    const subtitle = /字幕|中文字幕|cnsub/i.test(block)
    const tags = Array.from(block.matchAll(/<span[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)).map((m: RegExpMatchArray) => stripHTML(m[1])).filter(Boolean)

    results.push({
      id: sourceURL,
      code,
      title,
      date,
      rating,
      count,
      cover,
      actresses: [],
      tags,
      maker: "",
      duration: "",
      subtitle,
      sourceURL,
    })
  }

  return results
}

export async function searchJavDB(keyword: string): Promise<Movie[]> {
  const query = keyword.trim()
  if (!query) return []

  const url = `${BASE_URL}/search?q=${encodeURIComponent(query)}`
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  })
  if (!response.ok) throw new Error(`JavDB 请求失败：HTTP ${response.status}`)

  const html = await response.text()
  if (/over18|我已滿18歲|我已满18岁/i.test(html) && !/<div[^>]*class=["'][^"']*item/i.test(html)) {
    throw new Error("JavDB 需要先完成年龄确认，请先在浏览器打开 JavDB 并确认年龄")
  }

  return parseSearchResults(html)
}
