// The How it works page: what MouseBucket is and how each part of it works. See docs/UI.md.
import type { ReactNode } from 'react'
import { storageClassLabel, UPLOAD_CHECKSUM, UPLOAD_STORAGE_CLASS } from '../../../shared/storage'
import { PageHeading } from '../components/ui'
import { PERMISSIONS } from '../permissions'

function Section({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="rounded-xl border border-line bg-surface p-6">
      <h2 className="mb-3 text-xl font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Policy({ title, text }: { title: string; text: string }): React.JSX.Element {
  return (
    <div>
      <h3 className="mb-1 font-semibold">{title}</h3>
      <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-4 text-sm select-all">
        {text}
      </pre>
    </div>
  )
}

export function HowItWorksPage(): React.JSX.Element {
  return (
    <>
      <PageHeading title="How it works">
        MouseBucket uploads files from this computer to Amazon S3, and downloads files from it, with
        your own IAM user&apos;s keys. There&apos;s no account to sign up for and no server in
        between: the app talks to AWS directly.
      </PageHeading>

      <div className="max-w-4xl space-y-6">
        <Section title="Templates">
          <p>
            A template is a named S3 location plus the IAM keys that reach it. You add it once on
            the Templates page, then pick it by name whenever you upload or download.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Upload templates</strong> point at a folder, such as s3://my-bucket/reports/.
              Files you upload land in that folder.
            </li>
            <li>
              <strong>Download templates</strong> point at a whole bucket, such as s3://my-bucket,
              which you browse folder by folder.
            </li>
            <li>The bucket&apos;s region is found automatically when you add a template.</li>
            <li>
              A new template can use the keys you typed in, or copy the keys of a template you
              already have.
            </li>
          </ul>
        </Section>

        <Section title="Uploading">
          <p>
            Pick an upload template, choose files with &ldquo;Choose files…&rdquo;, and they upload
            in the background, three at a time. Each file keeps its name in the folder, and a file
            with the same name there is replaced.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Storage class: {storageClassLabel(UPLOAD_STORAGE_CLASS)}, S3&apos;s cheapest, for
              files you rarely need back.
            </li>
            <li>
              Checksum: {UPLOAD_CHECKSUM}. S3 checks it on arrival, so a file that changed on the
              way is rejected.
            </li>
            <li>Encryption: the bucket&apos;s default encryption.</li>
            <li>Versioning: whatever the bucket is set to. The app never changes it.</li>
            <li>Large files are sent in parts, and a cancelled upload leaves nothing behind.</li>
          </ul>
        </Section>

        <Section title="Downloading and restoring">
          <p>
            Pick a download template and open folders to find a file. The list shows each
            file&apos;s size, storage class and date. Download asks where to save the file.
          </p>
          <p>
            Files in Glacier Deep Archive or Glacier Flexible Retrieval are archived, so they need a
            restore before they can be downloaded. Restore asks S3 for a temporary copy:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Standard: usually ready within 12 hours for Deep Archive.</li>
            <li>Bulk: cheaper, usually ready within 48 hours for Deep Archive.</li>
            <li>
              The copy stays for the number of days you choose. AWS charges for each restore, and
              for the copy while it stays.
            </li>
          </ul>
          <p>
            Once the list shows the file as restored, Download works as usual. A download is saved
            under a temporary name until it&apos;s complete, so a failed download never leaves half
            a file in place of yours.
          </p>
        </Section>

        <Section title="Deleting">
          <p>
            Delete, in red, removes a file from the bucket after you confirm it. The app can&apos;t
            bring it back. On a bucket with versioning on, S3 keeps the older versions.
          </p>
          <p>
            Deleting a template removes it and its keys from this computer. The bucket is untouched.
          </p>
        </Section>

        <Section title="While files transfer">
          <ul className="list-disc space-y-1 pl-6">
            <li>The computer doesn&apos;t go to sleep, though the screen may still turn off.</li>
            <li>Transfers keep going while the window is minimized.</li>
            <li>Closing the window quits the app, so it asks first while transfers are running.</li>
            <li>The transfers list shows everything since the app started.</li>
          </ul>
        </Section>

        <Section title="Your keys">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Keys are encrypted by the operating system before they&apos;re saved, and stay on this
              computer, in the app&apos;s data folder.
            </li>
            <li>
              Once saved, a key is never shown again, not even when it&apos;s copied to a new
              template.
            </li>
            <li>
              Keys only ever go to AWS, as the signatures on each request. The app sends nothing
              anywhere else.
            </li>
          </ul>
        </Section>

        <Section title="IAM permissions">
          <p>
            Give each IAM user only what its templates need. Replace BUCKET and FOLDER with yours.
          </p>
          <Policy
            title={`Upload templates: ${PERMISSIONS.upload.summary}`}
            text={PERMISSIONS.upload.policy}
          />
          <Policy
            title={`Download templates: ${PERMISSIONS.download.summary}`}
            text={PERMISSIONS.download.policy}
          />
        </Section>
      </div>
    </>
  )
}
