import { create } from 'zustand'
import type { PhysicalUnit } from '../../core/image/dims'
import type { PageSize } from '../../core/image/pdfWriter'
import type { SizeUnit } from '../../core/image/size'
import { autosave, loadSaved, SAVE_FAILED } from '../../store/autosave'
import { useAppStore } from '../../store/useAppStore'
import type { OutFormat } from './lib/canvas'

/** How the resize fields are expressed. */
export type ResizeUnit = 'px' | 'percent' | PhysicalUnit

export type ImageMode = 'edit' | 'pdf-to-images' | 'images-to-pdf'

export interface TargetPrefs {
  on: boolean
  value: number
  unit: SizeUnit
  /** Allow shrinking the dimensions when quality alone cannot reach the target. */
  allowScale: boolean
}

export interface ImagePrefs {
  mode: ImageMode
  edit: {
    format: OutFormat
    /** 1-100. */
    quality: number
    lockRatio: boolean
    unit: ResizeUnit
    /** Print resolution: converts inches / cm to pixels, and is written into JPEG / PNG files. */
    dpi: number
    target: TargetPrefs
  }
  pdfToImages: { format: OutFormat; quality: number; dpi: number }
  imagesToPdf: {
    size: PageSize
    margin: number
    orientation: 'auto' | 'portrait'
    quality: number
    target: TargetPrefs
  }
}

const target: TargetPrefs = { on: false, value: 200, unit: 'kb', allowScale: true }

export const DEFAULT_PREFS: ImagePrefs = {
  mode: 'edit',
  edit: {
    format: 'jpeg',
    quality: 80,
    lockRatio: true,
    unit: 'px',
    dpi: 300,
    target: { ...target },
  },
  pdfToImages: { format: 'png', quality: 85, dpi: 150 },
  imagesToPdf: { size: 'a4', margin: 20, orientation: 'auto', quality: 85, target: { ...target } },
}

interface ImageState {
  prefs: ImagePrefs
  setMode(mode: ImageMode): void
  setEdit(patch: Partial<ImagePrefs['edit']>): void
  setEditTarget(patch: Partial<TargetPrefs>): void
  setPdfToImages(patch: Partial<ImagePrefs['pdfToImages']>): void
  setImagesToPdf(patch: Partial<Omit<ImagePrefs['imagesToPdf'], 'target'>>): void
  setPdfTarget(patch: Partial<TargetPrefs>): void
}

const KEY = 'jsonmend:image'
type Saved = Partial<ImagePrefs>
const saved = loadSaved<Saved>(KEY)

/** Only preferences persist; image and PDF files are never stored. */
export const useImageStore = create<ImageState>((set) => ({
  prefs: {
    mode: saved.mode ?? DEFAULT_PREFS.mode,
    edit: {
      ...DEFAULT_PREFS.edit,
      ...saved.edit,
      target: { ...DEFAULT_PREFS.edit.target, ...saved.edit?.target },
    },
    pdfToImages: { ...DEFAULT_PREFS.pdfToImages, ...saved.pdfToImages },
    imagesToPdf: {
      ...DEFAULT_PREFS.imagesToPdf,
      ...saved.imagesToPdf,
      target: { ...DEFAULT_PREFS.imagesToPdf.target, ...saved.imagesToPdf?.target },
    },
  },
  setMode: (mode) => set((s) => ({ prefs: { ...s.prefs, mode } })),
  setEdit: (patch) => set((s) => ({ prefs: { ...s.prefs, edit: { ...s.prefs.edit, ...patch } } })),
  setEditTarget: (patch) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        edit: { ...s.prefs.edit, target: { ...s.prefs.edit.target, ...patch } },
      },
    })),
  setPdfToImages: (patch) =>
    set((s) => ({ prefs: { ...s.prefs, pdfToImages: { ...s.prefs.pdfToImages, ...patch } } })),
  setImagesToPdf: (patch) =>
    set((s) => ({ prefs: { ...s.prefs, imagesToPdf: { ...s.prefs.imagesToPdf, ...patch } } })),
  setPdfTarget: (patch) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        imagesToPdf: {
          ...s.prefs.imagesToPdf,
          target: { ...s.prefs.imagesToPdf.target, ...patch },
        },
      },
    })),
}))

autosave(
  useImageStore,
  KEY,
  (s): Saved => s.prefs,
  () => useAppStore.getState().notify(SAVE_FAILED),
)
