import { Image, Text, VStack, useEffect, useState } from "scripting"
const cache = new Map<string, UIImage>()
const pending = new Map<string, Promise<UIImage | null>>()
let running = 0
const waiters: Array<() => void> = []
async function loadCover(url: string): Promise<UIImage | null> {
  if (cache.has(url)) return cache.get(url)!
  if (pending.has(url)) return pending.get(url)!
  const work = (async () => {
    if (running >= 4) await new Promise<void>(resolve => waiters.push(resolve))
    else running++
    try {
      const source = await UIImage.fromURL(url)
      if (!source) return null
      // 宽封套通常右侧是正面；不修改原始URL，只在列表中裁显示区域。
      const portrait = source.width > source.height * 1.2
        ? source.croppedTo({ x: Math.max(0, source.width - source.height * 0.7), y: 0, width: source.height * 0.7, height: source.height }) ?? source
        : source
      const image = portrait.preparingThumbnail({ width: 280, height: 400 }) ?? portrait
      cache.set(url, image)
      if (cache.size > 100) cache.delete(cache.keys().next().value!)
      return image
    } catch { return null }
    finally { const next = waiters.shift(); if (next) next(); else running-- }
  })()
  pending.set(url, work)
  try { return await work } finally { pending.delete(url) }
}
export default function PortraitCover({ url, width, height }: { url: string; width?: number; height?: number }) {
  const [image, setImage] = useState<UIImage | null>(cache.get(url) ?? null)
  const [failed, setFailed] = useState(false)
  useEffect(() => { let alive = true; setImage(cache.get(url) ?? null); setFailed(false); if (!url) { setFailed(true); return }; loadCover(url).then(result => { if (alive) { setImage(result); setFailed(!result) } }); return () => { alive = false } }, [url])
  return image ? <Image image={image} resizable aspectRatio={{ value: 0.7, contentMode: "fit" }} frame={{ width, height }} clipShape={{ type: "rect", cornerRadius: 10 }} /> : <VStack frame={{ width, height: height ?? 150, maxWidth: width ? undefined : "infinity" }} background="#F0EBEE" clipShape={{ type: "rect", cornerRadius: 10 }}><Text font="caption" foregroundStyle="#777777">{failed ? "封面未加载" : "加载封面…"}</Text></VStack>
}
