// dsh-hero-custom — host half.
// Persists the browser half's settings to $DSH_HOME/hero-custom.settings.json
// and serves them over /dsh-hero-custom/* routes (same pattern as
// @local/dsh-ui-enhance). No agent tracking needed: this plugin only
// customizes the new-conversation hero title.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const inject = ['webServer']

function settingsPath() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  return join(home, 'hero-custom.settings.json')
}

function apply(ctx) {
  const handler = (req, res) => {
    const url = (req.url || '').split('?')[0]
    try {
      if (req.method === 'GET' && url === '/dsh-hero-custom/settings') {
        res.setHeader('content-type', 'application/json')
        try {
          res.end(readFileSync(settingsPath(), 'utf8'))
        } catch {
          res.end('null')
        }
        return
      }
      if (req.method === 'POST' && url === '/dsh-hero-custom/settings') {
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            writeFileSync(settingsPath(), body, 'utf8')
          } catch (err) {
            console.error('[dsh-hero-custom] save settings failed', err)
          }
          res.setHeader('content-type', 'application/json')
          res.end('{"ok":true}')
        })
        return
      }
    } catch (err) {
      console.error('[dsh-hero-custom] route error', err)
    }
    res.statusCode = 404
    res.setHeader('content-type', 'application/json')
    res.end('{}')
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/dsh-hero-custom',
    handler,
  }), 'dsh-hero-custom: routes')

  console.log('[dsh-hero-custom] host half ready')
}

export { apply, inject }
