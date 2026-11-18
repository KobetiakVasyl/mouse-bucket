// Splits a file into the parts an upload sends, on any platform. See docs/ARCHITECTURE.md.
import { MAX_PARTS, MIN_PART_SIZE, PART_SIZE_STEP } from '../constants/part-constants'

// 8 MiB parts, larger for files over about 78 GiB, so no upload needs more than 10,000 parts.
export function partSizeFor(fileSize: number): number {
  return Math.max(MIN_PART_SIZE, Math.ceil(fileSize / MAX_PARTS / PART_SIZE_STEP) * PART_SIZE_STEP)
}

// How many parts a file is sent in, at least one.
export function partCount(fileSize: number, partSize: number): number {
  return Math.max(1, Math.ceil(fileSize / partSize))
}

// Every part number of the file, from 1.
export function partNumbers(fileSize: number, partSize: number): number[] {
  return Array.from({ length: partCount(fileSize, partSize) }, (_, index) => index + 1)
}

// Where a part starts in the file, and how long it is; only the last part may be shorter.
export function partRange(
  partNumber: number,
  partSize: number,
  fileSize: number
): { start: number; length: number } {
  const start = (partNumber - 1) * partSize
  return { start, length: Math.min(partSize, fileSize - start) }
}

// How many bytes of the file the given parts hold.
export function partsBytes(numbers: number[], partSize: number, fileSize: number): number {
  return numbers.reduce(
    (total, partNumber) => total + partRange(partNumber, partSize, fileSize).length,
    0
  )
}
