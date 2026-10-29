import fs from 'node:fs/promises'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import { validateOrigin } from './acceptance-support.mjs'
import { runAcceptance } from './acceptance-suite.mjs'

async function readEnv(path) {
  try { return parseEnv(await fs.readFile(path, 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw new Error('Could not read local acceptance configuration.')
  }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  if ([...args].some(arg => !['--run', '--allow-production'].includes(arg))) throw new Error('Unknown argument.')
  const frontend = await readEnv('.env')
  const local = await readEnv('.env.acceptance.local')
  const origin = validateOrigin(local.ACCEPTANCE_APP_ORIGIN || 'https://synctrackr.pages.dev')
  const config = {
    origin, supabaseUrl: frontend.VITE_SUPABASE_URL, anonKey: frontend.VITE_SUPABASE_ANON_KEY,
    accounts: ['A', 'B'].map(label => ({ email: local[`ACCEPTANCE_EMAIL_${label}`], password: local[`ACCEPTANCE_PASSWORD_${label}`] })),
  }
  const required = ['ACCEPTANCE_EMAIL_A', 'ACCEPTANCE_PASSWORD_A', 'ACCEPTANCE_EMAIL_B', 'ACCEPTANCE_PASSWORD_B']
  const missing = required.filter(key => !local[key])
  if (!config.supabaseUrl) missing.push('VITE_SUPABASE_URL (.env)')
  if (!config.anonKey) missing.push('VITE_SUPABASE_ANON_KEY (.env)')
  console.log(`Target: ${origin}`)
  if (!args.has('--run')) {
    console.log('Preflight only. No network requests or data changes.')
    console.log(missing.length ? `Missing local settings: ${missing.join(', ')}` : 'Required settings are present (credentials have not been tested).')
    console.log('Read tests/acceptance/README.md before running the live checks.')
    return
  }
  if (missing.length) throw new Error(`Missing local settings: ${missing.join(', ')}`)
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)
  if (!isLocal && !args.has('--allow-production')) throw new Error('Remote runs require --allow-production. Use disposable accounts only.')
  const database = new URL(config.supabaseUrl)
  if (database.protocol !== 'https:' || database.username || database.password || database.search || database.hash
    || !/^[a-z0-9]+\.supabase\.co$/.test(database.hostname) || database.pathname !== '/') {
    throw new Error('Expected the existing hosted Supabase project URL in .env.')
  }
  config.supabaseUrl = database.origin
  const runId = randomUUID()
  await fs.mkdir('.wrangler/acceptance', { recursive: true })
  const reportPath = `.wrangler/acceptance/${runId}.json`
  const report = await runAcceptance(config, {
    runId,
    checkpoint: async state => fs.writeFile(reportPath, JSON.stringify(state, null, 2)),
    log: label => console.log(label),
  })
  console.log(`Report: ${reportPath}`)
  console.log(report.passed ? 'PASS: live API and byte-roundtrip checks completed.' : 'FAIL: review the report; do not mark the release gates complete.')
  if (!report.passed) process.exitCode = 1
}

main().catch(error => {
  // Only local configuration errors are surfaced here. Network errors are
  // caught and redacted inside the suite.
  console.error(error.message)
  process.exitCode = 1
})
