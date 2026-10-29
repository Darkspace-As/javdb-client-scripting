import {
  Button,
  HStack,
  Image,
  Label,
  List,
  Navigation,
  NavigationLink,
  NavigationStack,
  ScrollView,
  Section,
  Spacer,
  TabView,
  Text,
  TextField,
  VStack,
  ZStack,
  useState,
} from "scripting"
import { searchJavDB, type Movie } from "./services/javdb"

const ACCENT = "#A54C72"
const SOFT = "#F8E6EE"
const CARD = "#FFF7FA"
const JAVDB_HOME = "https://javdb.com/"
const demoMovies: Movie[] = []


function Pill({ text, active = false }: { text: string; active?: boolean }) {
  return (
    <Text
      font="subheadline"
      foregroundStyle={active ? ACCENT : "#6D6D72"}
      background={active ? SOFT : "#F2F2F5"}
      padding={{ horizontal: 12, vertical: 7 }}
      clipShape={{ type: "rect", cornerRadius: 16 }}
    >
      {text}
    </Text>
  )
}

function MovieCard({ movie, onOpen }: { movie: Movie; onOpen: () => void }) {
  return (
    <Button action={onOpen}>
      <HStack spacing={12} padding={10} background={CARD} clipShape={{ type: "rect", cornerRadius: 18 }}>
        <Image
          imageUrl={movie.cover}
          frame={{ width: 92, height: 122 }}
          clipShape={{ type: "rect", cornerRadius: 12 }}
          placeholder={<ZStack frame={{ width: 92, height: 122 }} background="#E8DDE2"><Text>封面</Text></ZStack>}
        />
        <VStack alignment="leading" spacing={6}>
          <Text font="headline" bold={true} lineLimit={2}>{movie.title}</Text>
          <Text font="subheadline" foregroundStyle={ACCENT}>{movie.code}</Text>
          <Text font="caption" foregroundStyle="#777">{movie.date} · {movie.duration}</Text>
          <HStack spacing={6}>
            <Text font="caption" foregroundStyle="#D07A24">★ {movie.rating}</Text>
            <Text font="caption" foregroundStyle="#777">{movie.count} 人评分</Text>
          </HStack>
          <HStack spacing={6}>
            {movie.subtitle ? <Pill text="字幕" active={true} /> : null}
            <Pill text="收藏" />
          </HStack>
        </VStack>
        <Spacer />
      </HStack>
    </Button>
  )
}

function MovieDetail({ movie }: { movie: Movie }) {
  const [saved, setSaved] = useState(false)
  const [watched, setWatched] = useState(false)
  const [note, setNote] = useState("")

  return (
    <ScrollView>
      <VStack alignment="leading" spacing={16} padding={16}>
        <HStack spacing={14}>
          <Image imageUrl={movie.cover} frame={{ width: 128, height: 172 }} clipShape={{ type: "rect", cornerRadius: 16 }} />
          <VStack alignment="leading" spacing={8}>
            <Text font="title2" bold={true}>{movie.code}</Text>
            <Text font="headline">{movie.title}</Text>
            <Text foregroundStyle="#D07A24" font="title3">★ {movie.rating}</Text>
            <Text font="caption" foregroundStyle="#777">评分人数：{movie.count}</Text>
          </VStack>
        </HStack>

        <HStack spacing={8}>
          <Button title={saved ? "已收藏" : "收藏"} systemImage={saved ? "heart.fill" : "heart"} action={() => setSaved(!saved)} />
          <Button title={watched ? "已看过" : "标记看过"} systemImage="checkmark.circle" action={() => setWatched(!watched)} />
        </HStack>

        <Section title="影片信息">
          <Text>发行日期：{movie.date}</Text>
          <Text>片长：{movie.duration}</Text>
          <Text>制作商：{movie.maker}</Text>
          <Text>字幕：{movie.subtitle ? "有" : "无"}</Text>
        </Section>

        <Section title="女优">
          {movie.actresses.map((name) => (
            <NavigationLink key={name} destination={<ActressView name={name} />}>
              <Label title={name} systemImage="person.crop.circle" />
            </NavigationLink>
          ))}
        </Section>

        <Section title="标签">
          <HStack spacing={8}>{movie.tags.map((tag) => <Pill key={tag} text={tag} active={true} />)}</HStack>
        </Section>

        <Section title="个人备注">
          <TextField title="备注" prompt="记录你的想法、评分或整理信息" value={note} onChanged={setNote} />
        </Section>

        <Section title="更多操作">
          <Button title="打开 JavDB 原页面" systemImage="safari" action={() => Safari.present(`${JAVDB_HOME}search?q=${encodeURIComponent(movie.code)}`)} />
          <Button title="复制番号" systemImage="doc.on.doc" action={() => Pasteboard.setString(movie.code)} />
          <Button title="分享影片信息" systemImage="square.and.arrow.up" action={() => ShareSheet.present([`${movie.code} ${movie.title}`])} />
        </Section>
      </VStack>
    </ScrollView>
  )
}

