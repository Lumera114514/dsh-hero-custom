// dsh-hero-custom — host half smoke test.
// Stubs ctx.webServer, exercises the route handler (GET/POST settings + 404),
// against a temp DSH_HOME so nothing touches the real home dir.
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
// Use a workspace-relative temp dir: os.tmpdir() may point at a sandbox
// session area that is not reliably writable for spawned writes.
const tmp = join(here, '..', '.tmp-test')
rmSync(tmp, { recursive: true, force: true })
mkdirSync(tmp, { recursive: true })
process.env.DSH_HOME = tmp
// node:test defers test() callbacks until after the module body, so any
// top-level cleanup must live in an after() hook, not at module end.
after(() => {
  rmSync(tmp, { recursive: true, force: true })
})

const { apply, inject } = await import('../lib/index.js')

assert.deepEqual(inject, ['webServer'], 'inject must declare webServer')

let registered = null
const ctx = {
  webServer: {
    register(spec) { registered = spec },
  },
  effect(fn) { fn() },
}
apply(ctx)

assert.ok(registered, 'apply must register a route')
assert.equal(registered.kind, 'prefix')
assert.equal(registered.path, '/dsh-hero-custom')
assert.equal(typeof registered.handler, 'function')

function makeRes() {
  const out = { status: 200, headers: {}, body: '' }
  return {
    setHeader(k, v) { out.headers[k] = v },
    end(c) { out.body += c == null ? '' : String(c) },
    statusCode: 200,
    set statusCode(v) { out.status = v },
    _out: out,
  }
}
function makeReq(method, url, body) {
  return {
    method, url,
    on(ev, cb) {
      if (ev === 'data' && body != null) cb(body)
      if (ev === 'end') cb()
    },
  }
}

const file = join(tmp, 'hero-custom.settings.json')

test('GET settings with no file returns null', () => {
  const res = makeRes()
  registered.handler(makeReq('GET', '/dsh-hero-custom/settings'), res)
  assert.equal(res._out.body, 'null')
})

test('POST settings persists to $DSH_HOME file', () => {
  const payload = JSON.stringify({ master: true, hero: { headline: '你好' } })
  const res = makeRes()
  registered.handler(makeReq('POST', '/dsh-hero-custom/settings', payload), res)
  assert.equal(res._out.body, '{"ok":true}')
  assert.ok(existsSync(file), 'settings file must be written')
  const saved = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(saved.hero.headline, '你好')
})

test('GET settings returns persisted JSON', () => {
  const res = makeRes()
  registered.handler(makeReq('GET', '/dsh-hero-custom/settings'), res)
  const parsed = JSON.parse(res._out.body)
  assert.equal(parsed.hero.headline, '你好')
})

test('unknown route returns 404 empty object', () => {
  const res = makeRes()
  registered.handler(makeReq('GET', '/dsh-hero-custom/nope'), res)
  assert.equal(res._out.status, 404)
  assert.equal(res._out.body, '{}')
})
