import { popPage, appendUnique, safeRating, type Page } from "./services/state"
import { validateBackup } from "./services/backup"
import { parseCatalog } from "./services/catalog"
import { Script } from "scripting"
const results: string[] = []
function test(name: string, fn: () => void) { try { fn(); results.push(`PASS ${name}`) } catch (e) { results.push(`FAIL ${name}: ${e instanceof Error ? e.message : e}`) } }
function assert(value: unknown) { if (!value) throw new Error("断言失败") }
const movie = { id: "https://javdb.com/v/test", code: "TEST-001", title: "Synthetic metadata fixture", date: "2026-01-01", rating: "4", count: "1", cover: "", actresses: [], tags: [], maker: "", duration: "", subtitle: false, sourceURL: "https://javdb.com/v/test" }
const record = { movie, favorite: true, want: false, watched: false, note: "fixture", personalRating: 8, updatedAt: 1 }
const fixture = () => ({ version: 2, records: { [movie.id]: { ...record } }, history: [{ ...movie }], actresses: {}, searchHistory: ["TEST"], settings: { useCache: true, preferredCategory: "全部", showAdultWarning: true } })
function rejects(change: (x: ReturnType<typeof fixture>) => void) { const x = fixture(); change(x); let rejected = false; try { validateBackup(JSON.stringify(x)) } catch { rejected = true }; assert(rejected) }
test("搜索→影片→女优逐层弹栈", () => { const pages: Page[] = [{ id: 1, type: "movie", movie }, { id: 2, type: "actress", name: "fixture" }]; const once = popPage(pages); assert(once.length === 1 && once[0].type === "movie"); assert(popPage(once).length === 0); assert(pages.length === 2) })
test("根栈返回安全", () => assert(popPage([]).length === 0))
test("分页跨页和页内去重", () => assert(appendUnique([{ id: "a" }], [{ id: "a" }, { id: "b" }, { id: "b" }]).length === 2))
for (const value of ["0", "10", "8.5", ""]) test(`评分合法 ${value}`, () => assert(safeRating(value) !== null))
for (const value of ["-1", "11", "NaN", "Infinity", "abc"]) test(`评分拒绝 ${value}`, () => assert(safeRating(value) === null))
test("v2完整备份", () => assert(validateBackup(JSON.stringify(fixture())).records[movie.id].personalRating === 8))
test("v1评分缺省兼容", () => { const x: any = fixture(); x.version = 1; delete x.records[movie.id].personalRating; assert(validateBackup(JSON.stringify(x)).records[movie.id].personalRating === 0) })
test("拒绝未知版本", () => rejects(x => x.version = 5))
test("拒绝非法布尔", () => rejects(x => (x.records[movie.id] as any).favorite = "true"))
test("拒绝非法评分", () => rejects(x => x.records[movie.id].personalRating = 99))
test("拒绝不匹配ID", () => rejects(x => x.records[movie.id].movie = { ...movie, id: "different" }))
test("拒绝非法网址", () => rejects(x => x.history[0].sourceURL = "javascript:alert(1)"))
test("拒绝未知分类设置", () => rejects(x => x.settings.preferredCategory = "invalid"))
test("拒绝错误历史结构", () => rejects(x => (x as any).history = {}))
test("登录分类提示不是空结果", () => { let message = ""; try { parseCatalog('<form action="/users/sign_in"><input name="password"></form>', 1) } catch(e) { message = (e as Error).message }; assert(message.includes("登录")) })
test("验证页提示", () => { let message = ""; try { parseCatalog('<html>Just a moment cf-chl-</html>', 1) } catch(e) { message = (e as Error).message }; assert(message.includes("受限")) })
test("真实空列表可解析", () => assert(!parseCatalog('<div class="movie-list"></div>', 1).hasMore))
console.log(results.join("\n"))
Script.exit({ total: results.length, failed: results.filter(s => s.startsWith("FAIL")).length })
