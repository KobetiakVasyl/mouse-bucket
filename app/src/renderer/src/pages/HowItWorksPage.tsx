// The How it works page: what MouseBucket is, how each part of it works, and how to set up each platform. See
// docs/UI.md.
import { UPLOAD_CHECKSUM } from '../../../shared/constants/storage-constants'
import { BETA_LABEL } from '../constants/platform-constants'
import { Card } from '../theme/components/Card'
import { PageLayout } from '../theme/components/PageLayout'
import { CloudShellSetup } from '../theme/compositions/CloudShellSetup'
import { PolicyExample } from '../theme/compositions/PolicyExample'

export function HowItWorksPage(): React.JSX.Element {
  return (
    <PageLayout
      title="How it works"
      description={
        <>
          MouseBucket uploads files from this computer to Amazon S3, Azure Blob Storage or Google
          Drive, and downloads files from them, with your own keys. There&apos;s no account to sign
          up for and no server in between: the app talks to each platform directly.
        </>
      }
    >
      <div className="space-y-6">
        <Card title="Templates">
          <p>
            A template is a named place in the cloud plus the keys that reach it. You add it once on
            the Templates page, then pick it by name whenever you upload or download.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Platforms:</strong> Amazon S3, Azure Blob Storage and Google Drive. Azure and
              Google Drive are in beta: they work, but haven&apos;t been used for as long as S3.
            </li>
            <li>
              <strong>Upload templates</strong> point at a folder, such as s3://my-bucket/reports/.
              Files you upload land in that folder.
            </li>
            <li>
              <strong>Download templates</strong> point at a whole bucket or container, which you
              browse folder by folder, or at any Google Drive folder.
            </li>
            <li>
              A new template can use the keys you typed in, or copy the keys of a template you
              already have on the same platform.
            </li>
          </ul>
        </Card>

        <Card title="Uploading">
          <p>
            Pick an upload template, then choose files or a folder, or drop them on the Upload page.
            They upload in the background, three at a time. Each file keeps its name in the folder,
            and a folder keeps its name and the paths inside it.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Amazon S3: Glacier Deep Archive, S3&apos;s cheapest storage class, for files you
              rarely need back, or Standard, for files you want to download at once. Each file is
              checked with {UPLOAD_CHECKSUM}, stored with the bucket&apos;s default encryption, and
              replaces a file with the same name.
            </li>
            <li>
              Azure Blob Storage: the Archive, Cold, Cool or Hot access tier. Each block is checked
              with MD5, and the blob replaces one with the same name.
            </li>
            <li>
              Google Drive: the file&apos;s MD5 is compared once it arrives. Drive keeps files with
              the same name side by side, and folders on the way are made when missing.
            </li>
            <li>
              Uploads start with the storage class and access tier chosen in Settings, and the
              Upload page can change them for each upload.
            </li>
            <li>
              Large files are sent in parts, and a stopped upload continues with what&apos;s
              missing. A cancelled upload leaves nothing behind on S3; on Azure, the parts already
              sent are thrown away within a week.
            </li>
          </ul>
        </Card>

        <Card title="Downloading and restoring">
          <p>
            Pick a download template and open folders to find a file. The list shows each
            file&apos;s size, date and, on S3 and Azure, its storage class or access tier. Download
            saves the file in the download folder from Settings.
          </p>
          <p>
            Archived files need a restore before they can be downloaded, and each platform charges
            for it:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Amazon S3, for Glacier Deep Archive and Glacier Flexible Retrieval: a temporary copy,
              which stays for the number of days you choose. Standard is usually ready within 12
              hours for Deep Archive; Bulk is cheaper, and usually ready within 48 hours.
            </li>
            <li>
              Azure, for the Archive tier: the blob moves into the Hot, Cool or Cold tier and stays
              there. Standard priority takes up to 15 hours; High is faster, and costs more.
            </li>
            <li>
              Google Drive has nothing to restore. Google Docs, Sheets and Slides files can&apos;t
              be downloaded yet.
            </li>
          </ul>
          <p>
            A download is saved under a temporary name until it&apos;s complete, so a stopped
            download never leaves half a file in place of yours, and continues from where it
            stopped.
          </p>
        </Card>

        <Card title="Deleting">
          <p>
            Delete, in red, asks you to confirm first. On S3 and Azure, the app can&apos;t bring the
            file back; a bucket with versioning on keeps the older versions, and a storage account
            with soft delete on keeps the file for its retention days. On Google Drive, the file
            goes to the trash, where it stays for 30 days.
          </p>
          <p>
            Deleting a template removes it and its keys from this computer. Nothing in the cloud
            changes.
          </p>
        </Card>

        <Card title="While files transfer">
          <ul className="list-disc space-y-1 pl-6">
            <li>The computer doesn&apos;t go to sleep, though the screen may still turn off.</li>
            <li>Transfers keep going while the window is minimized.</li>
            <li>
              A transfer that loses the connection tries again by itself and continues from where it
              stopped. Pause, Resume and Retry do the same at your choice.
            </li>
            <li>
              Closing the window quits the app, so it asks first while transfers are running.
              Quitting pauses them, and they&apos;re back, paused, the next time the app starts.
            </li>
            <li>Cancel stops a transfer and deletes what it moved so far.</li>
          </ul>
        </Card>

        <Card title="Your keys">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              Keys are encrypted by the operating system before they&apos;re saved, and stay on this
              computer, in the app&apos;s data folder: S3&apos;s access keys, Azure&apos;s account
              keys, and Google&apos;s OAuth client with the sign-in it gave.
            </li>
            <li>
              Once saved, a key is never shown again, not even when it&apos;s copied to a new
              template.
            </li>
            <li>
              Keys only ever go to the platform they&apos;re for. Apart from the platforms, the app
              contacts only GitHub, and only when you check for updates from the side menu.
            </li>
          </ul>
        </Card>

        <Card title="Amazon S3: an IAM user">
          <p>
            The quickest way to keys is an IAM user made with AWS CloudShell, which can read and
            write every bucket in the account:
          </p>
          <CloudShellSetup />
          <p>
            For keys that reach only one bucket, give an IAM user one of these policies instead,
            with BUCKET and FOLDER replaced by yours:
          </p>
          <PolicyExample kind="upload" />
          <PolicyExample kind="download" />
        </Card>

        <Card title="Azure Blob Storage" badge={BETA_LABEL}>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              In the Azure portal, open the storage account, then Security + networking, then Access
              keys, and copy key1 or key2.
            </li>
            <li>
              The location is the container&apos;s URL, such as
              https://myaccount.blob.core.windows.net/backups/, with a folder after it for an upload
              template.
            </li>
          </ol>
          <p>
            An account key reaches the whole storage account, so keep it to this computer. Turning
            it over in the portal makes the old one stop working; edit the template to enter the new
            one.
          </p>
        </Card>

        <Card title="Google Drive" badge={BETA_LABEL}>
          <p>
            Google Drive needs no keys, but a sign-in through an OAuth client of your own, made once
            in Google Cloud:
          </p>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              In the Google Cloud console, create a project, and enable the Google Drive API in it.
            </li>
            <li>
              Set up its Google Auth Platform: an external app with your email address. Under
              Audience, publish the app, so a sign-in doesn&apos;t expire after a week. It stays
              unverified, which is fine for your own use.
            </li>
            <li>
              Under Clients, create an OAuth client of the Desktop app type, and copy its client ID
              and client secret into the template.
            </li>
            <li>
              Adding the template opens Google&apos;s sign-in page in your browser. Sign in with the
              account whose Drive it is. Google warns that it hasn&apos;t verified the app; choose
              Advanced, continue, and allow access to Google Drive.
            </li>
          </ol>
          <p>
            The location is a folder&apos;s link from Google Drive, or My Drive for all of it. Only
            Google sees the sign-in: your browser sends it straight back to the app on this
            computer.
          </p>
        </Card>
      </div>
    </PageLayout>
  )
}
