import { Button, Image } from "scripting"
export function IconButton({ symbol, action, label, light = false }: { symbol: string; action: () => void; label: string; light?: boolean }) {
  return <Button buttonStyle="plain" action={action}><Image systemName={symbol} font={{ name: "system", size: 28 }} bold foregroundStyle={light ? "#FFFFFF" : "#242126"} frame={{ width: 50, height: 50 }} contentShape="rect" accessibilityLabel={label} /></Button>
}
export function BackIcon({ action, light = false }: { action: () => void; light?: boolean }) { return <IconButton symbol="chevron.left" label="返回上一页" action={action} light={light} /> }
