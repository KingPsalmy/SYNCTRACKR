import { createHash } from 'node:crypto'

export const TEST_PREFIX = 'SyncTrackr acceptance '

export function validateOrigin(value) {
  const url = new URL(value)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/'
    || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new Error('Use an HTTPS app origin, or HTTP localhost, with no path or credentials.')
  }
  return url.origin
}

export function validateR2Url(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port
    || !/^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)) {
    throw new Error('The app did not return an expected R2 URL.')
  }
  return url.href
}

export function safeToCleanProject(actual, expected, commits) {
  return actual?.id === expected.id && actual.user_id === expected.userId
    && actual.name === expected.name && actual.name.startsWith(TEST_PREFIX)
    && commits.every(commit => expected.commitIds.includes(commit.id)
      && commit.user_id === expected.userId && commit.project_id === expected.id
      && (!commit.file_url || expected.keys.includes(commit.file_url)))
}

export const digest = bytes => createHash('sha256').update(bytes).digest('hex')

// Do not attach response bodies or URLs to errors: they can contain credentials
// or presigned storage links. Reports identify only the failed stage and status.
export async function expectJson(response, label) {
  if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`)
  try { return await response.json() } catch { throw new Error(`${label}: invalid JSON`) }
}
