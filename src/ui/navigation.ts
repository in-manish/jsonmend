import { pathFor, type Route, routeFor, routeFromPath, type Tool } from '../routes'
import { useAppStore } from '../store/useAppStore'

const BASE = import.meta.env.BASE_URL

const routeFromLocation = (): Route | undefined => routeFromPath(location.pathname, BASE)

/** The tool the address bar asks for: its path, otherwise (the root, old share links) JSON. */
export function toolFromLocation(): Tool {
  return routeFromLocation()?.tool ?? 'json'
}

/** Run before the first render, and on Back / Forward: the address bar decides tool and option. */
export function applyLocationToStore() {
  const route = routeFromLocation()
  useAppStore.setState({ tool: route?.tool ?? 'json', option: route?.option })
}

/**
 * Makes the address bar match `tool` when the user switches tools: pushes a history entry and
 * drops the query and hash (a share link's data belongs to the JSON tool). A URL that already
 * opens the tool (`/json-formatter`, `/python`) is left exactly as typed.
 */
export function syncUrl(tool: Tool) {
  if (routeFromLocation()?.tool === tool) return
  history.pushState(null, '', pathFor(tool, BASE))
}

/** Opens an option of a tool (a mode, a form) and gives it its own address, so it can be shared. */
export function openOption(tool: Tool, option?: string) {
  useAppStore.setState({ tool, option })
  const path = pathFor(tool, BASE, option)
  if (location.pathname !== path) history.pushState(null, '', path)
}

/** On load: tidy URLs that don't map to anything, and spell out aliases of the non-default tools. */
export function normalizeUrl() {
  const route = routeFromLocation()
  if (route === undefined) {
    // The root (and old `/#input=` links) stay as they are; anything else is a mistyped path.
    if (location.pathname !== BASE)
      history.replaceState(null, '', BASE + location.search + location.hash)
  } else if (route.tool !== 'json' && location.pathname !== BASE + route.slug) {
    history.replaceState(null, '', BASE + route.slug + location.search + location.hash)
  }
}

export function titleFor(tool: Tool, option?: string): string {
  return `${routeFor(tool, option).title} · jsonmend`
}
