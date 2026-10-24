import { describe, expect, it } from 'vitest'
import { FORM_PRESETS, formOption, parseFormOption } from '../../src/core/image/formPresets'
import { pathFor, ROUTES, routeFor, routeFromPath, TOOL_ROUTES } from '../../src/routes'

describe('routes', () => {
  it('gives every path (slug and alias) to exactly one thing', () => {
    const paths = ROUTES.flatMap((r) => [r.slug, ...r.aliases])
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('keeps the tool tabs to the five tools', () => {
    expect(TOOL_ROUTES.map((r) => r.tool)).toEqual(['json', 'url', 'py', 'html', 'image'])
    expect(TOOL_ROUTES.every((r) => r.option === undefined)).toBe(true)
  })

  it('has a link for every form and every file a form asks for', () => {
    for (const form of FORM_PRESETS) {
      expect(routeFromPath(`/photo-for/${form.id}`)?.option).toBe(formOption(form.id))
      for (const doc of form.docs) {
        const route = routeFromPath(`/photo-for/${form.id}/${doc.id}`)
        expect(route?.tool).toBe('image')
        expect(route?.option).toBe(formOption(form.id, doc.id))
      }
    }
    expect(routeFromPath('/photo-for')?.option).toBe('form')
  })

  it('names the exact size in the title and description of a form page', () => {
    const route = routeFromPath('/photo-for/ibps/signature')
    expect(route?.title).toBe('IBPS (bank exams) signature: 140 × 60 px, 10–20 KB')
    expect(route?.description).toContain('140 × 60 px, JPG, 10–20 KB')
    expect(route?.description).toContain('never uploaded')
  })

  it('opens the image modes by path, including the old aliases', () => {
    expect(routeFromPath('/image-tools/many-photos')?.option).toBe('batch')
    expect(routeFromPath('/pdf-to-image')?.option).toBe('pdf-to-images')
    expect(routeFromPath('/image-to-pdf')?.option).toBe('images-to-pdf')
    expect(routeFromPath('/image-tools')?.option).toBeUndefined()
  })

  it('builds the path of a tool or of one of its options', () => {
    expect(pathFor('image')).toBe('/image-tools')
    expect(pathFor('image', '/', 'batch')).toBe('/image-tools/many-photos')
    expect(pathFor('image', '/app/', formOption('neet', 'signature'))).toBe(
      '/app/photo-for/neet/signature',
    )
    expect(pathFor('json')).toBe('/')
    // An option that does not exist falls back to the tool itself.
    expect(routeFor('image', 'nope').slug).toBe('image-tools')
  })

  it('reads a form option back, and ignores other options', () => {
    expect(parseFormOption('form')).toEqual({ formId: undefined, docId: undefined })
    expect(parseFormOption('form:ibps:photo')).toEqual({ formId: 'ibps', docId: 'photo' })
    expect(parseFormOption('batch')).toBeUndefined()
    expect(parseFormOption(undefined)).toBeUndefined()
  })
})
