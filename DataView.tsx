import { Button, List, Section, Text, useState } from "scripting"
import { exportLocalData, importLocalData, previewImport } from "./services/store"
export default function MoreView({ onDataChanged, onSettings }: { onDataChanged: () => void; onSettings: () => void }) {
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState<{ json: string; summary: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [replace, setReplace] = useState(false)
  const pick = async () => { setBusy(true); setMessage(""); setPending(null); try {
    const paths = await DocumentPicker.pickFiles({ types: ["public.json"] })
    if (!paths.length) { setMessage("已取消选择"); return }
    const json = await FileManager.readAsString(paths[0]); const count = previewImport(json)
    setPending({ json, summary: `影片 ${count.records} 条，历史 ${count.history} 条，女优 ${count.actresses} 位` }); setReplace(false)
  } catch (e) { setMessage(e instanceof Error ? e.message : "读取失败") } finally { setBusy(false) } }
  const apply = () => { if (!pending) return; try { const result = importLocalData(pending.json, replace ? "replace" : "merge"); setPending(null); setReplace(false); setMessage(`导入完成：${result.records} 条影片。已保存导入前恢复快照。`); onDataChanged() } catch(e) { setMessage(e instanceof Error ? e.message : "导入失败") } }
  const exportData = async () => { setBusy(true); try { const data = Data.fromString(exportLocalData()); if (!data) throw new Error("备份生成失败"); const paths = await DocumentPicker.exportFiles({ files: [{ data, name: `javdb-backup-${Date.now()}.json` }] }); setMessage(paths.length ? "备份已导出" : "已取消导出") } catch(e) { setMessage(e instanceof Error ? e.message : "导出失败") } finally { setBusy(false) } }
  return <List><Section title="设置"><Button title="打开设置" systemImage="gearshape" action={onSettings} /></Section><Section title="安全备份"><Text>只接受本脚本 v1/v2 备份。默认合并保留本地较新记录，不覆盖设置。</Text><Button title="选择 JSON 并预览" disabled={busy} action={() => { void pick() }} /><Button title="导出 JSON" disabled={busy} action={() => { void exportData() }} /></Section>{pending ? <Section title="导入预览"><Text>{pending.summary}</Text><Button title="确认合并" action={apply} disabled={replace || busy} /><Button title={replace ? "再次点击确认全量覆盖" : "使用覆盖模式（会替换本地数据）"} action={() => { if (replace) apply(); else setReplace(true) }} /><Button title="取消导入" action={() => { setPending(null); setReplace(false) }} /></Section> : null}<Section title="操作结果"><Text>{busy ? "正在处理…" : message || "暂无操作"}</Text></Section></List>
}
