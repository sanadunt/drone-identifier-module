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

From the repository root on macOS:

- `npm install` installs the pinned local Electron runtime and requires Node.js >=22.12.0; it does not change `app-unpacked/node_modules`.
- `npm run dev` launches the extracted app with Electron 44.5.1. Do not set `NODE_ENV=development`; the bundled main process treats that as a request to load a Vite server on port 5173, which is not included.
- This runs the prebuilt renderer only. No source build, hot reload, lint, or test command is configured. Edit bundled JS/CSS and restart the app to see changes. The Windows executable is not used. Do not overwrite `resources/app.asar` or `backup/app.asar` by default.

## Code Conventions & Common Patterns

The available JavaScript is bundled output; the renderer is one large hashed JS bundle. Preserve the existing IPC contract: preload groups APIs under `serial` and `tcp`, calls main handlers with `ipcRenderer.invoke`, and returns unsubscribe functions for event listeners. Main IPC handlers catch errors and return `{ success: false, error }`. Keep `contextIsolation: true` and `nodeIntegration: false`; avoid editing `node_modules` or vendor assets for app behavior.

## Important Files
- `package.json` and `package-lock.json`: macOS npm runner script, Node.js >=22.12.0, and pinned Electron 44.5.1.

- `Device Manager.exe`: packaged Windows application executable.
- `resources/app.asar`: original application bundle, preserved unchanged.
- `backup/app.asar`: SHA-256-identical backup of the original archive.
- `app-unpacked/package.json`: app metadata and main entry `./out/main/main.js`; declares React, serialport, Zustand, Cesium, and other runtime dependencies.
- `app-unpacked/out/main/main.js`: Electron main process, connection managers, and IPC handlers.
- `app-unpacked/out/preload/preload.js`: `electronAPI` bridge between renderer and main process.
- `app-unpacked/out/renderer/index.html`: loads the renderer bundle in `assets/`.
- `resources/elevate.exe`: bundled Windows elevation helper; its app call sites were not inspected.

No original app source, source maps, test suite, CI workflow, or build configuration was found in the extracted payload.

The packaged Windows app contains Electron 28.3.3, which is end-of-support. The local macOS runner pins Electron 44.5.1, a supported release at setup time; this does not exactly reproduce the packaged runtime. The extracted `serialport` binding uses Node-API 6 and includes a universal Darwin x64/arm64 prebuild. `app-unpacked/package.json` declares React 18.2, serialport 12, Zustand 4.4, and Cesium 1.120.

## Testing & QA

No application test files were found under `app-unpacked/out/`; the manifest has no test scripts, and no coverage or CI configuration is included. A macOS smoke run with Electron 44.5.1 loaded the bundled renderer; selecting Serial populated detected `/dev/` ports through the native binding. No physical serial/TCP connection, app build, repack, or Windows launch was tested. The extraction verified all 7,337 file and block hashes, and the backup checksum matches the original.
