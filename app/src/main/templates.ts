// Stores templates: their S3 location in templates.json and their IAM keys, encrypted, in credentials.bin. See docs/SECURITY.md.
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { z } from 'zod'
import { Template } from '../shared/ipc'
import { UserError } from './errors'
import type { Decrypted, KeyVault } from './key-vault'
import { parseJson, readIfExists, serialize, writeAtomically } from './store/files'

export interface Credentials {
  accessKeyId: string
  secretAccessKey: string
}

const TemplatesFile = z.array(Template)
const CredentialsFile = z.record(
  z.string(),
  z.object({ accessKeyId: z.string(), secretAccessKey: z.string() })
)
type CredentialsFile = z.infer<typeof CredentialsFile>

export const NO_ENCRYPTION_MESSAGE =
  "MouseBucket can't store keys securely on this computer, because no keyring is running. " +
  'Start one, such as GNOME Keyring or KWallet, then restart the app.'

export class TemplateStore {
  private readonly templatesPath: string
  private readonly credentialsPath: string
  private readonly serial = serialize()

  constructor(
    dataDir: string,
    private readonly vault: KeyVault
  ) {
    this.templatesPath = join(dataDir, 'templates.json')
    this.credentialsPath = join(dataDir, 'credentials.bin')
  }

  async list(): Promise<Template[]> {
    const raw = await readIfExists(this.templatesPath)
    if (raw === undefined) return []
    const parsed = TemplatesFile.safeParse(parseJson(raw.toString('utf8')))
    if (!parsed.success) throw new UserError('The saved templates are damaged.')
    return parsed.data
  }

  async get(id: string): Promise<Template> {
    const template = (await this.list()).find((candidate) => candidate.id === id)
    if (template === undefined) throw new UserError('That template no longer exists.')
    return template
  }

  credentialsFor(id: string): Promise<Credentials> {
    return this.serial(async () => {
      const credentials = await this.readCredentials()
      if (!Object.hasOwn(credentials, id)) {
        throw new UserError('The keys for this template are missing. Delete it and add it again.')
      }
      return credentials[id]
    })
  }

  create(details: Omit<Template, 'id'>, credentials: Credentials): Promise<Template> {
    return this.serial(async () => {
      if (!(await this.vault.available())) throw new UserError(NO_ENCRYPTION_MESSAGE)
      const templates = await this.list()
      const name = details.name.toLocaleLowerCase()
      if (templates.some((template) => template.name.toLocaleLowerCase() === name)) {
        throw new UserError(`A template named "${details.name}" already exists.`)
      }
      const template: Template = { id: randomUUID(), ...details }
      await this.writeCredentials({ ...(await this.readCredentials()), [template.id]: credentials })
      await this.writeTemplates([...templates, template])
      return template
    })
  }

  delete(id: string): Promise<void> {
    return this.serial(async () => {
      await this.writeTemplates((await this.list()).filter((template) => template.id !== id))
      const credentials = await this.readCredentials()
      if (Object.hasOwn(credentials, id)) {
        const kept = Object.entries(credentials).filter(([templateId]) => templateId !== id)
        await this.writeCredentials(Object.fromEntries(kept))
      }
    })
  }

  // Runs only inside serial(), because it may write the keys again under a rotated OS key.
  private async readCredentials(): Promise<CredentialsFile> {
    const encrypted = await readIfExists(this.credentialsPath)
    if (encrypted === undefined) return {}
    if (!(await this.vault.available())) throw new UserError(NO_ENCRYPTION_MESSAGE)
    let decrypted: Decrypted
    try {
      decrypted = await this.vault.decrypt(encrypted)
    } catch {
      throw new UserError(
        "The saved keys can't be decrypted by this user account. Delete the templates and add them again."
      )
    }
    const parsed = CredentialsFile.safeParse(parseJson(decrypted.text))
    if (!parsed.success) throw new UserError('The saved keys are damaged.')
    if (decrypted.shouldReEncrypt) await this.writeCredentials(parsed.data)
    return parsed.data
  }

  private async writeCredentials(credentials: CredentialsFile): Promise<void> {
    await writeAtomically(
      this.credentialsPath,
      await this.vault.encrypt(JSON.stringify(credentials))
    )
  }

  private writeTemplates(templates: Template[]): Promise<void> {
    return writeAtomically(this.templatesPath, `${JSON.stringify(templates, null, 2)}\n`)
  }
}
