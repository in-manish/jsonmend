/**
 * One URL per tool, and one per option inside a tool, so a link opens exactly what it was copied
 * from. Pure data and functions (no DOM) because vite.config.ts also reads it to emit a static page
 * per route; it may import only other pure modules.
 */
import { describeDoc, FORM_PRESETS, formOption } from './core/image/formPresets.ts'

export type Tool = 'json' | 'url' | 'py' | 'html' | 'image'

export interface Route {
  tool: Tool
  /** URL path: /json-formatter, /photo-for/ibps/signature */
  slug: string
  title: string
  description: string
  /** Other paths that open the same thing. */
  aliases: string[]
  /** Which part of the tool this path opens; undefined for the tool itself. */
  option?: string
}

/** The tools: these are the tabs. */
export const TOOL_ROUTES: Route[] = [
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
    ],
  },
]

const LOCAL = 'Runs in your browser; files are never uploaded.'

const image = (
  slug: string,
  option: string,
  title: string,
  description: string,
  aliases: string[] = [],
): Route => ({
  tool: 'image',
  slug,
  option,
  title,
  description: `${description} ${LOCAL}`,
  aliases,
})

/** Parts of the image tools, and one page per form and per file a form asks for. */
const OPTION_ROUTES: Route[] = [
  image(
    'image-tools/many-photos',
    'batch',
    'Resize and compress many photos at once',
    'Make a whole folder of photos smaller for WhatsApp, email or an upload form, and download them in one ZIP.',
    ['batch-image-resizer'],
  ),
  image(
    'image-tools/pdf-to-images',
    'pdf-to-images',
    'PDF to images',
    'Turn the pages of a PDF into PNG, JPG or WebP images.',
    ['pdf-to-image'],
  ),
  image(
    'image-tools/images-to-pdf',
    'images-to-pdf',
    'Images to PDF',
    'Put photos and scans into one PDF, and keep it under a size limit if you need to.',
    ['image-to-pdf'],
  ),
  image(
    'photo-for',
    formOption(),
    'Photo for a form: exact size for IBPS, NEET, UPSC, passport',
    'Make your photo, signature or thumb the exact size and file size a form asks for.',
  ),
  ...FORM_PRESETS.flatMap((form) => [
    image(
      `photo-for/${form.id}`,
      formOption(form.id),
      `${form.name}: photo and signature size`,
      `Make your ${form.docs.map((d) => d.label.toLowerCase()).join(', ')} the exact size and file size the ${form.name} form asks for.`,
    ),
    ...form.docs.map((doc) =>
      image(
        `photo-for/${form.id}/${doc.id}`,
        formOption(form.id, doc.id),
        `${form.name} ${doc.label.toLowerCase()}: ${describeDoc(doc).replace(', JPG', '')}`,
        `Resize your ${form.name} ${doc.label.toLowerCase()} to ${describeDoc(doc)}. Checks the edges of a photographed photo and crops for you.`,
      ),
    ),
  ]),
]

export const ROUTES: Route[] = [...TOOL_ROUTES, ...OPTION_ROUTES]

const clean = (pathname: string, base: string) =>
  pathname
    .slice(pathname.startsWith(base) ? base.length : 0)
    .replace(/\/+$/, '')
    .replace(/\/index\.html$/, '')
    .replace(/^\/+/, '')
    .toLowerCase()

/** What a path opens, or undefined for the root and unknown paths. */
export function routeFromPath(pathname: string, base = '/'): Route | undefined {
  const name = clean(pathname, base)
  return ROUTES.find((r) => r.slug === name || r.aliases.includes(name))
}

/** The tool a path points at, or undefined for the root and unknown paths. */
export const toolFromPath = (pathname: string, base = '/'): Tool | undefined =>
  routeFromPath(pathname, base)?.tool

/** The route of a tool, or of one of its options; the tool's own route if the option is unknown. */
export function routeFor(tool: Tool, option?: string): Route {
  return (
    ROUTES.find((r) => r.tool === tool && r.option === option) ??
    TOOL_ROUTES.find((r) => r.tool === tool) ??
    TOOL_ROUTES[0]
  )
}

/**
 * The URL a tool (or one of its options) lives at. The JSON formatter is the default tool, so it is
 * the bare site root; `/json-formatter` (and the aliases) still open it when typed.
 */
export function pathFor(tool: Tool, base = '/', option?: string): string {
  return tool === 'json' ? base : `${base}${routeFor(tool, option).slug}`
}
