import { Button, HStack, Image, LazyVGrid, ScrollView, Spacer, Text, TextField, VStack, useState } from "scripting"
import { listFavoriteActresses, listHistory, listRecords } from "./services/store"
import { searchJavDB, type Movie } from "./services/javdb"
const ACCENT = "#9B3E60"
export function TopBar({ title, onBack }: { title: string; onBack: () => void }) { return <HStack spacing={16} padding={{ vertical: 12 }}><Button title="返回" systemImage="arrow.left" buttonStyle="plain" foregroundStyle="#202020" action={onBack} /><Text font="title" bold foregroundStyle="#202020">{title}</Text><Spacer /></HStack> }
export function UnderlineTabs({ tabs, value, onChange }: { tabs: string[]; value: string; onChange: (value: string) => void }) { return <ScrollView axes="horizontal"><HStack spacing={16}>{tabs.map(item => <Button key={item} buttonStyle="plain" action={() => onChange(item)}><VStack spacing={12}><Text font="subheadline" bold={value === item} foregroundStyle={value === item ? ACCENT : "#777777"} frame={{ minWidth: 48, height: 36 }} lineLimit={1}>{item}</Text><Text frame={{ width: 26, height: 3 }} background={value === item ? ACCENT : "#F8F8F8"} clipShape={{ type: "rect", cornerRadius: 2 }}> </Text></VStack></Button>)}</HStack></ScrollView> }
export function EmptyPanel({ title, detail }: { title: string; detail: string }) { return <VStack spacing={14} padding={{ vertical: 58, horizontal: 18 }}><Image systemName="tray" foregroundStyle="#AC778A" font="largeTitle" /><Text font="headline">{title}</Text><Text foregroundStyle="#777777" font="subheadline">{detail}</Text></VStack> }
export function ActressDirectory({ onBack, onActress }: { onBack: () => void; onActress: (name: string) => void }) {
  const [tab, setTab] = useState("推荐")
  const [keyword, setKeyword] = useState("")
  const known = [...new Set([...listFavoriteActresses().map(a => a.name), ...listRecords().flatMap(r => r.movie.actresses), ...listHistory().flatMap(m => m.actresses)])]
  const names = known.filter(n => !keyword || n.toLowerCase().includes(keyword.toLowerCase()))
  const favorites = listFavoriteActresses().map(a => a.name).filter(n => !keyword || n.toLowerCase().includes(keyword.toLowerCase()))
  const grid = (items: string[]) => <LazyVGrid columns={[{ size: { type: "flexible" } }, { size: { type: "flexible" } }, { size: { type: "flexible" } }]} spacing={18}>{items.map(name => <Button key={name} buttonStyle="plain" action={() => onActress(name)}><VStack spacing={8}><VStack frame={{ height: 94, maxWidth: "infinity" }} background="#EDE6E9" clipShape={{ type: "rect", cornerRadius: 10 }}><Image systemName="person.crop.square" foregroundStyle="#A07E8B" font="largeTitle" /></VStack><Text lineLimit={1} font="subheadline" foregroundStyle="#202020">{name}</Text></VStack></Button>)}</LazyVGrid>
  return <ScrollView><VStack alignment="leading" spacing={20} padding={16} background="#F8F8F8"><TopBar title="演员" onBack={onBack} /><UnderlineTabs tabs={["推荐", "有码", "无码", "欧美"]} value={tab} onChange={setTab} /><TextField title="搜索已知演员" prompt="筛选本地演员姓名" value={keyword} onChanged={setKeyword} />{tab === "推荐" ? <VStack alignment="leading" spacing={20}><Text font="title2" bold>我的关注</Text>{favorites.length ? grid(favorites) : <EmptyPanel title="尚未关注演员" detail="进入影片详情可关注演员，不需要登录。" />}<Text font="title2" bold>本地已知演员</Text>{names.length ? grid(names) : <EmptyPanel title="还没有演员资料" detail="打开影片详情后可积累真实演员关联资料。" />}<Text font="caption" foregroundStyle="#777777">截图中的新人榜、月榜、Fanza推荐和演员照片目前未接入可靠来源，因此不使用假榜单或影片封面冒充头像。</Text></VStack> : <EmptyPanel title={`${tab}演员目录尚未接入`} detail="当前仅提供本地真实演员列表；分类演员名单与照片未取得可验证数据。切换推荐可查看已知演员。" />}</VStack></ScrollView>
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
  return <ScrollView><VStack alignment="leading" spacing={18} padding={16} background="#F8F8F8"><HStack spacing={8}><Button title="返回" systemImage="arrow.left" action={onBack} /><TextField title="搜索" prompt="番号、影片、演员" value={keyword} onChanged={setKeyword} /><Button title="搜索" systemImage="magnifyingglass" disabled={busy} action={() => { void search() }} /></HStack><UnderlineTabs tabs={["磁力", "黄果", "影片", "女优", "片商", "导演"]} value={tab} onChange={value => { setTab(value); setMessage(""); setMovies([]) }} />{busy ? <Text>搜索中…</Text> : null}{message ? <Text foregroundStyle="#9B3E60">{message}</Text> : null}{tab === "影片" ? movies.map(m => <Button key={m.id} buttonStyle="plain" action={() => onOpen(m)}><HStack spacing={12}><Image imageUrl={m.cover} frame={{ width: 70, height: 98 }} /><VStack alignment="leading" spacing={6}><Text lineLimit={2}>{m.title}</Text><Text foregroundStyle={ACCENT}>{m.code}</Text></VStack></HStack></Button>) : <EmptyPanel title="输入关键词开始搜索" detail={`${tab}数据源尚未接入；不会展示伪造结果。可切换“影片”搜索公开资料。`} />}</VStack></ScrollView>
}
