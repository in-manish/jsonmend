import { pathFor, routeFor, type Tool, toolFromPath } from '../routes'
import { useAppStore } from '../store/useAppStore'
import { decodeShare } from './lib/share'

const BASE = import.meta.env.BASE_URL

/** The tool the address bar asks for. A bare old-style share link (`/#input=...`) means JSON. */
export function toolFromLocation(): Tool | undefined {
  return (
    toolFromPath(location.pathname, BASE) ??
    (decodeShare(location.hash) !== undefined ? 'json' : undefined)
  )
}

/** Run before the first render: an explicit path wins over the last-used tool. */
export function applyLocationToStore() {
  const tool = toolFromLocation()
  if (tool) useAppStore.setState({ tool })
}

/**
 * Makes the address bar match `tool`. Switching tools pushes a history entry and drops the
 * query and hash (a share link's data belongs to the JSON tool); the initial sync replaces the
 * entry and keeps them.
 */
export function syncUrl(tool: Tool, mode: 'push' | 'replace') {
  const path = pathFor(tool, BASE)
  if (location.pathname === path) return
  const rest = mode === 'replace' ? location.search + location.hash : ''
  history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', path + rest)
}

export function titleFor(tool: Tool): string {
  return `${routeFor(tool).title} · jsonmend`
}
