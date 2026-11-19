# Working on Meshwork

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the relevant source before changing behavior.
Keep work focused on the requested feature or defect. Preserve unrelated edits and avoid
reformatting files that do not need to change.

## Project purpose and boundaries

Meshwork is an Electron desktop application for network discovery, local inventory,
topology, diagnostics, and Wi-Fi survey. The supported application platforms are Windows
and macOS. A successful Linux build or unit-test run does not verify native application
behavior on either supported platform.

Treat [README.md](README.md) and [ROADMAP.md](ROADMAP.md) as the description of implemented
and planned capabilities. Do not describe SNMPv3, continuous monitoring, or other roadmap
items as completed without implementing and verifying them. Device classification and
some topology relationships are inferred from network evidence; preserve the distinction
between observed and inferred data in the model, UI, and exports.

## Architecture

| Location | Responsibility |
| --- | --- |
| `src/main/` | Electron lifecycle, IPC, SQLite inventory, SNMP, diagnostics, Wi-Fi, update checks, vendor data, and PDF output. |
| `src/scanner/` | Discovery, liveness/port probes, name resolution, and device-identification collectors in a utility process. |
| `src/preload/` | Typed bridge exposed to the renderer as `window.api`. |
| `src/renderer/` | React application views and styles; map UI and map-model logic. |
| `src/shared/` | Shared types and pure logic: fingerprints, device/gear models, reports, topology checks, and release notes. |
| `src/shared/fingerprint/rules/` | JSON device-identification rules. Each rule needs a matching rule test. |
| `native/macos/` | Swift Wi-Fi helper and C helpers used by the Mac App Store build. |
| `scripts/` | Development launcher, licence collection, build/packaging helpers, and fictional demo data. |
| `tests/` | Vitest tests, including loopback fixtures. `tests/e2e/` contains the separate Playwright suite. |
| `resources/`, `build/` | Bundled vendor/licence data and packaging assets. |

Keep network and filesystem operations behind the main-process/preload boundary or in the
scanner utility process. Preserve renderer context isolation, sandboxing, and disabled
Node integration. Validate data at IPC boundaries; TypeScript types do not validate
runtime input. Prefer pure functions for parsing, classification, and topology rules so
their behavior can be checked independently of Electron and real equipment.

SNMP currently uses read-only v2c operations. Preserve read-only behavior unless the task
explicitly includes device configuration. Protect stored communities with the existing
OS-backed encryption and do not expose decrypted secrets to the renderer or logs.

## Toolchain and commands

Use Node.js 24 for parity with CI. `package.json` pins `pnpm@11.25.0`; the engine range
accepts pnpm 11.25.0 or newer within major version 11. Keep dependency installation frozen
for routine work. For intentional dependency changes, use the pinned pnpm version and
review both manifest and lockfile changes.

| Task | Command |
| --- | --- |
| Check local prerequisites | `node scripts/workspace.mjs doctor` |
| Install dependencies | `pnpm install --frozen-lockfile` |
| Start development | `pnpm dev` |
| Check types | `pnpm typecheck` |
| Run unit tests | `pnpm test` |
| Build production bundles | `pnpm build` |
| Run the baseline checks | `pnpm verify` |
| Windows launcher verification | `.\run.cmd verify` |
| Verify and create a Windows installer | `.\run.cmd package` |

See [docs/WINDOWS.md](docs/WINDOWS.md) for Windows setup and OpenSSL troubleshooting. The
launcher can expose an existing Git-for-Windows OpenSSL executable to its child processes;
it does not install system tools or change system PATH or execution policy.

On macOS, `pnpm build:native` builds the Wi-Fi helper needed to exercise that part of the
application. Normal typecheck, unit-test, and production-build verification does not need
to build the native helpers.

## Verification and network scope

Run checks that exercise the change. Follow CONTRIBUTING.md's requirement to run
`pnpm typecheck` and `pnpm test` before a pull request; use `pnpm verify` for the baseline
including a production build. A generated workflow or a test file's presence is not
evidence that it passed. Record the command, platform, and outcome, and identify skipped
or unavailable checks.

Use invented device data, private local-network ranges, documentation public-address
ranges, and fabricated MAC addresses as described in CONTRIBUTING.md. Do not commit real
network captures, user inventory databases, credentials, or private addresses obtained
from a user's environment. Loopback servers used by the unit tests are expected.

For OS-dependent behavior, supply deterministic fixtures for interfaces, gateways,
platform commands, and clocks as appropriate. Do not let an ordinary unit test derive its
expected result from the machine running it. Preserve existing coverage when fixing
platform-dependent fixtures.

Two suites can contact a real network:

- `pnpm test:e2e` includes a Playwright test that scans the local subnet. Keep it out of
  routine verification unless the task includes live-network scanning.
- `tests/sandbox-net.test.ts` enables live macOS helper tests when both
  `resources/bin/mac/meshwork-net` and `resources/bin/mac/meshwork-arp.node` exist. Those
  tests read the ARP table and probe the default gateway. A normal clean checkout skips
  them; account for their presence before running tests on a development machine.

Do not replace a failed check with a success stub or silently omit a required check.
Change scan limits, timeouts, cancellation, and resource bounds deliberately and verify
the relevant error paths.

## Changes and release boundaries

User-facing changes need release notes in `src/shared/release-notes.ts`, following
CONTRIBUTING.md and the release-note tests. Fingerprint-rule changes need corresponding
cases in `tests/fingerprint-rules.test.ts`. Preserve GPL and third-party licence notices.
For contributions proposed upstream, follow its issue-first and contributor-agreement
process; routine work in this fork should not silently create external issues or comments.

Packaging does not imply publishing. The existing distribution commands use
`--publish never`; keep release upload, signing, and publication separate from ordinary
development work. Before distributing a modified application, review its name, logo,
`appId`, and both upstream update-feed references in `src/main/updates.ts` and
`electron-builder.config.cjs`. Do not silently redirect the user's development build to a
different update service.

Report what changed, why it changed, the checks actually run, and any remaining platform
or equipment-dependent limitations. Do not claim to have tested a Windows/macOS installer,
a real switch, or a network scan from source inspection or a Linux build alone.
