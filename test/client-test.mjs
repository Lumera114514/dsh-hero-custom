// dsh-hero-custom — client half logic test.
// 1) syntax-check the whole client script
// 2) run it in a stubbed environment (window.__ModuleLoader__ + require("react"))
// 3) exercise the pure __test hooks (deepMerge / glowShadow / effectClass /
//    applyHeroSettings) against fake elements.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, '..', 'lib', 'client.js'), 'utf8')

// --- 1) syntax check: the script body must parse as a function ---
test('client.js is syntactically valid', () => {
  assert.doesNotThrow(() => new Function(src), 'script must parse')
})

// --- 2) execute with stubs ---
const reactStub = {
  useState: () => [false, () => {}],
  useSyncExternalStore: () => null,
}
let captured = null
const windowStub = {
  __ModuleLoader__: {
    load(meta) { captured = meta },
  },
}
new Function('window', 'require', src)(windowStub, (id) => {
  if (id === 'react') return reactStub
  throw new Error('unexpected require: ' + id)
})
assert.ok(captured, 'must call __ModuleLoader__.load')
assert.equal(captured.id, 'dsh-hero-custom')

const mod = captured.factory((id) => {
  if (id === 'react') return reactStub
  throw new Error('unexpected require: ' + id)
})
const T = mod.__test
assert.ok(T, 'must export __test hooks')

// --- 3) pure logic tests ---
function fakeEl() {
  const el = {
    textContent: '',
    children: [],
    _attrs: {},
    _cls: new Set(),
    style: {
      fontSize: '', fontFamily: '', color: '', textShadow: '', transform: '', display: '',
      props: {},
      setProperty(n, v) { this.props[n] = v },
    },
    setAttribute(n, v) { this._attrs[n] = v },
    getAttribute(n) { return this._attrs[n] ?? null },
    classList: {
      add(...cs) { cs.forEach((c) => el._cls.add(c)) },
      remove(...cs) { cs.forEach((c) => el._cls.delete(c)) },
      contains(c) { return el._cls.has(c) },
    },
  }
  return el
}

const base = { enabled: true, headline: '探索未至之境', preview: '预览版', size: 0, color: '', font: '', posX: 0, posY: 0, glow: { enabled: false, color: '#5b8cff', radius: 16, intensity: 1 }, effect: 'none' }

test('deepMerge: partial saved settings merge over defaults', () => {
  const d = T.DEFAULTS
  const merged = T.deepMerge(d, { hero: { headline: '你好' }, master: false })
  assert.equal(merged.hero.headline, '你好')
  assert.equal(merged.hero.preview, '预览版', 'unset fields keep defaults')
  assert.equal(merged.hero.glow.enabled, false, 'nested defaults kept')
  assert.equal(merged.master, false)
})

test('glowShadow: disabled returns empty', () => {
  assert.equal(T.glowShadow({ enabled: false }), '')
})

test('glowShadow: enabled builds layered rgba shadows', () => {
  const g = T.glowShadow({ enabled: true, color: '#5b8cff', radius: 16, intensity: 2 })
  assert.ok(g.includes('0 0 8px rgba(91, 140, 255, 0.9)'), 'first layer at half radius: ' + g)
  assert.ok(g.includes('0 0 16px rgba(91, 140, 255, 0.45)'), 'second layer full radius: ' + g)
})

test('glowShadow: intensity clamps 1..4, radius clamps 0..60', () => {
  const countLayers = (g) => (g.match(/rgba\(/g) || []).length
  const g = T.glowShadow({ enabled: true, color: '#fff', radius: 999, intensity: 99 })
  assert.equal(countLayers(g), 4, 'max 4 layers')
  assert.ok(g.includes('0 0 60px'), 'radius capped: ' + g)
  assert.equal(countLayers(T.glowShadow({ enabled: true, color: '#fff', radius: -5, intensity: 0 })), 1)
})

test('effectClass maps effect names', () => {
  assert.equal(T.effectClass('flow'), 'uie-hc-effect-flow')
  assert.equal(T.effectClass('pulse'), 'uie-hc-effect-pulse')
  assert.equal(T.effectClass('rainbow'), 'uie-hc-effect-rainbow')
  assert.equal(T.effectClass('none'), '')
  assert.equal(T.effectClass('bogus'), '')
})

test('applyHeroSettings: headline text, size, color, font, position', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'headline', Object.assign({}, base, {
    headline: '你好世界', size: 32, color: '#ff0000', font: 'KaiTi', posX: 10, posY: -5,
  }))
  assert.equal(el.textContent, '你好世界')
  assert.equal(el.style.fontSize, '32px')
  assert.equal(el.style.color, '#ff0000')
  assert.equal(el.style.fontFamily, 'KaiTi')
  assert.equal(el.style.transform, 'translate(10px, -5px)')
  assert.equal(el.style.textShadow, '')
  assert.equal(el._cls.size, 0, 'no effect class for none')
})

