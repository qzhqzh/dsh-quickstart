# dsh-quickstart

Launch [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh web`)
**without a console window**, then **open the browser automatically** once the web UI
is ready. Cross-platform, zero dependencies.

Stop typing `npx @deepseek-ai/dsh web` and waiting for the page by hand — this
double-click-and-go wrapper handles startup, readiness polling, and browser opening.

## Why

- `dsh web` blocks a terminal window and gives no feedback on when it is ready.
- Starting it from a desktop shortcut shows an ugly console box.
- Users who double-click and see nothing think the tool is broken.

`dsh-quickstart` starts `dsh web` detached and hidden, polls `http://127.0.0.1:<port>`
until it answers, then opens your default browser. A desktop shortcut created with
`dsh-quickstart shortcut` shows no console window at all.

## Install

```bash
# the launcher
npm i -g dsh-quickstart

# the harness itself (required)
npm i -g @deepseek-ai/dsh
```

## Usage

```bash
# start dsh web, wait for readiness, open the browser
dsh-quickstart

# custom port / timeout
dsh-quickstart --port 3000 --timeout 120000

# wait but do not open the browser
dsh-quickstart --no-open

# spawn and exit immediately (no polling)
dsh-quickstart --no-wait

# pass extra args to dsh
dsh-quickstart -- web --port 3000
```

Install a desktop shortcut (double-click to launch, no console window):

```bash
# Windows (.lnk), with an .ico
dsh-quickstart shortcut --name "DeepSeek" --icon "C:\path\to\icon.ico" --working-dir "D:\your\workdir"

# macOS (.command)
dsh-quickstart shortcut --name "DeepSeek"

# Linux (.desktop)
dsh-quickstart shortcut --name "DeepSeek"
```

## Options

| Option | Default | Description |
| --- | --- | --- |
| `--port <n>` | `3080` | Port to poll |
| `--timeout <ms>` | `90000` | How long to wait for readiness |
| `--command <cmd>` | `dsh` | Command used to start dsh (e.g. `npx @deepseek-ai/dsh`) |
| `--no-open` | — | Do not open the browser |
| `--no-wait` | — | Exit immediately after spawning |

Shortcut-only: `--name`, `--icon`, `--working-dir`, `--output`.

## How it works

1. `startDsh` spawns `dsh web` detached with `windowsHide: true` (no console window).
2. `waitForServer` polls the port every second until the server answers (or times out).
3. `openBrowser` opens the URL with the platform default (`start` / `open` / `xdg-open`).
4. On Windows, `shortcut` writes a tiny `.vbs` that hides the launcher's own console,
   plus a `.lnk` pointing at it — so double-clicking shows nothing but the browser.

## Icons / assets

The project ships its icon assets in `assets/`:

| File | Description |
| --- | --- |
| `assets/dsh.png` | Source icon — transparent background, 1254×1254 |
| `assets/dsh.ico` | Multi-size Windows icon (256/128/64/48/32/16) generated from `dsh.png` |

`dsh-quickstart shortcut` uses the bundled icon by default, so a shortcut created
on Windows already carries the DSH look. Override it with `--icon <path>` if you
want your own. More icon assets (alternate sizes, variants) can be dropped into
`assets/` following the same `dsh.png` / `dsh.ico` convention.

## License

MIT
