<p align="center">
  <img src="docs/logo.png" alt="Meshwork logo" width="128" height="128">
</p>

<h1 align="center">Meshwork</h1>

<p align="center">
  A desktop network toolkit for macOS and Windows, built for on-site work.<br>
  Scan a network, keep its inventory, see how it is wired, find what is wrong and hand over a report.
</p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-0.5.22-6366f1">
  <img alt="Platforms" src="https://img.shields.io/badge/platforms-macOS%20%7C%20Windows-334155">
  <img alt="Licence" src="https://img.shields.io/badge/licence-GPL--3.0-16a34a">
  <img alt="Status" src="https://img.shields.io/badge/status-pre--1.0-f59e0b">
</p>

<p align="center">
  <img src="docs/inventory.png" alt="Network Inventory of a fictional demo network, with a camera that has Telnet open" width="900">
</p>

## What it is

Meshwork is for technicians and network engineers who visit a site, work out what is there,
fix what is wrong and leave with documentation. It covers the first hours on an unfamiliar
network: what devices exist, how they are connected, which services are risky, and whether a
problem is the local network, DNS or the provider.

It runs entirely on your computer. There is no server to install and no account, and your scan
results are never uploaded.

### What it is not

Meshwork does **not** try to be a monitoring system or an enterprise network management
platform. It does not collect NetFlow, keep uptime history, send alerts, or change device
configuration. Everything it reads from switches and routers is **read-only** (SNMP v2c `get`
and `walk` only). Its map shows the physical and layer 2 picture (switch ports, LLDP, CDP, VLANs,
spanning tree) plus the routing facts needed to place networks behind a gateway. It does not
model VRFs, MPLS, overlays or tunnels yet. What is planned, and what is deliberately out of
scope, is in [ROADMAP.md](ROADMAP.md).

## Why it is open source

Meshwork started as the tool we wanted on our own site visits, and we are sharing it so anyone
can use it, read how it works and improve it. It is a first step, not a finished product.
Mapping networks is hard: every vendor implements the standards a little differently, and no tool
reads every network correctly. Meshwork tries to be honest about that. Links it cannot confirm
are drawn as assumed, guesses come with the evidence behind them, and what it does not do yet is
listed above and in the roadmap.

If it is useful to you, take it. If it gets something wrong on your equipment, an issue with the
evidence (see *Contributing*) is the best way to make it better. It will keep improving one
release at a time.

## What it does today (0.5.22)

### Discover

- Scan single IPs, ranges (`10.0.0.1-50`), CIDR blocks (`192.168.1.0/24`) or a mix. Your own
  subnet is suggested automatically.
- Finds devices without admin rights, using ping, TCP probes and the system's neighbour (ARP)
  table.
- Port profiles: devices only, common ports (about 110), all ports, or a custom list. Three
  speeds (cautious, balanced, aggressive), each explained. A full port scan fits its waits to
  each host, so a firewalled device does not hold up the others, and Stop ends it at once.
  Port scanning is TCP over IPv4.
- **Identify phase**: before a device is classified, Meshwork collects what it says about itself.
  This covers mDNS services, SSDP/UPnP descriptions and ONVIF probes on every local subnet, plus
  each device's web page title and `Server` header, TLS certificate names and SSH greeting.
  Replies are size-capped and time-limited, so one misbehaving device cannot stall the scan.
- **Fingerprint engine**: device type, operating system and confidence come from versioned rule
  sets stored as data (`src/shared/fingerprint/rules/`). Every device records which rules
  version classified it and the evidence behind the result.
- Names from reverse DNS, mDNS/Bonjour and NetBIOS. Manufacturer from the IEEE registry, bundled
  with the app and refreshed from the IEEE lists: about 58,000 assignments (MA-L, MA-M, MA-S) from
  about 34,000 vendors.
- IPv6: link-local, unique-local and global addresses from the neighbour table, joined to their
  device by MAC address.
- Risky services, flagged by open port, each with an explanation and a fix: Telnet (23), remote
  desktop (3389), VNC (5900/5901), FTP (21), common databases and caches (MySQL, PostgreSQL, SQL
  Server, Redis, MongoDB, Elasticsearch, Memcached), IPMI (TCP 623), TR-069 (7547), SMB (445),
  plain MQTT (1883), the Docker API on 2375, and network gear whose management page answers on
  HTTP only.

### Network Inventory