function ActressView({ name }: { name: string }) {
  const [favorite, setFavorite] = useState(false)
  return (
    <ScrollView>
      <VStack alignment="leading" spacing={16} padding={16}>
        <HStack spacing={14}>
          <ZStack frame={{ width: 90, height: 110 }} background="#E9DDE3" clipShape={{ type: "rect", cornerRadius: 16 }}>
            <Image systemName="person.crop.circle.fill" frame={{ width: 58, height: 58 }} foregroundStyle="#9D7B89" />
          </ZStack>
          <VStack alignment="leading" spacing={8}>
            <Text font="title2" bold={true}>{name}</Text>
            <Text foregroundStyle="#777">女优资料与作品关联</Text>
            <Button title={favorite ? "已关注" : "关注女优"} systemImage={favorite ? "star.fill" : "star"} action={() => setFavorite(!favorite)} />
          </VStack>
        </HStack>
        <Section title="相关作品">
          {demoMovies.filter((m) => m.actresses.includes(name) || name === "加藤椿").map((movie) => (
            <MovieCard key={movie.id} movie={movie} onOpen={() => {}} />
          ))}
        </Section>
      </VStack>
    </ScrollView>
  )
}

function HomeView({ onOpen }: { onOpen: (movie: Movie) => void }) {
  const [category, setCategory] = useState("有码")
  return (
    <ScrollView>
      <VStack alignment="leading" spacing={16} padding={16}>
        <HStack>
          <Text font="largeTitle" bold={true}>JavDB</Text>
          <Spacer />
          <Button title="" systemImage="person.crop.circle" action={() => {}} />
          <Button title="" systemImage="gearshape" action={() => {}} />
        </HStack>
        <Text font="subheadline" foregroundStyle="#777">公开影片资料 · 本地收藏管理</Text>
        <HStack spacing={8}>
          <NavigationLink destination={<SearchView onOpen={onOpen} />}><Pill text="搜索" active={true} /></NavigationLink>
          <Pill text="女优" />
          <Pill text="收藏" />
          <Pill text="历史" />
        </HStack>
        <Text font="title2" bold={true}>近期更新</Text>
        <HStack spacing={8}>
          {['有码', '无码', '欧美', '动漫', 'FC2'].map((item) => (
            <Button key={item} action={() => setCategory(item)}><Pill text={item} active={category === item} /></Button>
          ))}
        </HStack>
        <Text font="title3" bold={true}>推荐与关注</Text>
        {demoMovies.map((movie) => <MovieCard key={movie.id} movie={movie} onOpen={() => onOpen(movie)} />)}
      </VStack>
    </ScrollView>
  )
}

