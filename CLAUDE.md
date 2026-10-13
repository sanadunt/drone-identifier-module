# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is not a source tree. It is the packaged Windows build of **Device Manager** (`device-monitor` 1.0.0), an Electron app built with React 18, Zustand, Cesium and serialport 12. The app connects to a drone-detection device over serial or TCP, parses the device's text frames, decrypts Drone ID data through an external HTTP service, and plots drones on a Cesium map. `app-unpacked/` holds the extracted contents of the original `resources/app.asar`. The repository has no `.ts`/`.tsx` sources, source maps, build config, linter or tests. All app changes are edits to the bundled output in `app-unpacked/out/`.

The Windows Chromium/Electron runtime (`*.dll`, `*.pak`, `*.bin`, `locales/`) is committed at the root. `*.exe` and `*.asar` are gitignored, so a clone does not contain `Device Manager.exe`, `resources/app.asar`, `resources/elevate.exe` or `backup/app.asar`, even though `AGENTS.md` and `docs/` mention them. Those files exist only in the original local workspace. Never overwrite either archive unless explicitly asked.

## Commands

```sh
npm install   # root only: installs Electron 44.5.1 (Node >= 22.12.0); leaves app-unpacked/node_modules untouched
npm run dev   # runs `electron ./app-unpacked`, entry ./out/main/main.js
node --check app-unpacked/out/main/main.js   # syntax check; also works on preload.js and the renderer bundle
```

- There is no build, hot reload, lint or test step. Restart the app after editing. `node --check` is the only automated check.
- Do not set `NODE_ENV=development`. In that mode `main.js` loads `http://localhost:${VITE_PORT || 5173}`, and no Vite server or source exists in this repo.
- Outside development mode, `main.js` removes the menu and blocks the DevTools shortcuts (F12, Ctrl/Cmd+Shift+I/J/C).
- The runner has been smoke-tested only on macOS. `serialport` also ships Linux and Windows prebuilds. The shipped Windows app runs on Electron 28.3.3, so a successful run under 44.5.1 does not prove the Windows package works.

## Architecture

The app has three bundles under `app-unpacked/out/`. Adding an IPC feature touches all three: a handler in `main.js`, a bridge method in `preload.js`, and a call site in the renderer.

### Main process: `main/main.js` (~4.2k lines)

- The first ~2,550 lines are inlined `electron-log`. App code begins at `class BaseConnectionManager`.
- **`BaseConnectionManager`** stores connections in a `Map`. It splits incoming bytes into lines on newlines, with a 1 MiB buffer, and fires three callback streams: line data, raw bytes and status. Two subclasses implement the `createConnection`, `destroyConnection` and `generateConnectionId` hooks:
  - `SerialPortManager`: the connection id is the port `path`.
  - `TCPManager`: the connection id is `host:port`. It handles timeouts, keep-alive and auto-reconnect.
- **`enqueueRendererData`** batches data on its way to the renderer:
  - `serial:data` and `tcp:data` carry lines, flushed every 50 ms and joined with `\n`.
  - `serial:raw-data` and `tcp:raw-data` carry raw bytes, flushed every 10 ms.
  - Every payload has the shape `{ connectionId, data: number[], timestamp }`. Bytes arrive as a plain number array, not a Buffer.
- `LogManager` also writes received lines to `userData/logs/YYYY-MM-DD.log`.
- Main also contains:
  - the decrypt HTTP client: `callDecryptService`, a token cache, a 25 s timeout and plain `http://`
  - the MT303 firmware manifest fetch and download from `FIRMWARE_MANIFEST_URL`
  - log and data export
  - window controls
- Each `ipcMain.handle` catches its own errors. It returns `{ success: true, data }` or `{ success: false, error: message }`.
- The `BrowserWindow` uses `frame: false`, so the renderer draws its own title bar and calls the `window:*` IPC handlers. Its web preferences are `contextIsolation: true`, `nodeIntegration: false` and `webSecurity: false`.

