// Writes a download's content into its .part file, after what an earlier run wrote, and puts the finished file in place.
// Every platform's downloads go through it. See docs/ARCHITECTURE.md.
import { createWriteStream } from 'node:fs'
import { rename } from 'node:fs/promises'
import { Transform, type TransformCallback } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { PART_FILE_SUFFIX } from '../constants/part-constants'
import { sizeOrZero } from './file-utils'

export function partPathOf(targetPath: string): string {
  return `${targetPath}${PART_FILE_SUFFIX}`
}

// Where the download continues: what the .part file holds, if it holds part of the same version. null when it's all
// there, after putting the finished file in place.
export async function resumeOffset(
  targetPath: string,
  etag: string | null,
  bytesTotal: number | null
): Promise<number | null> {
  const partPath = partPathOf(targetPath)
  const offset = etag === null ? 0 : await sizeOrZero(partPath)
  if (etag !== null && bytesTotal !== null && offset === bytesTotal && offset > 0) {
    await rename(partPath, targetPath)
    return null
  }
  return bytesTotal !== null && offset > bytesTotal ? 0 : offset
}

// Appends the content to the .part file from the offset, or starts it anew at 0, then renames it to the target.
export async function saveDownload(
  body: NodeJS.ReadableStream,
  target: { targetPath: string; offset: number; total: number },
  signal: AbortSignal,
  onProgress: (bytesDone: number, bytesTotal: number) => void
): Promise<void> {
  const { targetPath, offset, total } = target
  let bytesDone = offset
  onProgress(bytesDone, total)
  const counter = new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
      bytesDone += chunk.length
      onProgress(bytesDone, total)
      callback(null, chunk)
    }
  })
  const partPath = partPathOf(targetPath)
  await pipeline(body, counter, createWriteStream(partPath, { flags: offset > 0 ? 'a' : 'w' }), {
    signal
  })
  await rename(partPath, targetPath)
}
