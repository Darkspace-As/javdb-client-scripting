import { Script } from "scripting"
import { fetchActors } from "./services/actors"
async function main() { for (const category of ["推荐", "有码", "无码", "欧美"]) { try { const actors = await fetchActors(category); console.log(JSON.stringify({ category, count: actors.length, realAvatars: actors.every(a => a.avatar.startsWith("https://") && a.sourceURL.startsWith("https://javdb.com/actors/")) })) } catch (e) { console.log(JSON.stringify({ category, error: e instanceof Error ? e.message : String(e) })) } } }
void main().finally(() => Script.exit())
