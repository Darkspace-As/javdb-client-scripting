import { Button, HStack, Image, LazyVGrid, ScrollView, Spacer, Text, TextField, VStack, useEffect, useState } from "scripting"
import { listFavoriteActresses, listHistory, listRecords } from "./services/store"
import { searchJavDB, type Movie } from "./services/javdb"
import { BackIcon } from "./Controls"
import PortraitCover from "./PortraitCover"
import { fetchActors, type Actor } from "./services/actors"
const ACCENT = "#9B3E60"
export default ActressDirectory

export function TopBar({ title, onBack }: { title: string; onBack: () => void }) { return <HStack spacing={16} padding={{ vertical: 12 }}><BackIcon action={onBack} /><Text font="title" bold foregroundStyle="#202020">{title}</Text><Spacer /></HStack> }
export function UnderlineTabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (value: string) => void }) { return <HStack spacing={0} frame={{ maxWidth: "infinity" }}>{tabs.map(item => <Button key={item} buttonStyle="plain" action={() => onChange(item)} frame={{ maxWidth: "infinity" }}><VStack spacing={0} frame={{ minHeight: 52, maxWidth: "infinity" }} background={value === item ? "#F9EAF0" : "#F8F8F8"} contentShape="rect"><Text font="subheadline" bold={value === item} foregroundStyle={value === item ? ACCENT : "#4D464A"} frame={{ height: 48, maxWidth: "infinity" }} lineLimit={1}>{item}</Text><Text frame={{ width: 26, height: 3 }} background={value === item ? ACCENT : "#F8F8F8"}> </Text></VStack></Button>)}</HStack> }
export function EmptyPanel({ title, detail }: { title: string; detail: string }) { return <VStack spacing={14} padding={{ vertical: 58, horizontal: 18 }}><Image systemName="tray" foregroundStyle="#AC778A" font="largeTitle" /><Text font="headline">{title}</Text><Text foregroundStyle="#777777" font="subheadline">{detail}</Text></VStack> }
export function ActressDirectory({ onBack, onActress }: { onBack: () => void; onActress: (name: string) => void }) {
  const [tab, setTab] = useState("推荐")
  const [keyword, setKeyword] = useState("")
  const [actors, setActors] = useState<Actor[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setActors([]); setError(""); setBusy(true)
    fetchActors(tab).then(result => { if (active) setActors(result) }).catch(e => { if (active) setError(e instanceof Error ? e.message : "演员列表请求失败") }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [tab, retry])
  const visible = actors.filter(a => !keyword || a.name.toLowerCase().includes(keyword.toLowerCase()))
  return <ScrollView><VStack alignment="leading" spacing={20} padding={16} background="#F8F8F8"><TopBar title="演员" onBack={onBack} /><UnderlineTabs tabs={["推荐", "有码", "无码", "欧美"]} value={tab} onChange={setTab} /><TextField title="搜索演员" prompt="筛选当前页演员姓名" value={keyword} onChanged={setKeyword} /><Text font="caption" foregroundStyle="#777777">JavDB 公开演员目录 · {tab} · {visible.length} 位</Text>{busy ? <Text>正在加载真实演员资料…</Text> : null}{error ? <VStack alignment="leading" spacing={12}><Text foregroundStyle="#B3261E">{error}</Text><Button title="重新加载" action={() => setRetry(n => n + 1)} /><Button title="浏览器查看演员分类" action={() => Safari.present("https://javdb.com/actors" + ({ "推荐": "", "有码": "/censored", "无码": "/uncensored", "欧美": "/western" } as Record<string, string>)[tab])} /></VStack> : null}<LazyVGrid columns={[{ size: { type: "flexible" } }, { size: { type: "flexible" } }, { size: { type: "flexible" } }]} spacing={18}>{visible.map(actor => <Button key={actor.id} buttonStyle="plain" action={() => onActress(actor.name)}><VStack spacing={8}><Image imageUrl={actor.avatar} resizable aspectRatio={{ value: 0.8, contentMode: "fit" }} clipShape={{ type: "rect", cornerRadius: 10 }} /><Text lineLimit={2} font="subheadline" foregroundStyle="#202020">{actor.name}</Text></VStack></Button>)}</LazyVGrid>{!busy && !error && !visible.length ? <EmptyPanel title="本页没有匹配演员" detail="试试清空筛选姓名。" /> : null}{!busy && !error ? <Button title="刷新演员目录" action={() => setRetry(n => n + 1)} /> : null}<Text font="caption" foregroundStyle="#777777">当前展示公开目录第一页；照片来自网站真实演员卡片，不使用影片封面代替。</Text></VStack></ScrollView>
}
export function ResourceSearch({ onBack, onOpen }: { onBack: () => void; onOpen: (movie: Movie) => void }) {
  const [tab, setTab] = useState("磁力")
  const [keyword, setKeyword] = useState("")
  const [movies, setMovies] = useState<Movie[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const search = async () => {
    if (!keyword.trim()) { setMessage("请输入关键词"); return }
    if (tab !== "影片") { setMessage(`${tab}搜索暂未接入，当前支持“影片”公开元数据搜索。`); return }
    if (busy) return
    setBusy(true); setMessage("")
    try { const result = await searchJavDB(keyword.trim()); setMovies(result); if (!result.length) setMessage("没有匹配的公开影片资料") } catch(e) { setMessage(e instanceof Error ? e.message : "搜索失败") } finally { setBusy(false) }
  }
  return <ScrollView><VStack alignment="leading" spacing={18} padding={16} background="#F8F8F8"><HStack spacing={8}><BackIcon action={onBack} /><TextField title="搜索" prompt="番号、影片、演员" value={keyword} onChanged={setKeyword} /><Button title="搜索" systemImage="magnifyingglass" disabled={busy} action={() => { void search() }} /></HStack><UnderlineTabs tabs={["磁力", "黄果", "影片", "女优", "片商", "导演"]} value={tab} onChange={value => { setTab(value); setMessage(""); setMovies([]) }} />{busy ? <Text>搜索中…</Text> : null}{message ? <Text foregroundStyle="#9B3E60">{message}</Text> : null}{tab === "影片" ? movies.map(m => <Button key={m.id} buttonStyle="plain" action={() => onOpen(m)}><HStack spacing={12}><PortraitCover url={m.cover} width={70} height={98} /><VStack alignment="leading" spacing={6}><Text lineLimit={2}>{m.title}</Text><Text foregroundStyle={ACCENT}>{m.code}</Text></VStack></HStack></Button>) : <EmptyPanel title="输入关键词开始搜索" detail={`${tab}数据源尚未接入；不会展示伪造结果。可切换“影片”搜索公开资料。`} />}</VStack></ScrollView>
}
