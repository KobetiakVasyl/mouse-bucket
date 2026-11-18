// The keys a template's platform takes when typed in: S3's access key pair, with the way to make an IAM user in
// CloudShell, an Azure storage account key, or the user's own Google OAuth client, which signs in through the browser.
// See docs/UI.md.
import { type ChangeEvent, useState } from 'react'
import type { TemplateFormTextField, TemplateFormValues } from '../../types/template-form-types'
import { Field } from '../components/Field'
import { LinkButton } from '../components/LinkButton'
import { INPUT_CLASS } from '../styles/style-constants'
import { CloudShellSetup } from './CloudShellSetup'

export function TemplateKeyFields({
  form,
  onChange
}: {
  form: TemplateFormValues
  onChange: (field: TemplateFormTextField) => (event: ChangeEvent<HTMLInputElement>) => void
}): React.JSX.Element {
  const [settingUp, setSettingUp] = useState(false)
  if (form.platform === 's3') {
    return (
      <>
        <div>
          <LinkButton onClick={() => setSettingUp((open) => !open)}>
            {settingUp
              ? 'Hide the IAM user setup'
              : 'No keys yet? Make an IAM user with AWS CloudShell'}
          </LinkButton>
          {settingUp && (
            <div className="mt-3 rounded-xl border border-line bg-surface p-4">
              <CloudShellSetup />
            </div>
          )}
        </div>
        <Field label="Access key ID">
          <input
            className={INPUT_CLASS}
            value={form.accessKeyId}
            onChange={onChange('accessKeyId')}
            autoComplete="off"
            spellCheck={false}
            required
          />
        </Field>
        <Field label="Secret access key">
          <input
            className={INPUT_CLASS}
            type="password"
            value={form.secretAccessKey}
            onChange={onChange('secretAccessKey')}
            autoComplete="off"
            required
          />
        </Field>
      </>
    )
  }
  if (form.platform === 'azure') {
    return (
      <Field
        label="Account key"
        hint="In the Azure portal, open the storage account, then Security + networking, then Access keys."
      >
        <input
          className={INPUT_CLASS}
          type="password"
          value={form.accountKey}
          onChange={onChange('accountKey')}
          autoComplete="off"
          required
        />
      </Field>
    )
  }
  return (
    <>
      <Field
        label="OAuth client ID"
        hint="From the desktop app OAuth client in your own Google Cloud project. How it works lists the steps."
      >
        <input
          className={INPUT_CLASS}
          value={form.clientId}
          onChange={onChange('clientId')}
          autoComplete="off"
          spellCheck={false}
          required
        />
      </Field>
      <Field label="Client secret">
        <input
          className={INPUT_CLASS}
          type="password"
          value={form.clientSecret}
          onChange={onChange('clientSecret')}
          autoComplete="off"
          required
        />
      </Field>
      <p className="text-sm text-muted">
        Saving opens Google&apos;s sign-in page in your browser. Sign in with the account whose
        Drive this is, and allow access to it.
      </p>
    </>
  )
}
