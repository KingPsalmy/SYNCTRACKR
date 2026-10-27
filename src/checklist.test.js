import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChecklist } from './checklist.js'

test('deduplicates plugin installs across tracks while preserving distinct versions', () => {
  const { installs } = buildChecklist([
    { name: 'EQ', version: '1', track: 'Vocal' },
    { name: ' eq ', version: '1', track: 'Bass' },
    { name: 'EQ', version: '2', track: 'Drums' },
  ])
  assert.equal(installs.length, 2)
  assert.deepEqual(installs[0].tracks, ['Vocal', 'Bass'])
  assert.equal(installs[1].version, '2')
})

test('orders presets by track and signal chain without changing input', () => {
  const plugins = [
    { id: 'b', name: 'Delay', track: 'Vocal', chain_order: 2, preset: 'Wide' },
    { id: 'a', name: 'EQ', track: 'Vocal', chain_order: 1, preset: 'Air' },
    { id: 'c', name: 'Synth', track: 'Bass', chain_order: 1, preset: '' },
  ]
  const original = structuredClone(plugins)
  assert.deepEqual(buildChecklist(plugins).presets.map(p => p.key), ['a', 'b'])
  assert.deepEqual(plugins, original)
})

test('handles empty notes and missing optional metadata', () => {
  assert.deepEqual(buildChecklist([]), { installs: [], presets: [] })
  const { installs, presets } = buildChecklist([{ name: 'Synth' }])
  assert.equal(installs[0].version, '')
  assert.deepEqual(installs[0].tracks, ['No track'])
  assert.deepEqual(presets, [])
})