function SearchView({ onOpen }: { onOpen: (movie: Movie) => void }) {
  const [keyword, setKeyword] = useState("")
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [results, setResults] = useState<Movie[]>([])

  const performSearch = async () => {
    const query = keyword.trim()
    if (!query || loading) return
    setLoading(true)
    setSearched(true)
    setError("")
    try {
      const data = await searchJavDB(query)
      setResults(data)
    } catch (e) {
      setResults([])
      setError(e instanceof Error ? e.message : "搜索失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView>
      <VStack alignment="leading" spacing={14} padding={16}>
        <TextField title="搜索" prompt="输入番号、影片、女优" value={keyword} onChanged={setKeyword} />
        <Button title={loading ? "搜索中…" : "开始搜索"} systemImage="magnifyingglass" action={performSearch} />
        <HStack spacing={8}>
          <Pill text="影片" active={true} /><Pill text="女优" /><Pill text="片商" /><Pill text="导演" /><Pill text="标签" />
        </HStack>
        {!searched ? <Text foregroundStyle="#777" padding={{ vertical: 40 }}>输入番号或关键词开始搜索</Text> : null}
        {error ? <Text foregroundStyle="#B3261E" padding={{ vertical: 20 }}>{error}</Text> : null}
        {searched && !loading && !error && results.length === 0 ? <Text foregroundStyle="#777" padding={{ vertical: 40 }}>没有找到匹配的公开资料</Text> : null}
        {results.map((movie) => <MovieCard key={movie.id} movie={movie} onOpen={() => onOpen(movie)} />)}
      </VStack>
    </ScrollView>
  )
}

function LibraryView({ onOpen }: { onOpen: (movie: Movie) => void }) {
  const [filter, setFilter] = useState("收藏")
  return (
    <ScrollView>
      <VStack alignment="leading" spacing={14} padding={16}>
        <Text font="largeTitle" bold={true}>我的收藏</Text>
        <HStack spacing={8}>
          {['收藏', '想看', '看过', '女优'].map((item) => <Button key={item} action={() => setFilter(item)}><Pill text={item} active={filter === item} /></Button>)}
        </HStack>
        <Text foregroundStyle="#777">支持备注、标签、个人评分、批量整理与 JSON 导出</Text>
        {filter === "女优" ? <ActressView name="我的女优" /> : demoMovies.map((movie) => <MovieCard key={movie.id} movie={movie} onOpen={() => onOpen(movie)} />)}
      </VStack>
    </ScrollView>
  )
}

function MoreView() {
  return (
    <List>
      <Section title="数据管理">
        <Button title="导入 JSON" systemImage="square.and.arrow.down" action={() => {}} />
        <Button title="导出 JSON" systemImage="square.and.arrow.up" action={() => {}} />
        <Button title="清除图片缓存" systemImage="trash" action={() => {}} />
      </Section>
      <Section title="隐私">
        <Text>本版本不保存 JavDB 密码，也不做自动登录同步。</Text>
        <Text>个人收藏与备注仅保存在本脚本的本地存储中。</Text>
      </Section>
      <Section title="关于">
        <Text>JavDB Client 0.1.0 · 原型版</Text>
        <Text>仅展示公开元数据，请遵守当地法律、版权与网站服务条款。</Text>
      </Section>
    </List>
  )
}

export default function App() {
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const openMovie = (movie: Movie) => setSelectedMovie(movie)
  if (selectedMovie) {
    return <NavigationStack navigationTitle={selectedMovie.code} navigationBarTitleDisplayMode="inline"><MovieDetail movie={selectedMovie} /></NavigationStack>
  }
  return (
    <NavigationStack>
      <TabView>
        <VStack tabItem={<Label title="首页" systemImage="house.fill" />}><HomeView onOpen={openMovie} /></VStack>
        <VStack tabItem={<Label title="搜索" systemImage="magnifyingglass" />}><SearchView onOpen={openMovie} /></VStack>
        <VStack tabItem={<Label title="收藏" systemImage="heart.fill" />}><LibraryView onOpen={openMovie} /></VStack>
        <VStack tabItem={<Label title="我的" systemImage="person.fill" />}><MoreView /></VStack>
      </TabView>
    </NavigationStack>
  )
}

Navigation.present(<App />)
