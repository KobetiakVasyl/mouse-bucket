// Lists, adds, changes and deletes templates in main, which keeps their keys. See docs/ARCHITECTURE.md.
import type { Api } from '../../../shared/types/ipc-types'
import type { NewTemplate, Template, TemplateEdit } from '../../../shared/types/template-types'

export class TemplateService {
  constructor(
    private readonly api: Pick<
      Api,
      'listTemplates' | 'createTemplate' | 'updateTemplate' | 'deleteTemplate' | 'cancelSignIn'
    >
  ) {}

  list(): Promise<Template[]> {
    return this.api.listTemplates()
  }

  create(template: NewTemplate): Promise<Template> {
    return this.api.createTemplate(template)
  }

  update(edit: TemplateEdit): Promise<Template> {
    return this.api.updateTemplate(edit)
  }

  delete(id: string): Promise<void> {
    return this.api.deleteTemplate(id)
  }

  // Stops a Google sign-in that's waiting in the browser, so the template being added isn't saved.
  cancelSignIn(): Promise<void> {
    return this.api.cancelSignIn()
  }
}

export const templateService = new TemplateService(window.api)
