# MouseBucket

A desktop app for Linux and Windows for uploading files to Amazon S3 and downloading files from it, with your own IAM keys. There's no account and no backend: the app talks to S3 directly, and your keys stay on your computer, encrypted by the operating system.

Save an S3 location and its keys as a template once, then pick the template to upload files to its folder, or to browse its bucket and download a file.

- Set up: [docs/SETUP.md](docs/SETUP.md)
- How the project works: [docs/](docs/), starting with [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md)
- License: MIT ([LICENSE](LICENSE))
