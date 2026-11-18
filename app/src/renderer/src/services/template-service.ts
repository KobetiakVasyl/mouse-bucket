// Lists, adds and deletes templates in main, which keeps their keys. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type { NewTemplate, Template } from '../../../shared/types/template-types'

export class TemplateService {
  constructor(
    private readonly api: Pick<Api, 'listTemplates' | 'createTemplate' | 'deleteTemplate'>
  ) {}

  list(): Promise<Template[]> {
    return this.api.listTemplates()
  }

  create(template: NewTemplate): Promise<Template> {
    return this.api.createTemplate(template)
  }

  delete(id: string): Promise<void> {
    return this.api.deleteTemplate(id)
  }
}

export const templateService = new TemplateService(window.api)