test('applyHeroSettings: glow produces text-shadow', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'headline', Object.assign({}, base, { glow: { enabled: true, color: '#5b8cff', radius: 16, intensity: 1 } }))
  assert.ok(el.style.textShadow.includes('rgba(91, 140, 255'), 'text-shadow set: ' + el.style.textShadow)
})

test('applyHeroSettings: flow effect sets gradient var, clears color/shadow, adds class', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'headline', Object.assign({}, base, { effect: 'flow', color: '#ff0000', glow: { enabled: true, color: '#00ff00' } }))
  assert.equal(el.style.props['--uie-hc-glow'], '#00ff00')
  assert.equal(el.style.color, '', 'flow owns color')
  assert.equal(el.style.textShadow, '', 'flow owns shadow')
  assert.ok(el._cls.has('uie-hc-effect-flow'))
  assert.equal(el.getAttribute('data-uie-hc-effect'), 'uie-hc-effect-flow')
  // switching effect removes the old class
  T.applyHeroSettings(el, 'headline', Object.assign({}, base, { effect: 'pulse' }))
  assert.ok(!el._cls.has('uie-hc-effect-flow'))
  assert.ok(el._cls.has('uie-hc-effect-pulse'))
})

test('applyHeroSettings: empty preview hides badge', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'preview', Object.assign({}, base, { preview: '' }))
  assert.equal(el.style.display, 'none')
  const el2 = fakeEl()
  T.applyHeroSettings(el2, 'preview', Object.assign({}, base, { preview: '测试' }))
  assert.equal(el2.textContent, '测试')
  assert.equal(el2.style.display, '', 'shown when text present')
})

test('applyHeroSettings: headline text replaced in place', () => {
  const el = fakeEl()
  el.textContent = '探索未至之境'
  T.applyHeroSettings(el, 'headline', Object.assign({}, base, { headline: '新标题' }))
  assert.equal(el.textContent, '新标题')
})

test('fishEffectClass maps fish effects', () => {
  assert.equal(T.fishEffectClass('swim'), 'uie-hc-fish-swim')
  assert.equal(T.fishEffectClass('bounce'), 'uie-hc-fish-bounce')
  assert.equal(T.fishEffectClass('spin'), 'uie-hc-fish-spin')
  assert.equal(T.fishEffectClass('wiggle'), 'uie-hc-fish-wiggle')
  assert.equal(T.fishEffectClass('pulse'), 'uie-hc-fish-pulse')
  assert.equal(T.fishEffectClass('none'), '')
  assert.equal(T.fishEffectClass('bogus'), '')
})

test('applyHeroSettings: fish size keeps ratio and color applies', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'fish', Object.assign({}, base, { fish: { size: 48, color: '#ff0000', effect: 'none' } }))
  assert.equal(el.style.width, '48px')
  const expectedH = Math.round(48 * 17.04 / 23.16 * 100) / 100
  assert.equal(el.style.height, expectedH + 'px')
  assert.equal(el.style.color, '#ff0000')
  assert.equal(el._cls.size, 0, 'no effect class for none')
})

test('applyHeroSettings: fish effect class switches and clears', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'fish', Object.assign({}, base, { fish: { size: 0, color: '', effect: 'spin' } }))
  assert.ok(el._cls.has('uie-hc-fish-spin'))
  assert.equal(el.getAttribute('data-uie-hc-fish-effect'), 'uie-hc-fish-spin')
  T.applyHeroSettings(el, 'fish', Object.assign({}, base, { fish: { size: 0, color: '', effect: 'bounce' } }))
  assert.ok(!el._cls.has('uie-hc-fish-spin'))
  assert.ok(el._cls.has('uie-hc-fish-bounce'))
  T.applyHeroSettings(el, 'fish', Object.assign({}, base, { fish: { size: 0, color: '', effect: 'none' } }))
  assert.equal(el._cls.size, 0)
})

test('applyHeroSettings: fish default size clears width/height', () => {
  const el = fakeEl()
  T.applyHeroSettings(el, 'fish', Object.assign({}, base, { fish: { size: 0, color: '', effect: 'none' } }))
  assert.equal(el.style.width, '')
  assert.equal(el.style.height, '')
})

test('hexToRgba handles 3/6 digit and alpha', () => {
  assert.equal(T.hexToRgba('#abc', 0.5), 'rgba(170, 187, 204, 0.5)')
  assert.equal(T.hexToRgba('#5b8cff', 0.9), 'rgba(91, 140, 255, 0.9)')
  assert.equal(T.hexToRgba('zzz', 1), 'rgba(0, 0, 0, 1)')
})

test('clamp bounds values', () => {
  assert.equal(T.clamp(5, 0, 10), 5)
  assert.equal(T.clamp(-3, 0, 10), 0)
  assert.equal(T.clamp(99, 0, 10), 10)
})
