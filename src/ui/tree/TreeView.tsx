import { useCallback, useMemo, useState } from 'react'
import type { JsonNode } from '../../core'
import { parseStrictJson } from '../../core/parse/strict'
import { useAppStore } from '../../store/useAppStore'
import { copyText } from '../lib/files'
import { formatPath, type Segment } from './path'
import { TreeNode } from './TreeNode'

/**
 * Collapsible view of the output. Parsed with the lossless strict parser so big integers show
 * exactly. Children render only when expanded, so huge documents stay fast.
 */
export function TreeView({ output, jsonLines }: { output: string; jsonLines: boolean }) {
  const roots = useMemo((): JsonNode[] | undefined => {
    try {
      return jsonLines
        ? output.split('\n').map((l) => parseStrictJson(l))
        : [parseStrictJson(output)]
    } catch {
      return undefined
    }
  }, [output, jsonLines])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']))

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const copyPath = useCallback(async (segments: Segment[]) => {
    const path = formatPath(segments)
    const ok = await copyText(path)
    useAppStore.getState().notify(ok ? `Copied ${path}` : 'Clipboard is not available')
  }, [])

  if (!roots) return <p className="p-4 text-sm">Tree view is unavailable for this output.</p>

  return (
    <ul className="tree h-full overflow-auto p-2 font-mono text-[13px]" aria-label="JSON tree">
      {roots.map((node, i) => (
        <TreeNode
          // biome-ignore lint/suspicious/noArrayIndexKey: lines have no other identity
          key={i}
          node={node}
          label={jsonLines ? `line ${i + 1}` : '$'}
          segments={jsonLines ? [i] : []}
          expanded={expanded}
          toggle={toggle}
          copyPath={copyPath}
        />
      ))}
    </ul>
  )
}
