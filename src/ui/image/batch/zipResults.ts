import { uniqueNames } from '../../../core/image/batch'
import { createZip } from '../../../core/image/zip'
import { downloadBlob } from '../../lib/files'
import { baseName, EXTENSION, type OutFormat } from '../lib/canvas'
import type { BatchItem } from './useBatch'

/** The ZIP is built in memory, so it stays well under what a browser tab can hold. */
export const MAX_ZIP_BYTES = 500 * 1024 * 1024

/** "photo.png" -> "photo.jpg". */
export const outputName = (file: File, format: OutFormat) =>
  `${baseName(file.name)}.${EXTENSION[format]}`

export const doneItems = (items: BatchItem[]) =>
  items.filter((i): i is BatchItem & { out: NonNullable<BatchItem['out']> } => !!i.out)

/** Saves every converted photo in one ZIP; same-named photos get " (2)", " (3)"… */
export async function downloadZip(items: BatchItem[], format: OutFormat) {
  const done = doneItems(items)
  const names = uniqueNames(done.map((i) => outputName(i.file, format)))
  const entries = await Promise.all(
    done.map(async (i, n) => ({
      name: names[n],
      data: new Uint8Array(await i.out.blob.arrayBuffer()),
    })),
  )
  downloadBlob(
    new Blob([createZip(entries) as BlobPart], { type: 'application/zip' }),
    'photos.zip',
  )
}
