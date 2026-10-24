import type { ImagePrefs, TargetPrefs } from '../useImageStore'

type Prefs = ImagePrefs['batch']
export type BatchGoal = Prefs['goal']

export interface Goal {
  id: BatchGoal
  title: string
  text: string
  /** Settings this choice sets; the rest of the batch settings stay as they are. */
  apply: Partial<Omit<Prefs, 'target' | 'goal'>>
  target?: Partial<TargetPrefs>
  /** The big button, with the number of photos. */
  action(n: number): string
}

const photos = (n: number) => `${n} photo${n === 1 ? '' : 's'}`

/**
 * What people actually want to do, in their words. Each one fills in the technical settings, so
 * nobody has to know what a pixel, DPI or JPG quality is; "choose myself" shows them all.
 */
export const GOALS: Goal[] = [
  {
    id: 'share',
    title: 'Send by WhatsApp or email',
    text: 'Smaller photos that still look good',
    apply: { format: 'jpeg', quality: 80, sizeMode: 'longest', sizeValue: 1600, dpi: 0 },
    target: { on: false },
    action: (n) => `Make ${photos(n)} smaller`,
  },
  {
    id: 'upload',
    title: 'Upload to a website or form',
    text: 'Every photo stays under a size limit',
    apply: { format: 'jpeg', quality: 85, sizeMode: 'original', dpi: 0 },
    target: { on: true, value: 200, unit: 'kb', allowScale: true },
    action: (n) => `Make ${photos(n)} fit the limit`,
  },
  {
    id: 'space',
    title: 'Free up space',
    text: 'Same look, much smaller files',
    apply: { format: 'jpeg', quality: 70, sizeMode: 'original', dpi: 0 },
    target: { on: false },
    action: (n) => `Make ${photos(n)} smaller`,
  },
  {
    id: 'convert',
    title: 'Change the file type',
    text: 'For example PNG to JPG',
    apply: { quality: 90, sizeMode: 'original', dpi: 0 },
    target: { on: false },
    action: (n) => `Change ${photos(n)}`,
  },
  {
    id: 'custom',
    title: 'I want to choose myself',
    text: 'Pick the size, type and file size',
    apply: {},
    action: (n) => `Start ${photos(n)}`,
  },
]

export const goalFor = (id: BatchGoal): Goal => GOALS.find((g) => g.id === id) ?? GOALS[0]
