#!/usr/bin/env node
'use strict'

const {
  launch,
  watch,
  loadConfig,
  installShortcut,
  DEFAULT_PORT,
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_RESTARTS,
  DEFAULT_RESTART_DELAY_MS,
} = require('../lib')
const pkg = require('../package.json')

const HELP = `dsh-quickstart ${pkg.version} — launch DeepSeek Harness (dsh web) without a
console window, then open the browser as soon as it is ready.

Usage:
  dsh-quickstart [options]           start dsh web, wait, open browser
  dsh-quickstart watch [options]     run dsh under a watchdog (auto-restart)
  dsh-quickstart shortcut [options]  install a desktop shortcut
  dsh-quickstart --help              show this help
  dsh-quickstart --version           print version

The default command stays a plain launch. To opt into the watchdog by default,
set "watch": true in ~/.dsh-quickstart.json. --watch / --no-watch override it.

Launch options:
  --port <n>       port to wait on           (default ${DEFAULT_PORT})
  --timeout <ms>   wait timeout              (default ${DEFAULT_TIMEOUT})
  --command <cmd>  command used to start dsh (default "dsh")
  --no-open        do not open the browser
  --no-wait        exit immediately after spawning, without polling
  -- <args...>     extra args passed to dsh  (default "web")

Watch options (dsh-quickstart watch, or default when watch:true in config):
  --watch          enable watchdog mode (overrides config)
  --no-watch       disable watchdog mode (overrides config)
  --max-restarts <n>   give up after n restarts  (default ${DEFAULT_MAX_RESTARTS})
  --restart-delay <ms> delay between restarts    (default ${DEFAULT_RESTART_DELAY_MS})

Shortcut options:
  --name <n>       shortcut label            (default "DeepSeek")
  --icon <path>    .ico icon path
  --working-dir <d> working directory        (default current dir)
  --output <path>  write shortcut to a custom path (default Desktop)
  --port <n>       port for the launcher     (default ${DEFAULT_PORT})

Requires a DeepSeek Harness install on PATH:  npm i -g @deepseek-ai/dsh
`

function fail(msg) {
  console.error('dsh-quickstart: ' + msg)
  process.exit(1)
}

function parseLaunch(argv) {
  const opts = {
    port: DEFAULT_PORT,
    timeout: DEFAULT_TIMEOUT,
    open: true,
    command: 'dsh',
    dshArgs: ['web'],
    wait: true,
    watch: undefined,
    maxRestarts: DEFAULT_MAX_RESTARTS,
    restartDelayMs: DEFAULT_RESTART_DELAY_MS,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--port') opts.port = Number(argv[++i])
    else if (a === '--timeout') opts.timeout = Number(argv[++i])
    else if (a === '--command') opts.command = argv[++i]
    else if (a === '--no-open') opts.open = false
    else if (a === '--no-wait') opts.wait = false
    else if (a === '--watch') opts.watch = true
    else if (a === '--no-watch') opts.watch = false
    else if (a === '--max-restarts') opts.maxRestarts = Number(argv[++i])
    else if (a === '--restart-delay') opts.restartDelayMs = Number(argv[++i])
    else if (a === '--') { opts.dshArgs = argv.slice(i + 1); break }
    else if (a.startsWith('-')) fail('unknown option: ' + a)
    else { opts.dshArgs = argv.slice(i); break }
  }
  if (!Number.isFinite(opts.port)) fail('--port must be a number')
  if (!Number.isFinite(opts.timeout)) fail('--timeout must be a number')
  if (!Number.isFinite(opts.maxRestarts) || opts.maxRestarts < 0) fail('--max-restarts must be a non-negative number')
  if (!Number.isFinite(opts.restartDelayMs) || opts.restartDelayMs < 0) fail('--restart-delay must be a non-negative number')
  return opts
}

function parseShortcut(argv) {
  const opts = {
    name: 'DeepSeek',
    iconPath: null,
    workingDir: process.cwd(),
    output: null,
    port: DEFAULT_PORT,
  }
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--name') opts.name = argv[++i]
    else if (a === '--icon') opts.iconPath = argv[++i]
    else if (a === '--working-dir') opts.workingDir = argv[++i]
    else if (a === '--output') opts.output = argv[++i]
    else if (a === '--port') opts.port = Number(argv[++i])
    else fail('unknown shortcut option: ' + a)
  }
  if (!Number.isFinite(opts.port)) fail('--port must be a number')
  return opts
}

async function main() {
  const argv = process.argv.slice(2)
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP)
    return
  }
  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(pkg.version + '\n')
    return
  }

  if (argv[0] === 'shortcut') {
    const opts = parseShortcut(argv)
    const lnk = installShortcut(opts)
    process.stdout.write('Shortcut installed: ' + lnk + '\n')
    return
  }

  // `dsh-quickstart watch` explicitly opts into the watchdog. The bare command
  // stays a plain launch unless the user sets watch:true in the config file
  // (or passes --watch). --no-watch always forces plain launch.
  const isWatchCommand = argv[0] === 'watch'
  const opts = parseLaunch(isWatchCommand ? argv.slice(1) : argv)

  const config = loadConfig()
  const wantWatch = isWatchCommand
    ? true
    : opts.watch !== undefined
      ? opts.watch
      : config.watch === true

  if (wantWatch) {
    watch(opts)
    return
  }

  const { url } = await launch(opts)
  process.stdout.write(`DSH ready at ${url}${opts.open ? ' — browser opened' : ''}\n`)
}

main().catch((err) => fail(err.message))
