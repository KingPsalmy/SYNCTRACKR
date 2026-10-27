import test from 'node:test'
import assert from 'node:assert/strict'
import { versionLabel } from './versionLabel.js'

test('deleting another version never renumbers the remaining versions', () => {
  const versions = [{ id: 'a', version_number: 1 }, { id: 'b', version_number: 2 }, { id: 'c', version_number: 3 }]
  assert.deepEqual(versions.filter(v => v.id !== 'b').map(versionLabel), ['Version 1', 'Version 3'])
  assert.equal(versionLabel({ version_number: 4 }), 'Version 4')
})

test('legacy or invalid numbering never gets an invented number', () => {
  for (const version_number of [undefined, null, -1, 1.5, '2']) {
    assert.equal(versionLabel({ version_number }), 'Saved version')
  }
  assert.equal(versionLabel({ version_number: 0 }), 'Version 0')
})
