import { useEffect, useState } from "react"
import { supabase } from "./supabase"
import { c } from "./theme"
import RestoreChecklist from "./RestoreChecklist"

// Shows and edits the plugins recorded for ONE saved version (commit),
// and can open a restore checklist built from them.
export default function PluginNotes({ commitId, title, fileName, hasFile, onDownload, downloading }) {
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showRestore, setShowRestore] = useState(false)
  const [form, setForm] = useState({ track: "", name: "", version: "", preset: "" })

  // Load this version's plugins whenever the version changes.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      const { data, error } = await supabase
        .from("plugins")
        .select("*")
        .eq("commit_id", commitId)
      if (cancelled) return // a newer request replaced this one, so drop its answer
      if (error) setError(error.message)
      else setPlugins(data)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [commitId])

  // Sort by track name, then by position in the chain, then group by track.
  const sorted = [...plugins].sort(
    (a, b) => (a.track || "").localeCompare(b.track || "") || (a.chain_order || 0) - (b.chain_order || 0)
  )
  const groups = Object.create(null)
  for (const p of sorted) {
    const key = p.track || "No track"
    if (!groups[key]) groups[key] = []
    groups[key].push(p)
  }

  async function handleAdd(e) {
    e.preventDefault() // stop the form from reloading the page
    const name = form.name.trim()
    if (!name || saving || loading) return
    const track = form.track.trim()

    // The new plugin goes one step after the last plugin already on the same track.
    const sameTrack = plugins.filter(p => (p.track || "") === track)
    const nextOrder = sameTrack.reduce((max, p) => Math.max(max, p.chain_order || 0), 0) + 1

    setSaving(true)
    setError("")
    const { data, error } = await supabase
      .from("plugins")
      .insert({
        commit_id: commitId,
        track: track || null,
        name,
        version: form.version.trim() || null,
        preset: form.preset.trim() || null,
        chain_order: nextOrder,
      })
      .select()
    setSaving(false)
    if (error) { setError(error.message); return }

    setPlugins(current => [...current, data[0]])
    // Keep the track filled in, so you can add the next plugin on the same track quickly.
    setForm({ ...form, name: "", version: "", preset: "" })
  }

  async function handleDelete(id) {
    setError("")
    const { error } = await supabase.from("plugins").delete().eq("id", id)
    if (error) { setError(error.message); return }
    setPlugins(current => current.filter(p => p.id !== id))
  }

  function field(key) {
    return { value: form[key], onChange: e => setForm({ ...form, [key]: e.target.value }) }
  }

  return (
    <div>
      {loading ? (
        <p style={{ fontSize: 13, color: c.textFaint }}>Loading plugins...</p>
      ) : Object.keys(groups).length === 0 ? (
        <p style={{ fontSize: 13, color: c.textFaint, marginBottom: 14 }}>
          No plugins recorded for this version yet.
        </p>
      ) : (
        <div style={{ marginBottom: 16 }}>
          {Object.entries(groups).map(([track, list]) => (
            <div key={track} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{track}</p>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                {list.map((p, i) => (
                  <span key={p.id} style={{ display: "contents" }}>
                    {i > 0 && <span style={{ color: c.textFaint }}>›</span>}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 8, background: c.tealSoft,
                      borderRadius: 8, padding: "5px 10px", fontSize: 13, color: c.tealDark,
                    }}>
                      <span>
                        {p.name}
                        {(p.version || p.preset) && (
                          <small style={{ display: "block", fontSize: 11.5, color: c.textSoft }}>
                            {[p.version && `v${p.version}`, p.preset].filter(Boolean).join(" · ")}
                          </small>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        aria-label={`Remove ${p.name}`}
                        style={{ background: "none", border: 0, cursor: "pointer", color: c.textSoft, fontSize: 14, padding: 0 }}
                      >
                        ✕
                      </button>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 8 }}>
          <input className="sy-input" placeholder="Track (e.g. Lead vocal)" aria-label="Track" maxLength={100} {...field("track")} />
          <input className="sy-input" placeholder="Plugin *" aria-label="Plugin name" maxLength={100} {...field("name")} />
          <input className="sy-input" placeholder="Version" aria-label="Plugin version" maxLength={50} {...field("version")} />
          <input className="sy-input" placeholder="Preset" aria-label="Preset" maxLength={100} {...field("preset")} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="sy-btn sy-btn-primary sy-btn-sm" disabled={loading || saving || !form.name.trim()}>
            {saving ? "Adding..." : "Add plugin"}
          </button>
          <button type="button" className="sy-btn sy-btn-ghost sy-btn-sm" aria-expanded={showRestore}
            onClick={() => setShowRestore(s => !s)}>
            {showRestore ? "Hide restore checklist" : "Restore checklist"}
          </button>
        </div>
        {error && <p style={{ fontSize: 13, color: c.danger, marginTop: 8 }}>{error}</p>}
      </form>

      {showRestore && !loading && (
        <RestoreChecklist
          title={title}
          plugins={plugins}
          fileName={fileName}
          hasFile={hasFile}
          onDownload={onDownload}
          downloading={downloading}
        />
      )}
    </div>
  )
}