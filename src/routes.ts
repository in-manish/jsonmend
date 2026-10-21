/**
 * One URL per tool, so a link opens the tool it was copied from. Pure data and functions (no DOM,
 * no imports) because vite.config.ts also reads it to emit a static page per route.
 */
export type Tool = 'json' | 'url' | 'py' | 'html' | 'image'

export interface Route {
  tool: Tool
  /** URL path segment: /json-formatter */
  slug: string
  title: string
  description: string
  /** Other paths that open the same tool. */
  aliases: string[]
}

export const ROUTES: Route[] = [
  {
    tool: 'json',
    slug: 'json-formatter',
    title: 'JSON formatter and repair',
    description:
      'Paste Python dicts, JS objects or broken JSON and get valid, pretty-printed JSON with a report of every change. Runs in your browser.',
    aliases: ['json', 'json-parser', 'json-formatter-and-repair'],
  },
  {
    tool: 'url',
    slug: 'url-encode-decode',
    title: 'URL encoder and decoder',
    description:
      'Encode and decode URLs: percent-encoding, form encoding and Base64, with a breakdown of the URL parts. Runs in your browser.',
    aliases: ['url', 'urldecode', 'url-decoder'],
  },
  {
    tool: 'py',
    slug: 'python-indentation',
    title: 'Python indentation fixer',
    description:
      'Fix Python tabs, mixed whitespace and wrong indent sizes, then copy code that runs in your terminal. Runs in your browser.',
    aliases: ['python', 'py', 'python-indent'],
  },
  {
    tool: 'html',
    slug: 'html-formatter',
    title: 'HTML formatter and preview',
    description:
      'Format and preview HTML, with Django and Jinja template support: tags stay intact, errors are highlighted and fixes suggested. Runs in your browser.',
    aliases: ['html', 'html-preview', 'html-beautifier', 'django-template-formatter'],
  },
  {
    tool: 'image',
    slug: 'image-tools',
    title: 'Image resizer, converter and PDF tools',
    description:
      'Resize, compress to a target size, and convert images between JPEG, PNG and WebP; turn PDF pages into images and images into a PDF. Runs in your browser; files are never uploaded.',
    aliases: [
      'image',
      'image-resizer',
      'image-converter',
      'image-compressor',
      'resize-image',
      'compress-image',
      'pdf-to-image',
      'image-to-pdf',
    ],
  },
]

const clean = (pathname: string, base: string) =>
  pathname
    .slice(pathname.startsWith(base) ? base.length : 0)
    .replace(/\/+$/, '')
    .replace(/\/index\.html$/, '')
    .replace(/^\/+/, '')
    .toLowerCase()

/** The tool a path points at, or undefined for the root and unknown paths. */
export function toolFromPath(pathname: string, base = '/'): Tool | undefined {
  const name = clean(pathname, base)
  return ROUTES.find((r) => r.slug === name || r.aliases.includes(name))?.tool
}

export function routeFor(tool: Tool): Route {
  return ROUTES.find((r) => r.tool === tool) ?? ROUTES[0]
}

/**
 * The URL a tool lives at. The JSON formatter is the default tool, so it is the bare site root;
 * `/json-formatter` (and the aliases) still open it when typed.
 */
export function pathFor(tool: Tool, base = '/'): string {
  return tool === 'json' ? base : `${base}${routeFor(tool).slug}`
}
