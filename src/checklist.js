// Turns one version's plugin rows into the two lists a checklist needs.
export function buildChecklist(plugins) {
  // 1. Plugins to install: one entry per distinct name + version, remembering which tracks use it.
  const installs = []
  for (const p of plugins) {
    const key = `${p.name.trim().toLowerCase()}|${(p.version || "").trim().toLowerCase()}`
    let entry = installs.find(i => i.key === key)
    if (!entry) {
      entry = { key, name: p.name, version: p.version || "", tracks: [] }
      installs.push(entry)
    }
    const track = p.track || "No track"
    if (!entry.tracks.includes(track)) entry.tracks.push(track)
  }
  installs.sort((a, b) => a.name.localeCompare(b.name))

  // 2. Presets to load, in track order and then chain order.
  // .filter() makes a new array first, so .sort() never changes the original state.
  const presets = plugins
    .filter(p => p.preset)
    .sort((a, b) => (a.track || "").localeCompare(b.track || "") || (a.chain_order || 0) - (b.chain_order || 0))
    .map(p => ({ key: p.id, track: p.track || "No track", plugin: p.name, preset: p.preset }))

  return { installs, presets }
}