- Every scan is saved to its **network**. Networks you are connected to are told apart by the
  router's MAC address, so two sites that both use `192.168.1.0/24` stay separate. Remote
  networks are told apart by their range.
- Network cards with device counts, devices at risk and the last scan. Recent scans can be
  removed from the history without losing devices.
- Filter by risk, new devices or type. Full-text search by name, IP, MAC, vendor or port.
- A device counts as **new** only in the scan that first found it.
- **Copy details**: everything known about a device, including the identify evidence, as plain
  text for a ticket.
- CSV export in on-screen order.

### Map

The map is drawn automatically from scans and from switches and routers read over **SNMP v2c
(read-only)**. The community is stored encrypted with the operating system's key store.

- **Physical topology**: switch ports, LLDP and CDP neighbours (typed from their announced
  capabilities when the description is not recognised), MAC address tables (including the IEEE 802.1Q tables
  and MAC tables that number ports by position), ARP tables (with the `ipNetToPhysical`
  fallback), PoE, and port names such as `Gi1/0/43` or `1/1/28`.
- Every device placed on the switch port where it was learned, or behind the access point or
  unmanaged segment it sits on. A link that no switch has confirmed is drawn dashed as
  **assumed**, never presented as fact.
- **VLANs (802.1Q)**: names, access and tagged ports, also from the Cisco VLAN tables on switches
  that publish them only there. Cables take their VLAN's colour and trunks are striped with the
  VLANs they carry, labelled in switch notation (`U10` for an access port, `U1 T10,20,99` for a
  trunk). Router VLAN subinterfaces are shown on their cable and as VLAN chips on the router.
  Choosing a VLAN highlights the router, cables and devices that belong to it.
- Two cables between the same two devices are drawn separately. A link whose two ends disagree
  on native VLAN or duplex raises a warning on the map and a finding in the report.
- **Link bundles** (LACP or static) are drawn as one link, named with the ports it is made of.
  Switches cabled to two cores stand under both, with their cables kept apart.
- **Redundant gateways**: a router that holds a gateway address it shares with others (HSRP,
  VRRP, GLBP) says so on its card, with the protocol and whether it answers for it.
- **Switches that announce no neighbours** are placed from the addresses they learned, and a
  Wi-Fi extender that rewrites the addresses behind it is drawn under the access point it
  repeats, with its devices under it.
- **Loops and spanning tree**: port states are read over SNMP. Redundant cables are drawn dotted,
  with the port spanning tree blocks. A ring with no blocked port, or a switch that hears its own
  addresses on two ports, raises a warning with the ports to unplug.
- **Gateways and remote networks**: the gateway is worked out from the managed devices' default
  routes and forwarding, so a remote network scanned through a VPN is drawn like a local one.
  Routers show their internet interface and every other network on its own port, VLAN or VPN
  interface.
- **Ways out**: each router's default route is followed. A network with several sites draws each
  router with its own internet, side by side and joined by their link or tunnel; a site that
  leaves through another hangs from it. A firewall or modem that is not managed heads the map
  when the scan found it.
- Networks the routers hold that were not scanned are listed beside the map with a **Scan**
  button, which adds what is found to the same network. The computer running Meshwork is marked
  "You are here".
- A router or switch with several addresses appears once. Layer 3 switches are recognised.
- Virtualisation hosts are drawn on their switch port with their virtual machines grouped under
  them.
- **Live traffic** on cables while the map is open, from the 64-bit interface counters.
- Topology and infrastructure views, grouped device cards, find-on-canvas (⌘F / Ctrl+F), pan and
  zoom, and a layout remembered per network.
- Export as PNG or SVG, and **Export connections (CSV)**: what each device is plugged into
  (switch, port, VLAN, PoE) and its path to the gateway. Connections no switch has seen are left
  blank, not guessed.

### Diagnose

- **Network or provider?**: a step-by-step chain (this computer, gateway, DNS, internet,
  optionally one service you name) that stops at the first broken link. It also shows the public
  IPv4 and IPv6 addresses, the internet provider and its network number (ASN).
- **Traceroute** (IPv4) to an address or host name.
- Quick tests: live ping with a two-minute chart, port test with presets (remote access, files
  and printing, cameras and voice), DNS lookup compared between your DNS servers and a public
  resolver (1.1.1.1), and path MTU.
