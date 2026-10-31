import { Script } from "scripting"
import { fetchCatalog, CATEGORIES } from "./services/catalog"
async function main() {
 const results: object[] = []
 for (const category of CATEGORIES) {
  try { const data = await fetchCatalog(category, 1); results.push({ category, count: data.movies.length, hasMore: data.hasMore }) }
  catch(e) { results.push({ category, error: e instanceof Error ? e.message : "unknown" }) }
 }
 Script.exit(results)
}
main()
