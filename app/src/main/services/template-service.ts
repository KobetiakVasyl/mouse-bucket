// Adds, lists and deletes templates: their S3 location in templates.json, their IAM keys encrypted in credentials.bin. See docs/SECURITY.md.
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { WHOLE_BUCKET_MESSAGE } from '../../shared/constants/s3-location-constants'
import type { NewTemplate, Template, TemplateKind } from '../../shared/types/template-types'
import { parseS3Location } from '../../shared/validation/s3-location-validation'
import { DATA_FILES } from '../constants/data-file-constants'
import { NO_ENCRYPTION_MESSAGE } from '../constants/error-constants'
import type { BucketAccess, Credentials, CredentialsFile } from '../types/credential-types'
import type { Decrypted, KeyVault } from '../types/key-vault-types'
import { UserError } from '../utils/error-utils'
import {
  parseJson,
  readIfExists,
  serialize,
  toJsonFile,
  writeAtomically
} from '../utils/file-utils'
import { CredentialsFileSchema, TemplatesFileSchema } from '../validation/data-file-validation'
import type { S3Service } from './s3-service'

export class TemplateService {
  private readonly templatesPath: string
  private readonly credentialsPath: string
  private readonly serial = serialize()

  constructor(
    dataDir: string,
    private readonly vault: KeyVault,
    private readonly s3: Pick<S3Service, 'findRegion'>
  ) {
    this.templatesPath = join(dataDir, DATA_FILES.templates)
    this.credentialsPath = join(dataDir, DATA_FILES.credentials)
  }

  async list(): Promise<Template[]> {
    const raw = await readIfExists(this.templatesPath)
    if (raw === undefined) return []
    const parsed = TemplatesFileSchema.safeParse(parseJson(raw.toString('utf8')))
    if (!parsed.success) throw new UserError('The saved templates are damaged.')
    return parsed.data
  }

  async get(id: string): Promise<Template> {
    const template = (await this.list()).find((candidate) => candidate.id === id)
    if (template === undefined) throw new UserError('That template no longer exists.')
    return template
  }

  async getOfKind(id: string, kind: TemplateKind): Promise<Template> {
    const template = await this.get(id)
    if (template.kind !== kind) throw new UserError(`"${template.name}" isn't a ${kind} template.`)
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

  // Everything an S3 call needs to reach the template's bucket.
  async accessFor(template: Template): Promise<BucketAccess> {
    const credentials = await this.credentialsFor(template.id)
    return { bucket: template.bucket, region: template.region, credentials }
  }

  // Checks the location, takes the keys as typed or copied from another template, and asks S3 for the bucket's region.
  async add(input: NewTemplate): Promise<Template> {
    if (!(await this.vault.available())) throw new UserError(NO_ENCRYPTION_MESSAGE)
    const parsed = parseS3Location(input.location)
    if ('error' in parsed) throw new UserError(parsed.error)
    const { bucket, prefix } = parsed.location
    if (input.kind === 'download' && prefix !== '') {
      throw new UserError(WHOLE_BUCKET_MESSAGE)
    }
    // Copied keys stay in main: the page only names the template to copy them from.
    const credentials =
      input.keys.source === 'entered'
        ? { accessKeyId: input.keys.accessKeyId, secretAccessKey: input.keys.secretAccessKey }
        : await this.credentialsFor(input.keys.templateId)
    const region = await this.s3.findRegion(credentials, bucket)
    return this.save({ name: input.name, kind: input.kind, bucket, prefix, region }, credentials)
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

  // Names are unique, ignoring case.
  private save(details: Omit<Template, 'id'>, credentials: Credentials): Promise<Template> {
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
    const parsed = CredentialsFileSchema.safeParse(parseJson(decrypted.text))
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
    return writeAtomically(this.templatesPath, toJsonFile(templates))
  }
}
