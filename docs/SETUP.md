# Setup

What each person sets up once before working on the project. Where each kind of work happens is in [ENVIRONMENTS.md](ENVIRONMENTS.md#where-work-happens).

## 1. Node.js on the host

Install the Node.js version in `.node-version` at the repo root. CI reads it from there. `app/package.json`'s `engines` field and the Linux container's Dockerfile match it, and `app/scripts/node-version.test.mjs` checks both. npm refuses to install the app's dependencies with any other version (`engine-strict` in `app/.npmrc`).

Then install the dependencies by running `npm ci` in `app/`. Downloads are cached in `.cache/` in the repo (see [ENVIRONMENTS.md](ENVIRONMENTS.md#caches)). The npm scripts work in any shell, including PowerShell, cmd and Git Bash on Windows.

## 2. Docker, for the Linux container and actionlint

The Linux container is for checking the Linux build from a Windows machine (see [ENVIRONMENTS.md](ENVIRONMENTS.md#linux-container)). `npm run actionlint` also runs in Docker.

- **Windows:** Docker Desktop with the WSL 2 backend. The app's window shows through WSLg, which comes with Windows 11. Start the container with `docker compose up -d linux`, then install its dependencies with `docker compose exec linux bash -c "cd app && npm ci"`.
- **Linux:** check the Linux build directly on the host. The container is optional. To use it anyway, install Docker Engine with the Compose plugin and set the host variables from [ENVIRONMENTS.md](ENVIRONMENTS.md#host-settings) for the display and your user ID. Your X server may also need to let the container connect, for example with `xhost +SI:localuser:$(id -un)`.

## 3. Git

Commits and pushes happen on the host. You need:

- git with your name and email set.
- An SSH key added to your GitHub account, for pushing.
- Commit signing, because both protected branches accept only signed commits:
  - Set git to sign every commit, for example with your SSH key (`gpg.format ssh`, `user.signingkey`, `commit.gpgsign true`).
  - Add the same public key on GitHub a second time, with **Key type: Signing Key**.
  - On Windows, if the key lives in the Windows OpenSSH agent, also point `gpg.ssh.program` at `C:/Windows/System32/OpenSSH/ssh-keygen.exe`.

## 4. Claude Code

Start Claude Code at the repo root. The deny rules in `.claude/settings.json` (see [SECURITY.md](SECURITY.md#secrets)) use relative paths, which resolve from the folder Claude Code starts in, so started in `app/` they don't cover the env files at the repo root. To keep them covered wherever it starts, add the same rules with absolute paths to the gitignored `.claude/settings.local.json`, written as `//` plus the path with forward slashes, for example `Read(//c/src/aws-s3-desktop/.env.staging)` for a repo at `C:\src\aws-s3-desktop`. The drive letter's case doesn't matter.

The GitHub MCP server is optional. Create a fine-grained token with access to this repo only, with Contents, Pull requests and Metadata set to Read. Put it in `.env.staging` as `GITHUB_MCP_PAT=<token>` (see [ENVIRONMENTS.md](ENVIRONMENTS.md#env-files)).

## 5. Windows installer checks

Checking the Windows installer needs a Windows machine (see [PACKAGING.md](PACKAGING.md)).
