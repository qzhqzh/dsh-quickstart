'use strict'

const http = require('http')
const { spawn, execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const DEFAULT_PORT = 3080
const DEFAULT_TIMEOUT = 90000

/**
 * Poll `url` until it answers (any response completes), resolving true on the
 * first response and rejecting after `timeoutMs`.
 */
function waitForServer(url, timeoutMs = DEFAULT_TIMEOUT, intervalMs = 1000) {
  return new Promise((resolve, reject) => {
    let done = false
    const deadline = Date.now() + timeoutMs

    const scheduleNext = () => {
      if (done) return
      if (Date.now() >= deadline) {
        done = true
        reject(new Error(`Timed out after ${timeoutMs}ms waiting for ${url}`))
        return
      }
      setTimeout(probe, intervalMs)
    }

    const probe = () => {
      if (done) return
      const req = http.get(url, (res) => {
        res.resume()
        if (!done) {
          done = true
          resolve(true)
        }
      })
      req.on('error', () => {})
      req.on('close', scheduleNext)
      req.setTimeout(2000, () => req.destroy())
    }

    probe()
  })
}

/** Open `url` in the default browser without blocking. */
function openBrowser(url) {
  let cmd
  let args
  if (process.platform === 'win32') {
    cmd = 'cmd'
    args = ['/c', 'start', '', url]
  } else if (process.platform === 'darwin') {
    cmd = 'open'
    args = [url]
  } else {
    cmd = 'xdg-open'
    args = [url]
  }
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true, windowsHide: true })
  child.unref()
  return child
}

/**
 * Spawn `dsh` (or another command) detached and hidden. On Windows the console
 * window is hidden via `windowsHide`, so no terminal box appears.
 */
function startDsh(args, opts = {}) {
  const {
    cwd = process.cwd(),
    command = 'dsh',
    detached = true,
    hidden = true,
  } = opts
  const child = spawn(command, args, {
    cwd,
    detached,
    stdio: detached ? 'ignore' : 'inherit',
    windowsHide: hidden,
    shell: process.platform === 'win32',
  })
  if (detached) child.unref()
  return child
}

/**
 * Start dsh in the background, wait for the web UI to answer, then (by default)
 * open it in the browser.
 */
async function launch(opts = {}) {
  const {
    port = DEFAULT_PORT,
    timeout = DEFAULT_TIMEOUT,
    open = true,
    command = 'dsh',
    dshArgs = ['web'],
    cwd = process.cwd(),
    wait = true,
  } = opts
  const url = `http://127.0.0.1:${port}`
  startDsh(dshArgs, { command, cwd })
  if (!wait) return { url }
  await waitForServer(url, timeout)
  if (open) openBrowser(url)
  return { url }
}

/** Install a desktop shortcut that launches dsh via this tool. */
function installShortcut(opts = {}) {
  const merged = Object.assign({}, opts)
  if (merged.iconPath == null) merged.iconPath = defaultIcon()
  if (process.platform === 'win32') return installWindowsShortcut(merged)
  if (process.platform === 'darwin') return installMacShortcut(merged)
  return installLinuxShortcut(merged)
}

/** Bundled icon shipped in assets/ (multi-size .ico on Windows, PNG elsewhere). */
function defaultIcon() {
  const ext = process.platform === 'win32' ? 'dsh.ico' : 'dsh.png'
  return path.join(__dirname, '..', 'assets', ext)
}

function installWindowsShortcut(opts = {}) {
  const {
    name = 'DeepSeek',
    iconPath = null,
    workingDir = process.cwd(),
    output = null,
    command = 'dsh-quickstart',
    port = DEFAULT_PORT,
  } = opts
  const lnkPath = output || path.join(os.homedir(), 'Desktop', `${name}.lnk`)
  const dir = path.dirname(lnkPath)
  fs.mkdirSync(dir, { recursive: true })

  // The .vbs hides the console of the launcher itself; the launcher then hides
  // dsh via windowsHide. Net result: no terminal window at all.
  const vbsPath = path.join(dir, `${name}-launcher.vbs`)
  fs.writeFileSync(vbsPath, '\ufeff' + buildWindowsLauncherVbs(command, port, workingDir), 'utf16le')

  const ps = [
    '$ws = New-Object -ComObject WScript.Shell',
    `$lnk = $ws.CreateShortcut('${psQuote(lnkPath)}')`,
    '$lnk.TargetPath = "$env:windir\\System32\\wscript.exe"',
    `$lnk.Arguments = '"${psQuote(vbsPath)}"'`,
    `$lnk.WorkingDirectory = '${psQuote(workingDir)}'`,
    iconPath ? `$lnk.IconLocation = '${psQuote(iconPath)},0'` : null,
    '$lnk.Save()',
  ].filter(Boolean).join('\n')
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore', windowsHide: true })
  return lnkPath
}

/** Build the hidden-console VBScript launcher body (Windows only). */
function buildWindowsLauncherVbs(command, port, workingDir) {
  return [
    "' DeepSeek Harness launcher (hidden console, auto-open browser)",
    'Set WshShell = CreateObject("WScript.Shell")',
    `WshShell.CurrentDirectory = "${vbsQuote(workingDir)}"`,
    `WshShell.Run "cmd /c ${command} --port ${port}", 0, False`,
  ].join('\r\n')
}

function installMacShortcut(opts = {}) {
  const {
    name = 'DeepSeek',
    workingDir = process.cwd(),
    output = null,
    command = 'dsh-quickstart',
    port = DEFAULT_PORT,
  } = opts
  const cmdPath = output || path.join(os.homedir(), 'Desktop', `${name}.command`)
  const script = `#!/bin/bash\ncd "${String(workingDir).replace(/"/g, '\\"')}"\n${command} --port ${port}\n`
  fs.writeFileSync(cmdPath, script, { mode: 0o755 })
  return cmdPath
}

function installLinuxShortcut(opts = {}) {
  const {
    name = 'DeepSeek',
    workingDir = process.cwd(),
    output = null,
    command = 'dsh-quickstart',
    port = DEFAULT_PORT,
    iconPath = null,
  } = opts
  const desktopPath = output || path.join(
    os.homedir(),
    '.local',
    'share',
    'applications',
    `${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.desktop`,
  )
  fs.mkdirSync(path.dirname(desktopPath), { recursive: true })
  const content = [
    '[Desktop Entry]',
    'Type=Application',
    `Name=${name}`,
    `Exec=${command} --port ${port}`,
    `Path=${workingDir}`,
    'Terminal=false',
    iconPath ? `Icon=${iconPath}` : null,
  ].filter(Boolean).join('\n') + '\n'
  fs.writeFileSync(desktopPath, content)
  return desktopPath
}

function psQuote(s) { return String(s).replace(/'/g, "''") }
function vbsQuote(s) { return String(s).replace(/"/g, '""') }

module.exports = {
  DEFAULT_PORT,
  DEFAULT_TIMEOUT,
  waitForServer,
  openBrowser,
  startDsh,
  launch,
  installShortcut,
  installWindowsShortcut,
  installMacShortcut,
  installLinuxShortcut,
  buildWindowsLauncherVbs,
}
