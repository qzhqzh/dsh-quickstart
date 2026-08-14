'use strict'

const http = require('http')
const assert = require('assert')
const { waitForServer, buildWindowsLauncherVbs, DEFAULT_PORT } = require('../lib')

;(async () => {
  // 1. waitForServer resolves once a server answers.
  const server = http.createServer((req, res) => { res.writeHead(200); res.end('ok') })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const port = server.address().port
  const url = `http://127.0.0.1:${port}`

  const t0 = Date.now()
  const ok = await waitForServer(url, 5000, 100)
  assert.strictEqual(ok, true, 'waitForServer should resolve')
  assert.ok(Date.now() - t0 < 5000, 'poll should resolve quickly')
  server.close()

  // 2. waitForServer rejects when nothing answers.
  await assert.rejects(
    () => waitForServer(url, 400, 100),
    /Timed out/,
    'waitForServer should reject on timeout',
  )

  // 3. Windows VBS launcher content is correct.
  const vbs = buildWindowsLauncherVbs({ dshCommand: 'dsh', dshArgs: ['web'], port: DEFAULT_PORT, workingDir: 'D:\\DHS' })
  assert.ok(vbs.includes('cmd /c dsh web'), 'vbs should carry the dsh command')
  assert.ok(vbs.includes('WScript.Shell'), 'vbs should create the shell object')
  assert.ok(vbs.includes('D:\\DHS'), 'vbs should set the working directory')
  assert.ok(vbs.includes('MSXML2.XMLHTTP'), 'vbs should poll readiness')
  assert.ok(vbs.includes('http://127.0.0.1:3080'), 'vbs should target the web UI')

  console.log('smoke PASS')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
