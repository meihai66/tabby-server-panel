# Tabby Server Panel

A plugin for [Tabby Terminal](https://github.com/Eugeny/tabby) that adds a three-layer collapsible bottom panel to SSH sessions.

## Features

### 📊 Layer 1 – Server Stats
Real-time monitoring via SSH commands:
- **CPU** usage (from `/proc/stat`)
- **RAM** usage (from `/proc/meminfo`) — used / total with progress bar
- **SWAP** usage (from `/proc/meminfo`) — used / total with progress bar
- **Disk** partitions (from `df -P`) — per-mount usage with progress bars
- **Network** traffic (from `/proc/net/dev`) — per-interface Rx/Tx rates
- Auto-refresh (default every 5 seconds, configurable)
- Color-coded: 🟢 green (<60%), 🟡 yellow (60–85%), 🔴 red (>85%)

### ⚡ Layer 2 – Quick Commands
A tabbed command palette for one-click SSH execution:
- **Multiple tabs** — create, rename (double-click), delete
- **Command buttons** in a flexible grid layout — name, icon, border color
- **Add / Edit / Delete** commands via an inline form
- Click a button to instantly send the command to the active terminal
- **Config persisted** in Tabby's config system

### 📁 Layer 3 – File Manager
Full SFTP-based file browser:
- **Directory listing** with name, size, permissions, modified time
- **Breadcrumb navigation** + address bar with free-form path input
- **Sorting** by name / size / mtime (click column header)
- **Drag & drop upload** from local file system to the remote server
- **Upload button** (file picker) for manual selection
- **Upload progress bar** per file
- **Right-click context menu**:
  - New folder / New file
  - Rename (inline)
  - Download (opens system save dialog via Electron)
  - Open & Edit locally (downloads to temp dir, opens default OS editor, **auto-uploads on save**)
  - Copy path to clipboard
  - Delete
- **Auto-sync watcher** — edits saved locally are automatically pushed back via SFTP
- Sync status badge per file (✓ watching / ↑ syncing / ✕ error)

### 🎛 Panel UI
- Collapsible bottom panel (▼/▲ toggle)
- Maximise button
- **Drag-to-resize** handle at the top of the panel — height is persisted in config
- Dark theme matching Tabby's default style

---

## Project Structure

```
tabby-server-panel/
├── package.json
├── tsconfig.json
├── webpack.config.js
├── src/
│   ├── index.ts                          # Plugin entry, exports Angular module
│   ├── tabby-server-panel.module.ts      # NgModule declaration
│   ├── components/
│   │   ├── server-panel.component.ts     # Main container (tabs + resize + min/max)
│   │   ├── server-panel.component.scss
│   │   ├── server-stats.component.ts     # Layer 1: server monitoring
│   │   ├── server-stats.component.scss
│   │   ├── quick-commands.component.ts   # Layer 2: command palette
│   │   ├── quick-commands.component.scss
│   │   ├── file-manager.component.ts     # Layer 3: SFTP file browser
│   │   └── file-manager.component.scss
│   ├── services/
│   │   ├── server-stats.service.ts       # SSH command execution + stat parsing
│   │   ├── quick-commands.service.ts     # CRUD for command tabs/entries
│   │   ├── file-manager.service.ts       # SFTP operations + fs watcher
│   │   └── config.service.ts             # Thin wrapper around Tabby ConfigService
│   ├── models/
│   │   ├── server-stats.model.ts
│   │   ├── quick-command.model.ts
│   │   └── file-item.model.ts
│   └── config/
│       └── config.provider.ts            # Tabby ConfigProvider with defaults
```

---

## Installation

### From npm (future)

```bash
# Inside Tabby's plugin directory
npm install tabby-server-panel
```

### Build from source

```bash
git clone https://github.com/meihai66/tabby-server-panel.git
cd tabby-server-panel
npm install
npm run build
```

Then copy the `dist/` folder (or symlink the whole repo) into Tabby's plugins directory:

| OS | Path |
|---|---|
| Windows | `%APPDATA%\tabby\plugins\node_modules\tabby-server-panel` |
| macOS | `~/.config/tabby/plugins/node_modules/tabby-server-panel` |
| Linux | `~/.config/tabby/plugins/node_modules/tabby-server-panel` |

---

## Usage

After installing, open any **SSH session** in Tabby. The panel appears at the bottom of the terminal window.

### Integrating into a custom Tabby SSH tab

```typescript
import { ServerPanelComponent } from 'tabby-server-panel'

// Inside your SSH tab component template:
// <server-panel [session]="sshSession" [sftpSession]="sftpSession" [terminal]="terminalInstance"></server-panel>
```

The three `@Input()` properties:

| Input | Type | Description |
|---|---|---|
| `session` | `SshLikeSession` | SSH session (used by server-stats service to exec commands) |
| `sftpSession` | `SftpSession` | SFTP session (used by file-manager service) |
| `terminal` | `TerminalLike` | Terminal instance (used to send commands by quick-commands) |

---

## Configuration

Default config values (stored in Tabby's `config.yaml`):

```yaml
serverPanel:
  statsRefreshInterval: 5       # seconds between stats polls
  defaultUploadPath: "/tmp"     # default drop-zone remote directory
  autoSyncEnabled: true         # enable file auto-sync on local save
  panelHeight: 250              # panel body height in pixels
  quickCommands:
    tabs:
      - id: default
        name: 常用
        commands:
          - id: cmd-1
            name: 查看日志
            command: "tail -f /var/log/syslog"
            icon: "📄"
            color: "#4CAF50"
          - id: cmd-2
            name: 磁盘使用
            command: "df -h"
            icon: "💾"
            color: "#2196F3"
          - id: cmd-3
            name: 进程列表
            command: "ps aux | head -20"
            icon: "📋"
            color: "#9C27B0"
```

---

## Development

```bash
# Development build with watch mode
npm run build:dev
# or
npm run watch

# Production build
npm run build
```

TypeScript strict mode is enabled. All code must pass `tsc --noEmit` before committing.

---

## Security

### Angular version constraint and known CVEs in devDependencies

The Angular packages (`@angular/common`, `@angular/compiler`, `@angular/core`) are listed as **devDependencies** used exclusively at **build time** — they are entirely excluded from the production bundle (declared as webpack `externals`). The bundle loaded by Tabby at runtime uses Tabby's own Angular 15 instance; none of these packages ship with the plugin.

`npm audit` reports several high-severity CVEs against these Angular 15 devDependencies. The reported CVEs and their applicability:

| GHSA | Title | Applicable to this plugin? |
|------|-------|---------------------------|
| [GHSA-58c5-g7wp-6w37](https://github.com/advisories/GHSA-58c5-g7wp-6w37) | XSRF token leakage via protocol-relative URLs | ❌ **No** — plugin does not use Angular `HttpClient` |
| [GHSA-v4hv-rgfq-gp49](https://github.com/advisories/GHSA-v4hv-rgfq-gp49) | Stored XSS via SVG animation/URL/MathML attributes | ❌ **No** — plugin templates contain no SVG elements |
| [GHSA-jrmj-c5cx-3cw6](https://github.com/advisories/GHSA-jrmj-c5cx-3cw6) | XSS via unsanitized SVG script attributes | ❌ **No** — plugin templates contain no SVG elements |
| [GHSA-prjf-86w9-mfqv](https://github.com/advisories/GHSA-prjf-86w9-mfqv) | i18n XSS | ❌ **No** — plugin does not use Angular i18n |

**Why Angular 15 cannot be upgraded:** Tabby's host application is built on Angular 15 and provides it as a shared runtime. A Tabby plugin's Angular JIT decorators are processed by the host's Angular instance. Upgrading the build tools to Angular 21 would generate decorator metadata incompatible with Angular 15's runtime, causing Tabby to fail to load the plugin. The npm-suggested fix (`@angular/common@21.2.7`) is a semver-major breaking change in this context.

---



- **Tabby** ≥ 1.0.185
- **Node.js** ≥ 16
- Remote server must be Linux (the stat collection uses `/proc/stat`, `/proc/meminfo`, etc.)
- SFTP subsystem enabled on the remote SSH server (for file manager)

---

## License

MIT