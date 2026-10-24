import { create } from 'zustand'
import type { BatchSizeMode } from '../../core/image/batch'
import type { PhysicalUnit } from '../../core/image/dims'
import type { PageSize } from '../../core/image/pdfWriter'
import type { SizeUnit } from '../../core/image/size'
import { autosave, loadSaved, SAVE_FAILED } from '../../store/autosave'
import { useAppStore } from '../../store/useAppStore'
import type { OutFormat } from './lib/canvas'

/** How the resize fields are expressed. */
export type ResizeUnit = 'px' | 'percent' | PhysicalUnit

export type ImageMode = 'edit' | 'batch' | 'pdf-to-images' | 'images-to-pdf'

export interface TargetPrefs {
  on: boolean
  value: number
  unit: SizeUnit
  /** Allow shrinking the dimensions when quality alone cannot reach the target. */
  allowScale: boolean
}

export interface ImagePrefs {
  edit: {
    format: OutFormat
    /** 1-100. */
    quality: number
    lockRatio: boolean
    unit: ResizeUnit
    /**
     * Print resolution (dots per inch), written into JPG / PNG files and used for inches / cm.
     * 0 = not set: files keep the browser's default and inches / cm assume 300.
     */
    dpi: number
    target: TargetPrefs
  }
  /** One set of settings for many photos. */
  batch: {
    /** What the person wants to do; picks the settings below (see batch/goals.ts). */
    goal: 'share' | 'upload' | 'space' | 'convert' | 'custom'
    format: OutFormat
    quality: number
    sizeMode: BatchSizeMode
    /** Percent, or pixels of the longer side; unused for 'original'. */
    sizeValue: number
    /** Print resolution written into JPG / PNG files; 0 = not set. */
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
  edit: {
    format: 'jpeg',
    quality: 80,
    lockRatio: true,
    unit: 'px',
    dpi: 0,
    target: { ...target },
  },
  batch: {
    goal: 'share',
    format: 'jpeg',
    quality: 80,
    sizeMode: 'longest',
    sizeValue: 1600,
    dpi: 0,
    target: { ...target },
  },
  pdfToImages: { format: 'png', quality: 85, dpi: 150 },
  imagesToPdf: { size: 'a4', margin: 20, orientation: 'auto', quality: 85, target: { ...target } },
}

interface ImageState {
  prefs: ImagePrefs
  setEdit(patch: Partial<ImagePrefs['edit']>): void
  setEditTarget(patch: Partial<TargetPrefs>): void
  setBatch(patch: Partial<Omit<ImagePrefs['batch'], 'target'>>): void
  setBatchTarget(patch: Partial<TargetPrefs>): void
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
    edit: {
      ...DEFAULT_PREFS.edit,
      ...saved.edit,
      target: { ...DEFAULT_PREFS.edit.target, ...saved.edit?.target },
    },
    batch: {
      ...DEFAULT_PREFS.batch,
      ...saved.batch,
      target: { ...DEFAULT_PREFS.batch.target, ...saved.batch?.target },
    },
    pdfToImages: { ...DEFAULT_PREFS.pdfToImages, ...saved.pdfToImages },
    imagesToPdf: {
      ...DEFAULT_PREFS.imagesToPdf,
      ...saved.imagesToPdf,
      target: { ...DEFAULT_PREFS.imagesToPdf.target, ...saved.imagesToPdf?.target },
    },
  },
  setEdit: (patch) => set((s) => ({ prefs: { ...s.prefs, edit: { ...s.prefs.edit, ...patch } } })),
  setEditTarget: (patch) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        edit: { ...s.prefs.edit, target: { ...s.prefs.edit.target, ...patch } },
      },
    })),
  setBatch: (patch) =>
    set((s) => ({ prefs: { ...s.prefs, batch: { ...s.prefs.batch, ...patch } } })),
  setBatchTarget: (patch) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        batch: { ...s.prefs.batch, target: { ...s.prefs.batch.target, ...patch } },
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
