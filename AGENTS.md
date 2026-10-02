# Repository Guidelines

## Project Overview

`Device Manager` is an Electron desktop application for device monitoring with serial and TCP connections (`app-unpacked/package.json`). This workspace contains the packaged Windows distribution and a separate extraction. `app-unpacked/` holds 7,337 files extracted from `resources/app.asar`; `backup/app.asar` has the same SHA-256 as the original (`01d1d8737117eb195275f148faed03ffe9229d00510884f0401cb9e25611132c`). The generic archive reader rejected a zero-byte dependency entry, but the extraction validated all file and block hashes. Make edits in `app-unpacked/`; leave both archives unchanged unless explicitly asked to replace the shipped copy.

## Architecture & Data Flow

`app-unpacked/out/main/main.js` creates a `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`, and `out/preload/preload.js`, then loads `out/renderer/index.html`. The preload exposes `window.electronAPI` through `contextBridge`; its `serial` and `tcp` methods invoke matching main-process IPC handlers. The main process dispatches to `SerialPortManager` and `TCPManager`, using `serialport` and Node's `net` module. Handlers generally return `{ success, data }` or `{ success: false, error }`; event listeners route data and status updates back through the preload bridge.

The extracted payload is built output, not the original development source. The main process, preload, and renderer boundaries are observable, but app-level `.ts`/`.tsx` source and source maps are not present in `out/`.

## Key Directories

- `app-unpacked/out/main/`: bundled Electron main process (`main.js`).
- `app-unpacked/out/preload/`: context-isolated renderer bridge (`preload.js`).
- `app-unpacked/out/renderer/`: `index.html`, bundled JS/CSS assets, and Cesium assets.
- `app-unpacked/node_modules/`: packaged dependencies; avoid editing vendor files.
- `resources/`: shipped `app.asar` and `elevate.exe` helper.
- `backup/`: byte-identical backup of the original `app.asar`.
- `locales/` and repository root: Chromium locale packs and Electron/Chromium runtime assets.

## Development Commands

`app-unpacked/package.json` declares no scripts; no lockfile or development build configuration is included. Build, lint, test, and repack commands are therefore unavailable. Do not guess package-manager commands. `Device Manager.exe` launches the packaged app on Windows, but is not a development loop and was not run. Repack edited files to a new archive with a compatible ASAR tool; do not overwrite `resources/app.asar` or `backup/app.asar` by default.

## Code Conventions & Common Patterns

The available JavaScript is bundled output; the renderer is one large hashed JS bundle. Preserve the existing IPC contract: preload groups APIs under `serial` and `tcp`, calls main handlers with `ipcRenderer.invoke`, and returns unsubscribe functions for event listeners. Main IPC handlers catch errors and return `{ success: false, error }`. Keep `contextIsolation: true` and `nodeIntegration: false`; avoid editing `node_modules` or vendor assets for app behavior.

## Important Files

- `Device Manager.exe`: packaged Windows application executable.
- `resources/app.asar`: original application bundle, preserved unchanged.
- `backup/app.asar`: SHA-256-identical backup of the original archive.
- `app-unpacked/package.json`: app metadata and main entry `./out/main/main.js`; declares React, serialport, Zustand, Cesium, and other runtime dependencies.
- `app-unpacked/out/main/main.js`: Electron main process, connection managers, and IPC handlers.
- `app-unpacked/out/preload/preload.js`: `electronAPI` bridge between renderer and main process.
- `app-unpacked/out/renderer/index.html`: loads the renderer bundle in `assets/`.
- `resources/elevate.exe`: bundled Windows elevation helper; its app call sites were not inspected.

No original app source, source maps, test suite, CI workflow, or build configuration was found in the extracted payload.

## Runtime/Tooling Preferences

The package targets Windows and bundles Electron/Chromium/V8 runtime files. `app-unpacked/package.json` lists React 18.2, serialport 12, Zustand 4.4, and Cesium 1.120 among its dependencies. The Electron and Node.js versions and the original package manager are not exposed by the manifest; no lockfile or development toolchain is included.

## Testing & QA

No application test files were found under `app-unpacked/out/`; the manifest has no test scripts, and no coverage or CI configuration is included. The extraction verified all 7,337 file and block hashes, and the backup checksum matches the original. No app build, test run, repack, or Windows launch has been performed.