- **DHCP server check (beta)**: lists every server that answers a DHCP Discover. With SNMP
  switches set up, it shows which switch port each extra server is plugged into and can show it
  on the map. When the computer's own DHCP client holds the port, the check runs as a relay.

### WiFi

- Your connection at a glance: signal, quality, channel and width, band, transmit rate, Wi-Fi
  standard, BSSID and access point vendor. Noise and SNR are shown on macOS. On Windows, the
  signal is estimated from the percentage the system reports.
- Every access point in range in a sortable list, with security (open and WEP flagged), 802.11
  modes, notes per access point, and filters by band and security.
- Channel graph, signal history and a channel advisor that weighs channel use by signal strength
  and width, with DFS hints.

### Site visit report

- A PDF exported from Map with your own logo and company name. It contains findings with what to
  do, the network map (every device or network gear only), connectivity checks with the public
  address and provider, the device inventory and a sign-off page. Every section is optional.

### Device actions and platform

- SSH, remote desktop, open web page and ping from any device. On Windows, SSH opens in Windows
  Terminal (or the command prompt) and remote desktop in the built-in client.
- Native menus and shortcuts: ⌘/Ctrl+1 to 5 for the modules, ⌘/Ctrl+N for a new scan, ⌘/Ctrl+E
  to export devices, ⌘/Ctrl+Shift+L to switch theme. Light and dark themes follow the system by
  default.
- Automatic updates for the direct downloads, with release notes after each update.
- macOS builds are signed with a Developer ID and notarised. Windows installers are not
  code-signed yet; signing is in progress. A Mac App Store edition is in review.

Only scan networks you own or are authorised to assess. Meshwork asks you to confirm this before
the first scan.

## Roadmap

In short (details, and what is deliberately out of scope, in [ROADMAP.md](ROADMAP.md)):

- **Next (0.5.22):** Wi-Fi extenders that rewrite client MAC addresses placed correctly on the
  map, signed Windows installers, and the Mac App Store edition.
- **0.6:** SNMPv3 (all security levels and protocols) and a public build pipeline.
- **0.7:** VRFs, tunnels (GRE, IPsec, WireGuard, VXLAN) and link aggregation on the map.
- **0.8:** a documented fingerprint rule format the community can contribute to, and a
  regression suite of reference topologies.

## Screenshots

All screenshots use a fictional demo network; no real addresses or devices are shown.

**Map**: switch ports, VLANs on trunks, PoE and devices grouped by kind under the port they were
learned on.

<img src="docs/map.png" alt="Map of a fictional demo network around a floor switch" width="900">

**Infrastructure view** (dark theme): network gear only, with VLAN list and map tools.

<img src="docs/map-infrastructure-dark.png" alt="Infrastructure view of the demo network in the dark theme" width="900">

**Export connections**: where every device is plugged in, filtered by kind of device.

<img src="docs/export-connections.png" alt="Export connections dialog filtered to cameras" width="900">

## Privacy: every connection the app makes

Scan results, inventories, maps, reports and settings are stored only on your computer and are
never sent to us. The table lists every request Meshwork makes on its own. The sources are linked
so you can check them.

| What | Destination | When | Source |
| --- | --- | --- | --- |
| Update check | `meshwork.influxnetwork.com/updates` | About 20 s after launch, then every 6 hours. Settings → Updates chooses whether a new version downloads by itself or asks first. Not in Mac App Store builds. | `src/main/updates.ts` |
| Anonymous usage count | Sent as headers of the update check: a random installation ID, the app version, and the platform and CPU architecture (e.g. `darwin-arm64`) | On by default. Sent only after you have answered the first-launch notice, which has the switch to turn it off (it also stays in Settings). Never sent by Mac App Store builds. | `src/main/updates.ts` |
| Vendor database refresh | `standards-oui.ieee.org` (a `HEAD` request; the lists are downloaded only when they changed) | Weekly by default (daily, weekly, monthly or off in Settings), or **Check now** | `src/main/vendors.ts` |
| Connectivity chain | Ping and HTTPS `HEAD` to `1.1.1.1`, `8.8.8.8`, `one.one.one.one` and `dns.google`. Those names, and `dns.quad9.net`, are resolved through your own DNS servers. | Only when you run **Network or provider?** | `src/main/diagnose.ts` |
| Public address and provider | `1.1.1.1` / `1.0.0.1` and `[2606:4700:4700::1111]` / `[2606:4700:4700::1001]` (`/cdn-cgi/trace`). TXT lookups under `asn.cymru.com` and a reverse lookup of the public address go through your DNS servers. | Only when you run **Network or provider?** | `src/main/diagnose.ts`, `src/shared/diagnose.ts` |
| DNS lookup tool | Your DNS servers and `1.1.1.1` | Only when you run it | `src/main/diagnose.ts` |
| Hosts you enter | The addresses and names you type into Discover or Diagnose | Only when you run that scan or test | — |

