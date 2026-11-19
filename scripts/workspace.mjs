/** Development launcher. Installs only project dependencies; never starts a network scan. */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pnpmVersion = pkg.packageManager.replace(/^pnpm@/, '');
const task = process.argv[2] ?? 'dev';
const tasks = new Set(['doctor', 'setup', 'dev', 'verify', 'build', 'package']);
const isWindows = process.platform === 'win32';

function execute(command, args, capture = false) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    windowsHide: capture,
  });
  if (result.error) throw new Error(`Could not start ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = capture ? (result.stderr || result.stdout || '').trim() : '';
    throw new Error(`${command} ${args.join(' ')} failed (${result.signal ?? `exit ${result.status}`}).${detail ? `\n${detail}` : ''}`);
  }
  return (result.stdout ?? '').trim();
}

function pnpm(args, capture = false) {
  // Windows package-manager shims are .cmd files. All arguments here are fixed by this
  // launcher, never passed through from user input, so cmd.exe receives only known tokens.
  return isWindows
    ? execute(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], capture)
    : execute('pnpm', args, capture);
}

function checkTools() {
  if (Number(process.versions.node.split('.')[0]) < 24) {
    throw new Error(`Node.js 24 or later is required; found ${process.versions.node}.`);
  }
  let installed;
  try {
    installed = pnpm(['--version'], true);
  } catch {
    throw new Error(`pnpm ${pnpmVersion} is required. Run npm install -g pnpm@${pnpmVersion}, then reopen your terminal.`);
  }
  if (installed !== pnpmVersion) {
    throw new Error(`This checkout uses pnpm ${pnpmVersion}; found ${installed}. Run npm install -g pnpm@${pnpmVersion}.`);
  }
  console.log(`Node ${process.versions.node} | pnpm ${installed} | ${process.platform} ${process.arch}`);
}

function opensslVersion(command = 'openssl') {
  try {
    return execute(command, ['version'], true);
  } catch {
    return undefined;
  }
}

function requireOpenSsl() {
  let version = opensslVersion();
  if (!version && isWindows) {
    const candidates = [];
    // Git's installation can be outside Program Files. Its exec path identifies that root.
    try {
      const gitExec = execute('git', ['--exec-path'], true);
      candidates.push(resolve(gitExec, '../../..', 'usr', 'bin', 'openssl.exe'));
    } catch {
      // Other known install locations are checked below.
    }
    for (const base of [process.env.ProgramFiles, process.env.ProgramW6432]) {
      if (base) candidates.push(join(base, 'Git', 'usr', 'bin', 'openssl.exe'));
    }
    if (process.env.LOCALAPPDATA) {
      candidates.push(join(process.env.LOCALAPPDATA, 'Programs', 'Git', 'usr', 'bin', 'openssl.exe'));
    }
    for (const candidate of candidates) {
      if (!existsSync(candidate)) continue;
      version = opensslVersion(candidate);
      if (!version) continue;
      const pathKey = Object.keys(process.env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
      process.env[pathKey] = `${dirname(candidate)}${delimiter}${process.env[pathKey] ?? ''}`;
      console.log(`Using Git for Windows OpenSSL from ${dirname(candidate)} for this process.`);
      break;
    }
  }
  if (!version) {
    throw new Error('OpenSSL is required by the HTTPS unit-test fixtures. Install Git for Windows (which includes OpenSSL), run verification from Git Bash, or add an existing OpenSSL installation to this terminal\'s PATH.');
  }
  console.log(version);
}

function dependenciesInstalled() {
  return existsSync(join(root, 'node_modules', '.modules.yaml'))
    && existsSync(join(root, 'node_modules', '.bin', isWindows ? 'tsc.cmd' : 'tsc'));
}

function ensureDependencies() {
  if (!dependenciesInstalled()) {
    console.log('Installing the dependencies recorded in pnpm-lock.yaml...');
    pnpm(['install', '--frozen-lockfile']);
  }
}

function help() {
  console.log(`Meshwork development launcher

Windows: .\\run.cmd <task>
Other shells: node scripts/workspace.mjs <task>

  doctor   Check Node, pnpm, OpenSSL and installed dependencies
  setup    Install dependencies using the committed lockfile
  dev      Start the desktop application with hot reload (default)
  verify   Run TypeScript checks, unit tests and production build
  build    Create the application files in out/
  package  Check types and unit tests, then create a Windows x64 installer

The existing live-network Playwright suite is a separate pnpm test:e2e command.
See docs/WINDOWS.md for setup and the scope of verification.`);
}

try {
  if (process.argv.length > 3 || !tasks.has(task)) {
    help();
    if (process.argv.length > 3 || !['help', '--help', '-h'].includes(task)) process.exitCode = 1;
  } else {
    checkTools();
    switch (task) {
      case 'doctor':
        requireOpenSsl();
        if (!dependenciesInstalled()) throw new Error('Project dependencies are missing. Run the setup task first.');
        console.log('Development prerequisites are available. Use verify to check the source.');
        if (!['win32', 'darwin'].includes(process.platform)) {
          console.log('This host can check source and build assets; desktop support still targets Windows and macOS.');
        }
        break;
      case 'setup':
        pnpm(['install', '--frozen-lockfile']);
        break;
      case 'dev':
        if (!['win32', 'darwin'].includes(process.platform)) throw new Error('The desktop application supports Windows and macOS. Use verify for source checks on this host.');
        ensureDependencies();
        pnpm(['dev']);
        break;
      case 'verify':
        requireOpenSsl();
        ensureDependencies();
        pnpm(['verify']);
        break;
      case 'build':
        ensureDependencies();
        pnpm(['build']);
        break;
      case 'package':
        if (!isWindows || process.arch !== 'x64') throw new Error('The package task must run on Windows x64.');
        requireOpenSsl();
        ensureDependencies();
        pnpm(['typecheck']);
        pnpm(['test']);
        pnpm(['dist:win']);
        break;
    }
  }
} catch (error) {
  console.error(`\nMeshwork: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
