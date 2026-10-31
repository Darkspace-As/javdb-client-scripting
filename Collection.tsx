import { Button, HStack, Image, ScrollView, Spacer, Text, VStack, useState } from "scripting"
import { listRecords, listFavoriteActresses } from "./services/store"
import type { Movie } from "./services/javdb"
import { EmptyPanel, TopBar, UnderlineTabs } from "./Explore"
export default function Collection({ onBack, onMovie, onActress, onManage, revision = 0 }: { onBack: () => void; onMovie: (movie: Movie) => void; onActress: (name: string) => void; onManage: () => void; revision?: number }) {
 const [tab, setTab] = useState("影片")
 const [maker, setMaker] = useState("")
 const records = listRecords(tab === "看过" ? "watched" : tab === "想看" ? "want" : "favorite")
 const actresses = listFavoriteActresses()
 const makers = [...new Set(listRecords().map(r => r.movie.maker).filter(Boolean))]
 const movies = tab === "片商" && maker ? listRecords().filter(r => r.movie.maker === maker) : records
 return <ScrollView><VStack alignment="leading" spacing={20} padding={16} background="#F8F8F8"><TopBar title="收藏" onBack={onBack} /><UnderlineTabs tabs={["看过", "想看", "影片", "演员", "系列", "片商"]} value={tab} onChange={value => { setTab(value); setMaker("") }} /><HStack><Text font="caption" foregroundStyle="#888888">本地收藏 · 无需登录</Text><Spacer /><Button title="批量管理" action={onManage} /></HStack>{tab === "演员" ? actresses.length ? actresses.map(a => <Button key={a.name} title={a.name} systemImage="person.crop.circle" action={() => onActress(a.name)} />) : <EmptyPanel title="还没有关注的演员" detail="打开影片详情，点击演员后关注即可。" /> : tab === "系列" ? <EmptyPanel title="系列收藏尚未接入" detail="当前数据模型未保存系列资料，已有影片收藏不会受影响。" /> : tab === "片商" && !maker ? makers.length ? makers.map(name => <Button key={name} title={name} action={() => setMaker(name)} />) : <EmptyPanel title="暂无片商资料" detail="保存含片商详情的影片后，可在此按片商查看。" /> : movies.length ? movies.map(r => <Button key={r.movie.id} buttonStyle="plain" action={() => onMovie(r.movie)}><HStack spacing={12}><Image imageUrl={r.movie.cover} frame={{ width: 74, height: 100 }} clipShape={{ type: "rect", cornerRadius: 10 }} /><VStack alignment="leading" spacing={6}><Text lineLimit={2} foregroundStyle="#202020">{r.movie.title}</Text><Text foregroundStyle="#9B3E60">{r.movie.code}</Text><Text font="caption" foregroundStyle="#888888">{r.movie.date}</Text></VStack></HStack></Button>) : <EmptyPanel title={`暂无${tab}记录`} detail="收藏、想看和看过标记保存在本设备，不需要登录。" />}</VStack></ScrollView>
}
