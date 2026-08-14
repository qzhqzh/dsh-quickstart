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
 * Spawn `dsh` (or another command) so it inherits the launcher's console. On
 * Windows the desktop shortcut runs the launcher inside a hidden console (see
 * buildWindowsLauncherVbs), so inheriting it keeps dsh and its whole process
 * tree off-screen. Using `detached` / `windowsHide` here would instead give dsh
 * its own visible console window (or no console, letting its descendants pop
 * their own visible windows).
 */
function startDsh(args, opts = {}) {
  const { cwd = process.cwd(), command = 'dsh' } = opts
  const child = spawn(command, args, {
    cwd,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  child.unref()
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
    port = DEFAULT_PORT,
    dshCommand = 'dsh',
    dshArgs = ['web'],
  } = opts
  const lnkPath = output || path.join(os.homedir(), 'Desktop', `${name}.lnk`)
  const dir = path.dirname(lnkPath)
  fs.mkdirSync(dir, { recursive: true })

  // The .vbs is self-contained: it starts `dsh web` in a hidden console, polls
  // the web UI, then opens the browser. It does not rely on Node's spawn
  // semantics, which are unreliable for hidden windows on Windows.
  const vbsPath = path.join(dir, `${name}-launcher.vbs`)
  fs.writeFileSync(vbsPath, '\ufeff' + buildWindowsLauncherVbs({ dshCommand, dshArgs, port, workingDir }), 'utf16le')

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

/**
 * Build a self-contained Windows VBScript launcher: start `dsh` hidden, poll the
 * web UI until ready, then open the default browser. Uses WshShell.Run for both
 * the hidden process launch and the browser open — the reliable mechanism on
 * Windows (a hidden console that descendants inherit).
 */
function buildWindowsLauncherVbs(opts = {}) {
  const {
    dshCommand = 'dsh',
    dshArgs = ['web'],
    port = DEFAULT_PORT,
    workingDir = process.cwd(),
    timeoutSec = 90,
  } = opts
  const dshLine = [dshCommand, ...dshArgs].join(' ')
  const url = `http://127.0.0.1:${port}`
  return [
    "' DeepSeek Harness launcher (hidden console, auto-open browser)",
    'Set WshShell = CreateObject("WScript.Shell")',
    `WshShell.CurrentDirectory = "${vbsQuote(workingDir)}"`,
    `WshShell.Run "cmd /c ${vbsQuote(dshLine)}", 0, False`,
    '',
    'Set http = CreateObject("MSXML2.XMLHTTP")',
    `deadline = DateAdd("s", ${timeoutSec}, Now)`,
    'ready = False',
    'Do',
    '    On Error Resume Next',
    `    http.Open "GET", "${url}", False`,
    '    http.Send',
    '    If Err.Number = 0 And http.Status = 200 Then ready = True',
    '    On Error GoTo 0',
    '    If ready Then Exit Do',
    '    WScript.Sleep 1000',
    'Loop While Now < deadline',
    '',
    'If ready Then',
    `    WshShell.Run "${url}", 1, False`,
    'End If',
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
