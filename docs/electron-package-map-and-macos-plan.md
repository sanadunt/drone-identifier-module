# Electron Package Map and macOS Plan

## Current State

This workspace contains a packaged Windows Electron application and a separate extraction, not the original development source tree.

- `resources/app.asar` is the original application archive.
- `backup/app.asar` is a byte-identical backup. SHA-256: `01d1d8737117eb195275f148faed03ffe9229d00510884f0401cb9e25611132c`.
- `app-unpacked/` contains 7,337 extracted files. Every file and integrity-block hash was checked during extraction.
- The archive reader initially rejected the zero-byte `node_modules/client-only/index.js` entry. The archive was still extractable; its files and hashes validated.
- No repack, build, application test, or Windows launch has been performed.

Keep `resources/app.asar` and `backup/app.asar` unchanged. Use `app-unpacked/` for experiments.

## Folder Map

```text
project-root/
├── Device Manager.exe                  # Windows application executable
├── resources/
│   ├── app.asar                        # Original app archive
│   └── elevate.exe                     # Windows helper
├── locales/                            # Chromium locale packs
├── backup/
│   └── app.asar                        # Original archive backup
└── app-unpacked/
    ├── package.json                    # Runtime metadata and dependencies
    ├── resources/icon.png
    ├── out/
    │   ├── main/main.js                # Electron main process bundle
    │   ├── preload/preload.js          # Renderer IPC bridge
    │   └── renderer/
    │       ├── index.html
    │       ├── assets/                  # Bundled JS/CSS and product images
    │       └── cesium/                  # Cesium assets, workers, and WASM
    └── node_modules/                   # Packaged dependencies
```

The extracted manifest identifies `device-monitor` version `1.0.0`, with `./out/main/main.js` as its entry point. Declared dependencies include React, Zustand, Cesium, `serialport`, `electron-log`, and `@zip.js/zip.js`.

## Architecture and Editable Areas

`main.js` creates the Electron window, loads the preload and renderer, and owns serial/TCP connection managers. `preload.js` exposes `window.electronAPI` through `contextBridge`; renderer requests use IPC channels such as `serial:*` and `tcp:*`. Main-process handlers return success/error objects and forward connection events back through preload listeners.

For targeted changes, the extracted files are:

- Main-process and serial/TCP behavior: `app-unpacked/out/main/main.js`.
- Renderer-to-main API: `app-unpacked/out/preload/preload.js`.
- UI bundle: `app-unpacked/out/renderer/assets/index-Dl8IZmMw.js`.
- Styles: `app-unpacked/out/renderer/assets/index-B627fAy7.css`.
- Renderer shell and assets: `app-unpacked/out/renderer/index.html` and `assets/`.

These are built outputs, not the original source. No app-level TypeScript files or source maps were found under `out/`. The renderer JavaScript is a large hashed bundle, so UI edits there are harder to maintain. `node_modules/` contains vendor dependencies; avoid editing it for application behavior.

## Repacking Plan

Repacking the edited files into an ASAR is a separate step from building a complete application. The workspace has no build scripts, lockfile, Electron version declaration, packaging configuration, or locally installed ASAR CLI.

1. Edit only `app-unpacked/`; retain both original archives.
2. Use a compatible ASAR packer to create a **new** archive in a staging location. The pack command has not been run or verified here.
3. For Windows testing, place that new archive in a duplicate of the Windows distribution, not the original folder.
4. Test application startup and affected serial/TCP, file-dialog, and window-control behavior on Windows before considering the repack usable.

Do not treat an edited ASAR as a complete build. It does not replace the Electron runtime or recreate the original packaging pipeline.

## macOS Feasibility

**Assessment: plausible, not yet build-ready.** The existing Windows executable and its Electron/Chromium DLL/PAK runtime cannot run as a native Mac app. A Mac build needs a macOS Electron runtime and app packaging configuration.

Positive evidence in the extracted files:

- Main-process code has `darwin` branches, including Dock icon handling and macOS lifecycle behavior.
- `serialport` 12 supports macOS, and `@serialport/bindings-cpp` includes `prebuilds/darwin-x64+arm64/node.napi.node`. `file` identifies it as a universal Mach-O binary for both x86_64 and arm64.
- TCP connections use Node's `net` module.

Open requirements before a Mac build can be planned in detail:

- Identify the Electron version and recover the original build/packaging configuration or recreate it reproducibly.
- Confirm the native serial binding loads under that Electron runtime.
- Test the custom frameless window, controls, Dock behavior, serial devices, TCP, and file paths on macOS.
- Sign and notarize the app if it will be distributed outside a local test machine.

The current evidence supports investigating a Mac port, but does not prove that a complete Mac app can be built from this extracted distribution alone.

## GitHub Upload Considerations

This checkout has no `.git` repository or configured remote, so it cannot be pushed to GitHub from its current state. The working directory is about 684 MB. It includes files larger than GitHub's regular Git file limit: `Device Manager.exe` is 176,827,904 bytes, and each `app.asar` copy is 145,451,864 bytes. GitHub blocks regular Git files over 100 MiB. Git LFS or GitHub Releases can handle large binaries, but LFS storage and bandwidth depend on the account plan.

The extracted folder also includes about 126 MB of `node_modules`. Uploading the entire distribution and dependencies would create a large, mostly generated/vendor repository. Before publishing, confirm the repository URL, choose whether binaries and dependencies belong there, and review redistribution rights and secrets. Prefer committing documentation and maintainable source; use Releases or LFS for binaries when necessary.

References: [GitHub large-file limits](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage).