Discover also looks up the name of each scanned address (reverse DNS) through your network's own
DNS servers. The website link in **About** opens in your browser only when you click it.

## Requirements

- macOS 13 or later (Apple silicon or Intel), or Windows 10/11 (x64).
- **macOS:** accept the Local Network prompt on the first scan (or enable it in *System Settings
  → Privacy & Security → Local Network*). Wi-Fi names need Location access, which is used for
  nothing else. On macOS 27 and later, reading MAC addresses from the ARP table needs Apple's
  network topology entitlement, which release builds carry. Builds without it get MAC addresses
  only from devices that report them over NetBIOS.
- **Windows:** uses the built-in Remote Desktop client and OpenSSH.

## Download and install

Ready-to-install builds are published at **[meshwork.influxnetwork.com](https://meshwork.influxnetwork.com)**.

- **macOS** (13 or later, Apple silicon or Intel): download the `.dmg` for your Mac, open it and
  drag Meshwork to Applications. Builds are signed and notarised, so macOS opens them without
  warnings.
- **Windows** (10 or 11, x64): download and run the `-setup-x64.exe` installer. Until the
  installers are code-signed, Windows SmartScreen asks for confirmation on first run: choose
  **More info → Run anyway**.

Installed copies update themselves (see *Privacy* for what that sends). You can also build
Meshwork yourself from this repository, as described below.

## Build from source

For this fork's Windows development workflow, see [Windows setup](docs/WINDOWS.md).
The checked-in launcher provides `setup`, `doctor`, `dev`, `verify`, `build` and `package`
tasks; for example, run `.\run.cmd setup`, then `.\run.cmd verify` and `.\run.cmd dev`
from PowerShell. Project guidance for coding agents is in [AGENTS.md](AGENTS.md).

### 1. Prerequisites

| | macOS | Windows |
| --- | --- | --- |
| Node.js | 24 or later | 24 or later |
| pnpm | 11.25.0 (`npm install -g pnpm@11.25.0`; pinned in `package.json`) | same |
| Git | any recent version | any recent version |
| Native tools | Xcode Command Line Tools (`xcode-select --install`), for the Wi-Fi helper | none |

Linux is not supported yet: Wi-Fi, the system tools Meshwork calls and packaging are written for
macOS and Windows.

### 2. Get the code and install dependencies

```bash
git clone https://github.com/prime052i/meshwork.git
cd meshwork
pnpm install --frozen-lockfile
```

### 3. Run it

```bash
pnpm build:native   # macOS only: compiles the Wi-Fi helper into resources/bin/mac (once)
pnpm dev            # starts the app with hot reload
```

`pnpm dev` opens the app with the UI reloading on every change. Without `pnpm build:native`,
the WiFi module is unavailable on macOS; on Windows it uses `netsh` and needs no helper. A
development build is not signed, so on macOS 27 and later it reads fewer MAC addresses (see
*Requirements*).

### 4. Check your changes

```bash
pnpm verify         # typecheck + unit tests + production build
# Or run the stages individually:
pnpm typecheck      # TypeScript, main + renderer
pnpm test           # unit tests (Vitest), a few seconds
pnpm build          # production build into out/
```

The tests need the `openssl` command on the path, to create a throwaway certificate for the
HTTPS tests. macOS includes it; on Windows, run the tests from Git Bash or install OpenSSL.
The Windows launcher can also find Git for Windows' OpenSSL and make it available to its child
processes without changing the system PATH.

`pnpm test:e2e` is a separate integration check: it launches the built desktop app and actively
scans the local subnet. Run it only in the intended test network. It is not part of `pnpm verify`
or the Windows/macOS [verification workflow](.github/workflows/verify.yml).

### 5. Package installers

```bash
pnpm dist:mac       # macOS .dmg and .zip (arm64 and x64) in release/<version>/
pnpm dist:win       # Windows NSIS installer in release/<version>/
pnpm dist:mas       # Mac App Store package (needs the App Store signing setup)
pnpm data:oui       # optional: rebuild the bundled MAC vendor database from the IEEE lists
```

Packaging is configured in `electron-builder.config.cjs` and `electron-builder.mas.config.cjs`.
Without signing values, `pnpm dist:mac` produces an **unsigned** build. It runs on your own Mac
with the limits described under *Requirements*. To sign and notarise, set these environment
variables. `scripts/release-env.sh` loads them from `~/.config/meshwork/release.env`, outside
the repository, or from the file named by `MESHWORK_RELEASE_ENV`:

| Variable | Used for |
| --- | --- |
| `APPLE_TEAM_ID` | Your Apple team ID, filled into the entitlements at packaging time |
| `MESHWORK_MAC_IDENTITY` | Your Developer ID signing identity name |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` | Notarisation |
| `MESHWORK_MAS_DEV_IDENTITY` | Optional: development identity for local App Store test builds |

Signed builds also need your own provisioning profiles in `build/` (`embedded.provisionprofile`;
`appstore.provisionprofile` and `appstore-dev.provisionprofile` for the App Store), which are
never committed. A fork should also use its own `appId` and product name (see *Licence*).

### Working on the project

- Open the folder in any editor with TypeScript support; VS Code works out of the box with the
  workspace TypeScript version.
- The app has three processes. `src/main` is the Electron main process. `src/scanner` is the
  scanner, in its own utility process. `src/renderer` is the React UI. They talk only through the
  typed bridge in `src/preload`, and the types in `src/shared`.
- Logic that does not need Electron (map model, fingerprint engine, loop detection, parsers)
  lives in `src/shared` or in pure modules, and is what the unit tests cover. Add tests there
  first.
- Device identification rules are data: `src/shared/fingerprint/rules/*.json`. Every rule needs a
  case in `tests/fingerprint-rules.test.ts`; a test fails when one is missing.
- User-facing changes need a line in `src/shared/release-notes.ts`; a test fails if the current
  version has no notes.
- To try the UI without a real network, `scripts/demo-network.ts` writes a fictional site into a
  fresh data folder:
  `npx tsx --tsconfig tsconfig.node.json scripts/demo-network.ts /tmp/meshwork-demo`, then
  `pnpm build && npx electron out/main/index.js --user-data-dir=/tmp/meshwork-demo`.

### Stack

Electron, React 19, TypeScript, electron-vite, Tailwind CSS v4, Radix UI, React Flow
(`@xyflow/react`) for the map, Lucide icons, Zustand, SQLite (`node:sqlite`), net-snmp,
electron-updater, Vitest and Playwright.

### Project layout

```
src/
  main/       main process: windows, menus, IPC, inventory (SQLite), SNMP, Diagnose, Wi-Fi,
              updates, vendor database, PDF report
  scanner/    network scanner and identify collectors, run in their own utility process
  preload/    typed bridge exposed to the UI as window.api
  renderer/   React UI: Discover, Network Inventory, Map, Diagnose, WiFi, Settings
  shared/     types and pure logic shared by every process: fingerprint engine and rules, map
              gear model, loop detection, rogue DHCP, report model, release notes
native/macos/    native helpers: Wi-Fi (Swift) and, for the App Store build, ICMP and ARP (C)
resources/       bundled MAC vendor database and licence texts
build/           icons and entitlements
scripts/         build, packaging and signing helpers
tests/           unit tests (Vitest) and end-to-end tests (Playwright)
docs/            logo and screenshots
```

## Contributing

Bug reports with the output of **Copy details** (remove anything private first) are the most
useful contribution, especially for devices Meshwork misidentifies or switches whose SNMP data it
reads wrongly. Pull requests are welcome; please read [CONTRIBUTING.md](CONTRIBUTING.md) first.
Contributors agree to a Contributor Licence Agreement so the project can keep shipping through
app stores whose terms are not compatible with the GPL.

To report a security issue, see [SECURITY.md](SECURITY.md); please do not open a public issue.

## Licence

Meshwork is free software, licensed under the **GNU General Public License v3.0**. See
[LICENSE](LICENSE). © 2026 Influx Network LLC.

The Meshwork name and logo are not covered by the GPL; forks must use their own name and logo.

Third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Their full
licence texts are collected at build time and ship inside the app.
