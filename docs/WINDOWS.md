# Windows development

Use this guide from the repository root: the folder containing `package.json` and
`run.cmd`. The launcher starts the existing Electron application and provides the same
verification commands used by the development workflow.

## Prerequisites

| Requirement | Setup |
| --- | --- |
| Windows | Windows 10 or 11, x64, as supported by the application. |
| Node.js | Install Node.js 24 from [nodejs.org](https://nodejs.org/en/download). The repository accepts Node.js 24 or newer; CI uses 24. |
| Git | Install [Git for Windows](https://git-scm.com/downloads/win), including Git Bash. |
| pnpm | Use the version recorded in `package.json`: `11.25.0`. |
| OpenSSL | Required by the local HTTPS test fixtures. Git for Windows includes an OpenSSL executable; the launcher can make an existing copy available to its verification child processes. |

The launcher reports missing prerequisites. It does not install Node.js, Git, pnpm, or
OpenSSL, and it does not change system PATH or PowerShell execution policy.

In PowerShell, check Node.js and Git, then install the pinned pnpm version:

```powershell
node --version
git --version
npm.cmd install -g pnpm@11.25.0
```

`npm.cmd` invokes the Windows command wrapper directly, avoiding reliance on the PowerShell
`npm.ps1` shim. Open a new terminal after installing system prerequisites if the existing
terminal cannot find them.

## Set up and launch

From the repository root:

```powershell
.\run.cmd setup
.\run.cmd verify
.\run.cmd dev
```

`setup` installs dependencies from the committed lockfile. `verify` runs TypeScript checks,
unit tests, and the production build in order, stopping when a command fails. `dev` opens
the application with development reload. Close the application or press Ctrl+C in the
terminal when finished.

Running `.\run.cmd` without a task also starts development mode. If dependencies are
missing, tasks that need them perform the frozen installation first.

## Launcher commands

| Command | Result |
| --- | --- |
| `.\run.cmd doctor` | Reports the Node.js, pnpm, OpenSSL, and dependency checks. Missing items can produce a nonzero exit status. |
| `.\run.cmd setup` | Runs `pnpm install --frozen-lockfile`. |
| `.\run.cmd dev` | Ensures dependencies are present and runs `pnpm dev`. This is the default task. |
| `.\run.cmd verify` | Ensures dependencies are present and runs `pnpm verify`: typecheck, unit tests, then build. |
| `.\run.cmd build` | Creates the production application files in `out/`. |
| `.\run.cmd package` | On Windows x64, runs typecheck and unit tests, then `pnpm dist:win` to create the NSIS installer. |

The equivalent command from a terminal with Node.js available is
`node scripts/workspace.mjs TASK`, for example:

```powershell
node scripts/workspace.mjs doctor
node scripts/workspace.mjs verify
```

### Development, build, and installer

Use **dev** while changing the application. Use **build** to check the production bundles;
the files in `out/` are not an installer. Use **package** when you need the Windows x64
installer. It is written beneath `release/`, in the directory named for the version in
`package.json`, with a filename such as `Meshwork-0.5.22-setup-x64.exe`.

The baseline does not configure Windows code signing. Packaging uses the existing
`--publish never` setting and does not upload a release.

## What verification covers

`pnpm verify` runs the existing TypeScript checks, Vitest suite, and Electron/Vite build.
Some unit tests start short-lived HTTP, HTTPS, TCP, or UDP fixtures on loopback; OpenSSL
creates a temporary certificate for the HTTPS tests. The commands do not start the
application's Discover scan.

The GitHub Actions definition in [verify.yml](../.github/workflows/verify.yml) runs these
checks separately on Windows and macOS with Node.js 24. A workflow definition is not a
passing run: check the results for the actual commit in the repository's Actions tab.

`pnpm test:e2e` is a separate, optional Playwright suite. Its existing application test
scans the local subnet. It is **not included** in `verify`, `package`, or this CI workflow;
use it only for work that includes testing a scan of that network.

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| `node` is not found or its version is too old | Install Node.js 24, open a new terminal, and run `.\run.cmd doctor`. |
| pnpm is missing or the version is rejected | Run `npm.cmd install -g pnpm@11.25.0`, then rerun the task. |
| PowerShell reports that `pnpm.ps1` cannot run | Use `.\run.cmd` for the documented tasks, or invoke `pnpm.cmd` directly. No execution-policy change is needed. |
| Verification cannot find OpenSSL | Confirm Git for Windows is installed. Run `.\run.cmd doctor`; if its copy is not detected, open Git Bash in the repository and run `openssl version`, then `node scripts/workspace.mjs verify`. An independently installed OpenSSL on PATH also works. |
| Frozen installation reports a lockfile mismatch | Restore matching `package.json` and `pnpm-lock.yaml` revisions. For an intentional dependency change, update and review the lockfile using the pinned pnpm version. |
| Dependency or Electron downloads fail | Check the terminal's network/proxy access, then rerun `.\run.cmd setup`. Keep the lockfile intact. |
| Build succeeds but no installer appears | Run `.\run.cmd package`; `build` writes bundles to `out/`. |

## Before distributing a modified application

The existing branding, application ID, and update service still belong to the upstream
project. Before distributing a modified build, choose the fork's name, logo, and
application ID, and review both update-feed locations:

- [`src/main/updates.ts`](../src/main/updates.ts): the installed application's update URL.
- [`electron-builder.config.cjs`](../electron-builder.config.cjs): generated update manifests.

Both currently reference `https://meshwork.influxnetwork.com/updates`. A fork needs its own
release/update policy. Follow the project's [licence information](../README.md#licence)
and preserve the required notices.

This development baseline adds setup and verification support. Feature scope remains in
the [README](../README.md) and [roadmap](../ROADMAP.md): SNMPv3 and continuous monitoring are
not implemented by this work.
