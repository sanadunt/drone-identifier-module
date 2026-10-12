# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

A snapshot of a packaged Windows Electron app, "Device Manager" (`device-monitor` 1.0.0), plus the
contents extracted from its `app.asar`. It is **built output, not source**: there is no TypeScript,
no source maps, no build config, no lockfile, no scripts in `app-unpacked/package.json`, and no tests.
`AGENTS.md` and `docs/electron-package-map-and-macos-plan.md` describe the original workspace
in more detail; read `AGENTS.md` too, it is also authoritative.

Note the gap between those docs and this git checkout: `*.exe` and `*.asar` are gitignored, so
`Device Manager.exe`, `resources/app.asar`, `backup/app.asar` and `resources/elevate.exe` are
**not** in the repo even though the docs refer to them. `app-unpacked/node_modules/` and
`app-unpacked/out/renderer/cesium/` are also present on disk but untracked. The tracked, editable
app code is exactly:

- `app-unpacked/out/main/main.js` (Electron main process, ~4.2k lines, bundled with electron-log)
- `app-unpacked/out/preload/preload.js` (contextBridge API)
- `app-unpacked/out/renderer/index.html` + `assets/index-*.js` / `index-*.css` (Vite-built React bundle)
- `app-unpacked/package.json`

Everything else at the repo root (`*.dll`, `*.pak`, `*.bin`, `icudtl.dat`, `locales/`) is the
Electron/Chromium runtime and is never edited.

## Commands

There are none. No build, lint, test, or run command exists in this repo; do not invent
package-manager commands. Verification is limited to reading the code and `node --check` on the
edited JS files:

```
node --check app-unpacked/out/main/main.js
node --check app-unpacked/out/preload/preload.js
```

To ship a change, the edited `app-unpacked/` tree must be repacked into a **new** ASAR with an ASAR
tool and tested on Windows in a copy of the distribution. That has never been done here; never
overwrite a shipped `app.asar`.

## Architecture (main ↔ preload ↔ renderer)

`main.js` is a Rollup/Vite bundle: lines 1–2550 are inlined `electron-log`; the app code starts at
`BaseConnectionManager` (~line 2552). Key pieces, in order:

- **`BaseConnectionManager`** → `SerialPortManager` / `TCPManager`. The base class owns the
  connection map, data/rawData/status callbacks, and line parsing (`\n` delimiter, 1 MB buffer,
  per-connection pause set). Subclasses implement `createConnection`, `destroyConnection`,
  `generateConnectionId` and listener hooks. Connection IDs are the serial `path` or `host:port`.
  `TCPManager` also has auto-reconnect with a `manualDisconnects` set.
- **`LogManager`** writes daily `YYYY-MM-DD.log` files under `userData/logs` via electron-log,
  buffers lines and flushes on a timer; `log:export` / `log:clear` go through it.
- **Renderer forwarding**: `enqueueRendererData` batches bytes per `channel:connectionId` and
  sends `{ connectionId, data: number[], timestamp }`. Parsed lines go on `serial:data` /
  `tcp:data` every 50 ms joined by `\n`; raw bytes go on `*:raw-data` every 10 ms; a batch flushes
  early at 200 chunks. Status goes on `*:status` as `{ connectionId, status, message }`.
- **Network services** (plain `http`/`https`, no fetch lib): firmware manifest/download from a
  hard-coded Gitee URL (`FIRMWARE_MANIFEST_URL`, product `MT303`, manifest cached in memory), and a
  user-configured decrypt server (`http://<serverIp>:<serverPort>/api/login`, `/api/1.0/dec`,
  `/api/yd/decrypt`) with a token cache keyed per payload.
- **IPC handlers** (`ipcMain.handle`, ~line 3938 on) all follow one contract: return
  `{ success: true, data }` or `{ success: false, error: message }`, never throw to the renderer.
  Channels: `serial:*`, `tcp:*`, `log:*`, `data:export` (save dialog, 100 MB cap), `decrypt:*`,
  `firmware:*`, `window:*`.
- **Window**: frameless `BrowserWindow`, `contextIsolation: true`, `nodeIntegration: false`,
  `webSecurity: false`. In production the menu is removed and DevTools shortcuts are blocked;
  `NODE_ENV=development` instead loads `http://localhost:${VITE_PORT||5173}`. macOS branches exist
  (dock icon, lifecycle) but the shipped runtime is Windows-only.

`preload.js` mirrors the handler list one-to-one as `window.electronAPI.{serial,tcp,log,data,
decrypt,firmware,window}`; every `on*` listener returns an unsubscribe function. The renderer
bundle (React 18 + Zustand + Cesium, Tailwind dark theme, `lang="zh-CN"`) calls only these.

## Rules when editing

- Add a feature by touching all three layers in lockstep: a handler in `main.js`, a method in
  `preload.js`, and the call in the renderer bundle. Keep the `{ success, data | error }` shape and
  the unsubscribe-function pattern.
- Do not loosen `contextIsolation` / `nodeIntegration`, and do not edit `node_modules/` or the
  Cesium assets to change app behavior.
- The renderer JS/CSS are minified hashed bundles; edits there are surgical string edits and the
  hash in `index.html` must still match the filename. Prefer main/preload changes when possible.
- Code comments in `main.js` are partly Chinese; keep them as they are.
