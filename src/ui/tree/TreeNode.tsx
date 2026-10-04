import { memo, useState } from 'react'
import type { JsonNode } from '../../core'
import { formatPath, type Segment } from './path'

const PAGE = 100

interface Props {
  node: JsonNode
  label: string | number
  segments: Segment[]
  expanded: Set<string>
  toggle(path: string): void
  copyPath(segments: Segment[]): void
}

export const TreeNode = memo(function TreeNode(props: Props) {
  const { node, label, segments, expanded, toggle, copyPath } = props
  const path = formatPath(segments)
  const [limit, setLimit] = useState(PAGE)
  const isContainer = node.kind === 'object' || node.kind === 'array'
  const open = expanded.has(path)
  const size =
    node.kind === 'object' ? node.entries.length : node.kind === 'array' ? node.items.length : 0

  const children: [Segment, JsonNode][] =
    !open || !isContainer
      ? []
      : node.kind === 'object'
        ? node.entries.map((e) => [e.key.kind === 'string' ? e.key.value : '', e.value as JsonNode])
        : node.items.map((item, i) => [i, item as JsonNode])

  return (
    <li>
      <div className="tree-row">
        {isContainer ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => toggle(path)}
            aria-label={`${open ? 'Collapse' : 'Expand'} ${path}`}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-toggle" aria-hidden="true" />
        )}
        <button
          type="button"
          className="tree-key"
          title={`Copy path ${path}`}
          onClick={() => copyPath(segments)}
        >
          {typeof label === 'number' ? label : label}
        </button>
        <span className="tree-sep">:</span>
        {isContainer ? (
          <span className="tree-summary">{node.kind === 'object' ? `{${size}}` : `[${size}]`}</span>
        ) : (
          <Scalar node={node} />
        )}
      </div>
      {open && size > 0 && (
        <ul>
          {children.slice(0, limit).map(([seg, child]) => (
            <TreeNode
              key={String(seg)}
              node={child}
              label={seg}
              segments={[...segments, seg]}
              expanded={expanded}
              toggle={toggle}
              copyPath={copyPath}
            />
          ))}
          {size > limit && (
            <li>
              <button
                type="button"
                className="chip ml-6 my-1"
                onClick={() => setLimit((l) => l + PAGE * 10)}
              >
                Show more ({size - limit} remaining)
              </button>
            </li>
          )}
        </ul>
      )}
    </li>
  )
})

function Scalar({ node }: { node: JsonNode }) {
  switch (node.kind) {
    case 'string': {
      const text = JSON.stringify(node.value)
      return (
        <span className="tok-string">{text.length > 300 ? `${text.slice(0, 297)}..."` : text}</span>
      )
    }
    case 'number':
      return <span className="tok-number">{node.raw}</span>
    case 'boolean':
      return <span className="tok-bool">{String(node.value)}</span>
    default:
      return <span className="tok-null">null</span>
  }
}
