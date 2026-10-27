import { useState } from "react"
import { c } from "./theme"

import { buildChecklist } from "./checklist"

// The same checklist as plain text, for the "Copy" button.
function toText({ title, fileName, installs, presets }) {
  const lines = [`Restore checklist: ${title}`, ""]
  lines.push(`1. Project file: ${fileName || "none attached"}`)
  lines.push("", "2. Install these plugins:")
  if (installs.length === 0) lines.push("   (none recorded)")
  installs.forEach(i => lines.push(`   - ${i.name}${i.version ? ` v${i.version}` : ""}`))
  lines.push("", "3. Load these presets:")
  if (presets.length === 0) lines.push("   (none recorded)")
  presets.forEach(p => lines.push(`   - ${p.track}: ${p.plugin} -> ${p.preset}`))
  return lines.join("\n")
}

function Item({ id, children, done, onToggle }) {
  return (
    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 0", fontSize: 14, cursor: "pointer" }}>
      <input type="checkbox" checked={Boolean(done[id])} onChange={() => onToggle(id)} style={{ marginTop: 4 }} />
      <span style={{ textDecoration: done[id] ? "line-through" : "none", color: done[id] ? c.textFaint : c.text }}>{children}</span>
    </label>
  )
}

export default function RestoreChecklist({ title, plugins, fileName, hasFile, onDownload, downloading }) {
  const [done, setDone] = useState({}) // which items are ticked, e.g. { file: true, "p:abc": true }
  const [note, setNote] = useState("")
  const { installs, presets } = buildChecklist(plugins)

  // Every item has a key, so ticks survive when other items are added or removed.
  const keys = [
    ...(hasFile ? ["file"] : []),
    ...installs.map(i => `i:${i.key}`),
    ...presets.map(p => `p:${p.key}`),
  ]
  const doneCount = keys.filter(k => done[k]).length

  // The function form (d => ...) always starts from the latest state, which is safer than reading `done` directly.
  const toggle = key => setDone(d => ({ ...d, [key]: !d[key] }))

  async function copy() {
    try {
      await navigator.clipboard.writeText(toText({ title, fileName: hasFile ? fileName : "", installs, presets }))
      setNote("Copied")
    } catch {
      setNote("Could not copy. Select the text and copy it by hand.")
    }
    setTimeout(() => setNote(""), 2500)
  }

  const heading = { fontSize: 13, fontWeight: 600, color: c.tealDark, margin: "16px 0 4px" }
  const faint = { fontSize: 12.5, color: c.textSoft }


  if (keys.length === 0) {
    return (
      <p style={{ ...faint, marginTop: 14 }}>
        Nothing to restore from yet. Attach a file to this version and note its plugins, then come back.
      </p>
    )
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 600 }}>
          Restore checklist <span style={{ ...faint, fontWeight: 400 }}>· {doneCount} of {keys.length} done</span>
        </p>
        <button type="button" className="sy-btn sy-btn-ghost sy-btn-sm" onClick={copy}>{note || "Copy as text"}</button>
      </div>

      {hasFile && (
        <>
          <p style={heading}>1. Project file</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <Item done={done} onToggle={toggle} id="file">{fileName}</Item>
            <button type="button" className="sy-btn sy-btn-primary sy-btn-sm" onClick={onDownload} disabled={downloading}>
              {downloading ? "Preparing..." : "Download"}
            </button>
          </div>
        </>
      )}

      {installs.length > 0 && (
        <>
          <p style={heading}>2. Install these plugins</p>
          {installs.map(i => (
            <Item done={done} onToggle={toggle} key={i.key} id={`i:${i.key}`}>
              {i.name}{i.version ? ` v${i.version}` : ""}
              <span style={{ ...faint, display: "block" }}>Used on {i.tracks.join(", ")}</span>
            </Item>
          ))}
        </>
      )}

      {presets.length > 0 && (
        <>
          <p style={heading}>3. Load these presets</p>
          {presets.map(p => (
            <Item done={done} onToggle={toggle} key={p.key} id={`p:${p.key}`}>
              {p.track}: {p.plugin}
              <span style={{ ...faint, display: "block" }}>Preset: {p.preset}</span>
            </Item>
          ))}
        </>
      )}
    </div>
  )
}