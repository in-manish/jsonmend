import { pathFor, routeFor, type Tool, toolFromPath } from '../routes'
import { useAppStore } from '../store/useAppStore'

const BASE = import.meta.env.BASE_URL

/** The tool the address bar asks for: its path, otherwise (the root, old share links) JSON. */
export function toolFromLocation(): Tool {
  return toolFromPath(location.pathname, BASE) ?? 'json'
}

/** Run before the first render. */
export function applyLocationToStore() {
  useAppStore.setState({ tool: toolFromLocation() })
}

/**
 * Makes the address bar match `tool` when the user switches tools: pushes a history entry and
 * drops the query and hash (a share link's data belongs to the JSON tool). A URL that already
 * opens the tool (`/json-formatter`, `/python`) is left exactly as typed.
 */
export function syncUrl(tool: Tool) {
  if (toolFromPath(location.pathname, BASE) === tool) return
  history.pushState(null, '', pathFor(tool, BASE))
}

/** On load: tidy URLs that don't map to a tool, and spell out aliases of the non-default tools. */
export function normalizeUrl(tool: Tool) {
  const path = pathFor(tool, BASE)
  const known = toolFromPath(location.pathname, BASE)
  if (known === undefined) {
    // The root (and old `/#input=` links) stay as they are; anything else is a mistyped path.
    if (location.pathname !== BASE)
      history.replaceState(null, '', BASE + location.search + location.hash)
  } else if (tool !== 'json' && location.pathname !== path) {
    history.replaceState(null, '', path + location.search + location.hash)
  }
}

export function titleFor(tool: Tool): string {
  return `${routeFor(tool).title} · jsonmend`
}
