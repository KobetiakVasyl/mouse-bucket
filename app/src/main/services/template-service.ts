// Adds, changes, lists and deletes templates: where they point in templates.json, their keys encrypted in
// credentials.bin. See docs/SECURITY.md.
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { StorageLocation } from '../../shared/types/location-types'
import type {
  NewTemplate,
  Platform,
  Template,
  TemplateEdit,
  TemplateKind
} from '../../shared/types/template-types'
import { kindProblem, parseLocation } from '../../shared/validation/location-validation'
import { DATA_FILES } from '../constants/data-file-constants'
import { NO_ENCRYPTION_MESSAGE } from '../constants/error-constants'
import type { Credentials, CredentialsFile, StorageAccess } from '../types/credential-types'
import type { Decrypted, KeyVault } from '../types/key-vault-types'
import type { TemplateDetails } from '../types/storage-service-types'
import { UserError } from '../utils/error-utils'
import {
  parseJson,
  readIfExists,
  serialize,
  toJsonFile,
  writeAtomically
} from '../utils/file-utils'
import { accessFor, keptTarget, placeOf } from '../utils/storage-utils'
import { CredentialsFileSchema, TemplatesFileSchema } from '../validation/data-file-validation'
import type { GoogleSignInService } from './google-sign-in-service'
import type { StorageService } from './storage-service'

export class TemplateService {
  private readonly templatesPath: string
  private readonly credentialsPath: string
  private readonly serial = serialize()

  constructor(
    dataDir: string,
    private readonly vault: KeyVault,
    private readonly storage: Pick<StorageService, 'resolve'>,
    private readonly google: Pick<GoogleSignInService, 'signIn'>
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

  // Everything a platform's calls need to reach the template's location.
  async accessFor(template: Template): Promise<StorageAccess> {
    return accessFor(placeOf(template), await this.credentialsFor(template.id))
  }

  // Checks the location, takes the keys as typed, signed in for, or copied from another template, and checks with the
  // platform that they reach it.
  async add(input: NewTemplate): Promise<Template> {
    if (!(await this.vault.available())) throw new UserError(NO_ENCRYPTION_MESSAGE)
    const location = this.locationOf(input)
    const credentials = await this.keysOf(input.platform, input.keys, location)
    const target = await this.storage.resolve(location, credentials)
    return this.save(null, { name: input.name, kind: input.kind, ...target }, credentials)
  }

  // Changes a template, which may keep its keys on the same platform. The platform is asked again only when the bucket,
  // container, Drive folder or keys changed, and OS encryption is needed only for new keys, so renaming works anywhere.
  async update(edit: TemplateEdit): Promise<Template> {
    const current = await this.get(edit.id)
    const location = this.locationOf(edit)
    let credentials: Credentials | null = null
    if (edit.keys.source === 'kept') {
      if (edit.platform !== current.platform) {
        throw new UserError('Enter keys for the new platform, or copy them from a template.')
      }
    } else {
      if (!(await this.vault.available())) throw new UserError(NO_ENCRYPTION_MESSAGE)
      credentials = await this.keysOf(edit.platform, edit.keys, location)
    }
    const kept = credentials === null ? keptTarget(current, location) : null
    const target =
      kept ??
      (await this.storage.resolve(
        location,
        credentials === null ? await this.credentialsFor(edit.id) : credentials
      ))
    return this.save(edit.id, { name: edit.name, kind: edit.kind, ...target }, credentials)
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

  // A download template points at a whole bucket or container, or any Drive folder; an upload template at any folder.
  private locationOf(details: {
    platform: Platform
    kind: TemplateKind
    location: string
  }): StorageLocation {
    const parsed = parseLocation(details.platform, details.location)
    if ('error' in parsed) throw new UserError(parsed.error)
    const problem = kindProblem(parsed.location, details.kind)
    if (problem !== null) throw new UserError(problem)
    return parsed.location
  }

  // Typed-in Google keys are the user's own OAuth client, which signs in through the browser for a refresh token.
  // Copied keys stay in main: the page only names the template to copy them from, which must be on the same platform,
  // and on Azure for the same storage account.
  private async keysOf(
    platform: Platform,
    keys: NewTemplate['keys'],
    location: StorageLocation
  ): Promise<Credentials> {
    if (keys.source === 'entered') {
      const { secrets } = keys
      if (secrets.platform === 's3') {
        const { accessKeyId, secretAccessKey } = secrets
        return { platform: 's3', accessKeyId, secretAccessKey }
      }
      if (secrets.platform === 'azure') {
        return { platform: 'azure', accountKey: secrets.accountKey }
      }
      const { clientId, clientSecret } = secrets
      const refreshToken = await this.google.signIn(clientId, clientSecret)
      return { platform: 'google-drive', clientId, clientSecret, refreshToken }
    }
    const credentials = await this.credentialsFor(keys.templateId)
    if (credentials.platform !== platform) {
      throw new UserError("That template's keys are for another platform.")
    }
    const source = await this.get(keys.templateId)
    if (source.platform === 'azure' && location.platform === 'azure') {
      if (source.account !== location.account) {
        throw new UserError(`Those keys are for the storage account "${source.account}".`)
      }
    }
    return credentials
  }

  // Saves a new template (id null) or replaces one, with new keys or, for a changed one, its own (credentials null).
  // Names are unique, ignoring case.
  private save(
    id: string | null,
    details: TemplateDetails,
    credentials: Credentials | null
  ): Promise<Template> {
    return this.serial(async () => {
      if (credentials !== null && !(await this.vault.available())) {
        throw new UserError(NO_ENCRYPTION_MESSAGE)
      }
      const templates = await this.list()
      if (id !== null && !templates.some((template) => template.id === id)) {
        throw new UserError('That template no longer exists.')
      }
      const name = details.name.toLocaleLowerCase()
      const taken = templates.some(
        (template) => template.id !== id && template.name.toLocaleLowerCase() === name
      )
      if (taken) throw new UserError(`A template named "${details.name}" already exists.`)
      const template: Template = { id: id === null ? randomUUID() : id, ...details }
      if (credentials !== null) {
        await this.writeCredentials({
          ...(await this.readCredentials()),
          [template.id]: credentials
        })
      }
      await this.writeTemplates(
        id === null
          ? [...templates, template]
          : templates.map((existing) => (existing.id === id ? template : existing))
      )
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
