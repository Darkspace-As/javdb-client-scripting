import { Button, HStack, Image, LazyVGrid, ScrollView, Spacer, Text, VStack, useEffect, useRef, useState } from "scripting"
import { CATEGORIES, fetchCatalog, type CatalogPage } from "./services/catalog"
import { getSettings, saveSettings } from "./services/store"
import { appendUnique } from "./services/state"
import { TopBar, UnderlineTabs } from "./Explore"
import type { Movie } from "./services/javdb"
const ACCENT = "#A44D72"
const cacheKey = (category: string) => `javdb.client.catalog.v2.${category}`
type Snapshot = CatalogPage & { savedAt: number }
export function clearCatalogCache(): void { CATEGORIES.forEach(c => Storage.set(cacheKey(c), null)); Storage.set("javdb.client.cacheEpoch.v2", Date.now()) }
export default function HomeView({ onOpen, onSearch, onHistory, onSettings, onAll, onActresses, onResources, onLibrary, onBack, initialCategory, revision = 0, active = true }: { onOpen: (movie: Movie) => void; onSearch: () => void; onHistory: () => void; onSettings: () => void; onAll?: (category: string) => void; onActresses?: () => void; onResources?: () => void; onLibrary?: () => void; onBack?: () => void; initialCategory?: string; revision?: number; active?: boolean }) {
  const [category, setCategory] = useState(initialCategory || (getSettings().preferredCategory === "全部" ? "有码" : getSettings().preferredCategory))
  const [data, setData] = useState<Snapshot>({ movies: [], page: 0, hasMore: true, savedAt: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [cacheNotice, setCacheNotice] = useState("")
  const lastAppend = useRef(false)
  const serial = useRef(0)
  const lock = useRef(false)
  const ready = useRef("")
  const dataRef = useRef(data); dataRef.current = data
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false; serial.current++ }, [])
  const load = async (append: boolean) => {
    if (lock.current) return
    if (append && !dataRef.current.hasMore) return
    lock.current = true
    lastAppend.current = append
    const ticket = ++serial.current
    setBusy(true); setError("")
    const page = append ? dataRef.current.page + 1 : 1
    try {
      const next = await fetchCatalog(category, page)
      if (!alive.current || ticket !== serial.current) return
      const movies = append ? appendUnique(dataRef.current.movies, next.movies) : next.movies
      const added = movies.length - dataRef.current.movies.length
      const result = { ...next, movies, hasMore: next.hasMore && (!append || added > 0), savedAt: Date.now() }
      setData(result); dataRef.current = result; setCacheNotice("")
      if (getSettings().useCache) Storage.set(cacheKey(category), result)
    } catch (e) { if (alive.current && ticket === serial.current) setError(e instanceof Error ? e.message : "网络失败，请稍后重试。") }
    finally { if (alive.current && ticket === serial.current) { lock.current = false; setBusy(false) } }
  }
  useEffect(() => {
    if (!active) return
    const signature = `${category}:${getSettings().useCache}:${Storage.get<number>("javdb.client.cacheEpoch.v2") ?? 0}`
    if (ready.current === signature) return
    ready.current = signature
    serial.current++; lock.current = false
    const cached = getSettings().useCache ? Storage.get<Snapshot>(cacheKey(category)) : null
    if (cached && Array.isArray(cached.movies)) { setData(cached); dataRef.current = cached; setCacheNotice(`缓存更新于 ${new Date(cached.savedAt).toLocaleString()}`); setError(""); setBusy(false) }
    else { const empty = { movies: [], page: 0, hasMore: true, savedAt: 0 }; setData(empty); dataRef.current = empty; setCacheNotice(""); void load(false) }
  }, [category, active, revision])
  return <ScrollView refreshable={async () => { await load(false) }}><VStack alignment="leading" spacing={16} padding={16}>
    {onBack ? <TopBar title="全部" onBack={onBack} /> : <VStack alignment="leading" spacing={22}><HStack><Text font="largeTitle" bold>JavDB</Text><Spacer /><Button title="搜索" systemImage="magnifyingglass" action={onSearch} /><Button title="设置" systemImage="gearshape" action={onSettings} /></HStack><HStack spacing={22}><Button title="足迹" buttonStyle="plain" foregroundStyle="#777777" action={onHistory} /><VStack spacing={10}><Text bold foregroundStyle={ACCENT}>推荐</Text><Text frame={{ width: 26, height: 3 }} background={ACCENT}> </Text></VStack></HStack><HStack spacing={10}>{[{ title: "全部", icon: "rectangle.stack", action: () => onAll?.("有码") }, { title: "女优", icon: "person.crop.circle", action: () => onActresses?.() }, { title: "磁力", icon: "magnifyingglass", action: () => onResources?.() }, { title: "收藏", icon: "heart", action: () => onLibrary?.() }].map(item => <Button key={item.title} buttonStyle="plain" action={item.action}><VStack spacing={6} padding={{ vertical: 12 }} frame={{ maxWidth: "infinity", minHeight: 68 }} background="#EFEFF1" clipShape={{ type: "rect", cornerRadius: 14 }}><Image systemName={item.icon} font="title2" foregroundStyle="#242424" /><Text font="caption" foregroundStyle="#777777">{item.title}</Text></VStack></Button>)}</HStack></VStack>}
    <HStack><Text font="title2" bold>{onBack ? "探索更多" : "近期更新"}</Text><Spacer />{onBack ? <Button title="刷新" systemImage="arrow.clockwise" disabled={busy} action={() => { void load(false) }} /> : <Button buttonStyle="plain" action={() => onAll?.(category)}><HStack spacing={4}><Text foregroundStyle="#888888">全部</Text><Image systemName="chevron.right" foregroundStyle="#888888" /></HStack></Button>}</HStack>
    {onBack ? <UnderlineTabs tabs={CATEGORIES.filter(c => c !== "全部")} value={category} onChange={value => { serial.current++; lock.current = false; setCategory(value) }} /> : <ScrollView axes="horizontal"><HStack spacing={8}>{CATEGORIES.filter(c => c !== "全部").map(c => <Button key={c} buttonStyle="plain" action={() => { if (c !== category) { serial.current++; lock.current = false; setCategory(c); saveSettings({ preferredCategory: c }) } }}><Text lineLimit={1} font="subheadline" bold={c === category} frame={{ width: 54, height: 44 }} foregroundStyle={c === category ? ACCENT : "#777777"} background={c === category ? "#F8DCE7" : "#FFFFFF"} clipShape={{ type: "rect", cornerRadius: 10 }} contentShape="rect">{c}</Text></Button>)}</HStack></ScrollView>}
    {cacheNotice ? <Text font="caption" foregroundStyle="#777777">{cacheNotice}</Text> : null}
    {busy ? <Text foregroundStyle="#777777">{data.page ? "正在更新影片…" : "正在加载分类…"}</Text> : null}
    {error ? <VStack alignment="leading" spacing={8}><Text foregroundStyle="#B3261E">{error}</Text><Button title="重试此页" disabled={busy} action={() => { void load(lastAppend.current) }} /><Button title="浏览器查看分类" action={() => Safari.present(`https://javdb.com${({ "全部": "/", "有码": "/censored", "无码": "/uncensored", "欧美": "/western", "动漫": "/anime", "FC2": "/fc2" } as Record<string, string>)[category] || "/"}`)} /></VStack> : null}
    <LazyVGrid columns={[{ size: { type: "flexible" } }, { size: { type: "flexible" } }, { size: { type: "flexible" } }]} spacing={14}>
      {data.movies.map(movie => <Button key={movie.id} buttonStyle="plain" action={() => onOpen(movie)}><VStack alignment="leading" spacing={5}><Image imageUrl={movie.cover} resizable aspectRatio={{ value: 0.7, contentMode: "fit" }} clipShape={{ type: "rect", cornerRadius: 10 }} /><Text font="subheadline" lineLimit={1} foregroundStyle="#211B20">{movie.title}</Text><Text font="caption" lineLimit={1} foregroundStyle={ACCENT}>{movie.code}</Text><Text font="caption" foregroundStyle="#777777">{movie.date}</Text></VStack></Button>)}
    </LazyVGrid>
    {!busy && !error && !data.movies.length ? <Text>当前分类暂无公开数据。</Text> : null}
    {data.page > 0 ? <Button title={data.hasMore ? "加载下一页" : "已经到底了"} disabled={busy || !data.hasMore} action={() => { void load(true) }} /> : null}
  </VStack></ScrollView>
}
