// Keeps the transfers that haven't finished in transfers.json, so they can resume after the app restarts. See docs/ARCHITECTURE.md.
import type { TransferRecord, TransferStore } from '../types/transfer-queue-types'
import {
  parseJson,
  readIfExists,
  serialize,
  toJsonFile,
  writeAtomically,
  writeAtomicallySync
} from '../utils/file-utils'
import { TransfersFileSchema } from '../validation/data-file-validation'

export class TransferStoreService implements TransferStore {
  private readonly serial = serialize()

  constructor(private readonly path: string) {}

  // A damaged or invalid file counts as no transfers.
  async load(): Promise<TransferRecord[]> {
    const raw = await readIfExists(this.path)
    if (raw === undefined) return []
    const parsed = TransfersFileSchema.safeParse(parseJson(raw.toString('utf8')))
    return parsed.success ? parsed.data : []
  }

  save(records: TransferRecord[]): Promise<void> {
    return this.serial(() => writeAtomically(this.path, toJsonFile(records)))
  }

  // Synchronous, because it runs while the app is about to quit.
  saveSync(records: TransferRecord[]): void {
    writeAtomicallySync(this.path, toJsonFile(records))
  }
}