### Preload: `preload/preload.js`

The preload exposes `window.electronAPI` with these groups: `serial`, `tcp`, `log`, `data`, `decrypt`, `firmware` and `window`. Requests call `ipcRenderer.invoke("<group>:<action>")`. Every `on*` listener returns an unsubscribe function.

### Renderer: `renderer/assets/index-Dl8IZmMw.js` and `index-B627fAy7.css`

The renderer is a single Vite bundle of ~268k lines (9.5 MB). **Never Read it whole.** Grep for a symbol name, then Read with `offset`/`limit`. Line numbers below are approximate and shift with edits, so search by symbol name.

| Approx. lines | Contents |
| --- | --- |
| ~7.8k–11.2k | Zustand stores (`useConnectionStore`, `useDataStore`, `useThemeStore`); i18n (`dictionaries`, `useI18n`); serial/TCP connection forms; data view; `ProtocolParserManager` (HEX, ASCII and UTF-8 display) |
| ~11k–262k | Vendored libraries, mostly Cesium. Do not edit. |
| ~262.7k–267.8k | Feature components: `MapPanel` (frame parsing, automatic decrypt, drone and pilot markers, radar), `SettingsPanel`, `UpgradePanel` (YMODEM firmware transfer), `StatisticsPanel`, `GpsPanel`, `LogsPanel`, `MainLayout` and `App` |

**Device protocol.** The device sends text frames of the form `$<type>,key:value,...,$end`. Examples are `$heartbeat`, `$EncryptedDroneID`, `$debug_gps` and `$debug_log`.

- The map, statistics and GNSS panels and `MainLayout` subscribe to `onRawData`. Each reassembles `$...,$end` frames with its own buffer limit and filters by `connectionId`.
- `SettingsPanel` and `MainLayout` also subscribe to the line-split `onData` stream.
- `UpgradePanel` calls `setLineParsingPaused` while a binary YMODEM transfer is running.

**Renderer conventions.**

- **i18n.** `t(key)` looks up `dictionaries[lang][key]`. If the key is missing, it falls back to `zh`, then to the raw key. Add every new UI string to all six dictionaries: `zh`, `en`, `es`, `fr`, `vi` and `uk`.
- **Persisted state.** Settings live in `localStorage` under `device-manager-*` keys:
  - `device-manager-settings` holds the decrypt config, including the password in plain text.
  - The other keys are `device-manager-theme`, `-language`, `-serial-config`, `-tcp-config`, `-connection-type` and `-map-source`.
- **Cesium.** Assets load from `out/renderer/cesium/`, set by `window.CESIUM_BASE_URL = "./cesium"`.
- **File names.** `index.html` references the hashed bundle file names. If you rename a bundle, update `index.html`.

## Feature docs

`docs/` contains detailed behavior guides, mostly in Indonesian, derived from the bundle. Read the relevant guide before changing a feature, and update it if you change the behavior it describes.

- `decrypt-frame.md`: the `$EncryptedDroneID` flow; the two decrypt APIs (device signature and username/password); accepted response shapes; security caveats.
- `gnss-debug-gps.md`: the `$set_gps_debug` enable/disable commands and GSV parsing on the GNSS tab.
- `gui-customization-and-npm-run.md`: an inventory of GUI settings, where to change the look and feel, and notes on running locally.
- `electron-package-map-and-macos-plan.md`: a package map, an ASAR repack plan that has never been run, and an assessment of a macOS port.

## Constraints

- For app behavior, edit only `app-unpacked/out/` and `app-unpacked/resources/icon.png`. Leave `app-unpacked/node_modules/`, Cesium assets and the root Electron runtime files alone.
- Keep `contextIsolation: true`, `nodeIntegration: false` and the `{ success, data | error }` IPC contract.
- Repacking `app-unpacked/` into a new ASAR is a separate step that has never been run or verified. Any repacked archive goes in a staging copy, never over the originals.
