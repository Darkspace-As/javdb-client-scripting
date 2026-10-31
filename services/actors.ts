import { fetch } from "scripting"

export type Actor = { id: string; name: string; avatar: string; sourceURL: string }

// Verified from public homepage navigation on 2026-10-31; no login or storage access.
const knownActors = new Map<string, Actor>()
export function findKnownActor(name: string): Actor | undefined { return knownActors.get(name) }
const BASE = "https://javdb.com"
const PATHS: Record<string, string> = {
  "推荐": "/actors",
  "有码": "/actors/censored",
  "无码": "/actors/uncensored",
  "欧美": "/actors/western",
}

function decode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (raw, entity: string) => {
    if (entity[0] === "#") {
      const n = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1))
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : raw
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[entity.toLowerCase()] ?? raw
  }).trim()
}

function attr(tag: string, key: string): string {
  const re = /([^\s=<>/]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g
  for (const m of tag.matchAll(re)) {
    if (m[1].toLowerCase() === key) return decode(m[2] ?? m[3] ?? m[4] ?? "")
  }
  return ""
}

function httpURL(raw: string, base: string): URL | undefined {
  if (!raw) return undefined
  try {
    const url = new URL(raw, base)
    if ((url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password) return url
  } catch { /* Invalid source URL is never replaced with a guessed URL. */ }
  return undefined
}

async function readPublicPage(url: string): Promise<string> {
  try {
    const response = await fetch(url, { headers: { "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8" } })
    if (!response.ok) throw new Error(`HTTP ${response.status}；公开访问失败或受限`)
    const html = await response.text()
    if (/<input\b[^>]*type\s*=\s*["']password["']/i.test(html)) {
      throw new Error("返回登录页面；演员列表无法公开访问，不尝试登录")
    }
    if (!/<img\b[^>]*class\s*=\s*["'][^"']*\bavatar\b/i.test(html) && /cf-chl-|challenge-platform|<title[^>]*>\s*(?:Just a moment|Attention Required)|captcha/i.test(html)) {
      throw new Error("返回访问验证页面；不绕过验证码或访问限制")
    }
    return html
  } catch (error) {
    throw new Error(`JavDB 演员列表请求失败（${url}）：${error instanceof Error ? error.message : String(error)}`)
  }
}

export function parseActors(html: string, pageURL: string): Actor[] {
  const actors: Actor[] = []
  const seen = new Set<string>()
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)) {
    const source = httpURL(attr(m[1], "href"), pageURL)
    if (!source || source.origin !== BASE) continue
    const id = source.pathname.match(/^\/actors\/([A-Za-z0-9]+)$/)?.[1]
    if (!id || ["censored", "uncensored", "western"].includes(id)) continue
    const image = Array.from(m[2].matchAll(/<img\b[^>]*>/gi)).find(img => attr(img[0], "class").split(/\s+/).includes("avatar"))
    if (!image) continue
    const avatar = httpURL(attr(image[0], "src"), pageURL)
    const strong = m[2].match(/<strong\b[^>]*>([\s\S]*?)<\/strong\s*>/i)?.[1]
    const name = decode((strong ?? attr(m[1], "title")).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim()
    if (!name || !avatar) throw new Error(`JavDB 演员卡片缺少姓名或真实头像：${source.href}`)
    if (!seen.has(id)) {
      const actor = { id, name, avatar: avatar.href, sourceURL: source.href }
      actors.push(actor)
      knownActors.set(name, actor)
      seen.add(id)
    }
  }
  if (!actors.length) throw new Error(`JavDB 未返回可解析的公开演员列表（${pageURL}）；可能需要登录、年龄确认、访问受限或页面结构已变更；不提供虚构数据`)
  return actors
}

/** Public HTML only. Pagination follows actual links; recommendation has no public page 2. */
export async function fetchActors(category: string, page = 1): Promise<Actor[]> {
  if (!Object.prototype.hasOwnProperty.call(PATHS, category)) throw new Error(`不支持的演员分类：${category}；可选：推荐/有码/无码/欧美`)
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("演员列表 page 必须为正安全整数")
  if (category === "推荐" && page !== 1) throw new Error("JavDB 推荐演员页没有公开分页入口，仅支持 page=1")
  const path = PATHS[category]
  let url = BASE + path
  let current = 1
  while (true) {
    const html = await readPublicPage(url)
    const actors = parseActors(html, url)
    if (current === page) return actors
    // Follow only links actually present on this public page, never invent page URLs.
    let next: URL | undefined
    let nextPage = current
    for (const m of html.matchAll(/<a\b([^>]*)>/gi)) {
      const candidate = httpURL(attr(m[1], "href"), url)
      if (!candidate || candidate.origin !== BASE || candidate.pathname !== path) continue
      const n = Number(candidate.searchParams.get("page"))
      if (Number.isSafeInteger(n) && n > current && n <= page && n > nextPage) {
        next = candidate
        nextPage = n
      }
    }
    if (!next) throw new Error(`JavDB 分类「${category}」第 ${current} 页未提供通往第 ${page} 页的公开分页链接；可能已到末页或访问受限`)
    url = next.href
    current = nextPage
  }
}
