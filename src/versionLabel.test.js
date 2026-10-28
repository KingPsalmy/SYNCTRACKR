import test from 'node:test'
import assert from 'node:assert/strict'
import { buildVersionLabels } from './versionLabel.js'

test('a single remaining version displays Version 1 without resetting its stored counter', () => {
  const commit = Object.freeze({ id: 'a', project_id: 'music', version_number: 8 })
  assert.equal(buildVersionLabels([commit]).get('a'), 'Version 1')
  assert.equal(commit.version_number, 8)
})

test('deletions renumber the visible history and new saves follow it', () => {
  const versions = [3, 5, 8].map(n => Object.freeze({ id: String(n), project_id: 'music', version_number: n }))
  const labels = rows => [...buildVersionLabels(rows).values()]
  assert.deepEqual(labels(versions), ['Version 1', 'Version 2', 'Version 3'])
  assert.deepEqual(labels(versions.filter(v => v.id !== '5')), ['Version 1', 'Version 2'])
  assert.deepEqual(labels([...versions.slice(0, 2), {id: '9', project_id: 'music', version_number: 9}]), ['Version 1', 'Version 2', 'Version 3'])
  assert.deepEqual(versions.map(v => v.version_number), [3, 5, 8])
})

test('project histories are independent of input order and note contents', () => {
  const commits = [
    { id: 'new', project_id: 'a', created_at: '2026-10-28T12:00:00', message: 'Version 99' },
    { id: 'other', project_id: 'b', version_number: 20 },
    { id: 'old', project_id: 'a', created_at: '2026-10-27T12:00:00' },
  ]
  const labels = buildVersionLabels(commits)
  assert.equal(labels.get('old'), 'Version 1')
  assert.equal(labels.get('new'), 'Version 2')
  assert.equal(labels.get('other'), 'Version 1')
  assert.deepEqual(buildVersionLabels([...commits].reverse()), labels)
  assert.deepEqual(commits.map(c => c.id), ['new', 'other', 'old'])
  assert.equal(buildVersionLabels([]).size, 0)
})
