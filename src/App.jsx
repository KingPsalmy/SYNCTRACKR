import { useState } from "react"

const initialProjects = [
  {
    id: 1, name: "Midnight Gospel", bpm: 98, key: "C# minor", tracks: 12,
    daw: "FL Studio", version: "21.2",
    commits: [
      {
        id: "v1.0.2", message: "Added vocal doubles + reverb tail", time: "2h ago", size: "340 MB",
        plugins: [
          { track: "Lead Vocals", name: "FabFilter Pro-Q 3", version: "3.12", preset: "Vocal EQ", chain_order: 1 },
          { track: "Lead Vocals", name: "FabFilter Pro-C 2", version: "2.03", preset: "Vocal Compression", chain_order: 2 },
          { track: "Synth Lead", name: "Serum", version: "1.36", preset: "Lead 1", chain_order: 1 },
          { track: "Master", name: "Valhalla Reverb", version: "1.5", preset: "Hall", chain_order: 1 },
        ]
      },
      {
        id: "v1.0.1", message: "Re-EQ'd synth lead, dropped sub", time: "Yesterday", size: "310 MB",
        plugins: [
          { track: "Synth Lead", name: "FabFilter Pro-Q 3", version: "3.12", preset: "Synth EQ", chain_order: 1 },
        ]
      },
      {
        id: "v1.0.0", message: "First rough mix", time: "3 days ago", size: "280 MB",
        plugins: []
      },
    ]
  },
  {
    id: 2, name: "Sunday Morning", bpm: 72, key: "G major", tracks: 8,
    daw: "Ableton Live", version: "11.3",
    commits: [
      {
        id: "v1.0.0", message: "Initial commit — choir arrangement", time: "5 days ago", size: "190 MB",
        plugins: [
          { track: "Choir", name: "Slate VMR", version: "2.0", preset: "Warm Vocals", chain_order: 1 },
          { track: "Master", name: "iZotope Ozone", version: "10", preset: "Master Assistant", chain_order: 1 },
        ]
      },
    ]
  },
  {
    id: 3, name: "Lagos Rain", bpm: 112, key: "F# minor", tracks: 16,
    daw: "FL Studio", version: "21.2",
    commits: [
      {
        id: "v1.0.3", message: "Final mix — mastering ready", time: "1h ago", size: "520 MB",
        plugins: [
          { track: "Drums", name: "Waves CLA-76", version: "14.0", preset: "Drums Punch", chain_order: 1 },
          { track: "Bass", name: "UAD API 2500", version: "2.0", preset: "Bass Glue", chain_order: 1 },
          { track: "Master", name: "FabFilter Pro-C 2", version: "2.03", preset: "Master Bus", chain_order: 1 },
        ]
      },
      { id: "v1.0.2", message: "Afrobeat percussion overdubs", time: "2 days ago", size: "480 MB", plugins: [] },
      { id: "v1.0.1", message: "Bass & keys locked", time: "4 days ago", size: "410 MB", plugins: [] },
      { id: "v1.0.0", message: "Skeleton arrangement", time: "1 week ago", size: "180 MB", plugins: [] },
    ]
  },
]

function App() {
  const [projects, setProjects] = useState(initialProjects)
  const [selected, setSelected] = useState(initialProjects[0])
  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState("")
  const [addingProject, setAddingProject] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", bpm: "", key: "", daw: "", version: "" })
  const [activeCommit, setActiveCommit] = useState(null)

  function handleSave() {
    if (!message.trim()) return
    const currentProject = projects.find(p => p.id === selected.id)
    const lastCommit = currentProject.commits[0]
    const lastNum = parseInt(lastCommit.id.replace("v1.0.", ""))
    const newCommit = {
      id: `v1.0.${lastNum + 1}`,
      message: message,
      time: "Just now",
      size: "—",
      plugins: [],
    }
    const updatedProjects = projects.map(p =>
      p.id === selected.id
        ? { ...p, commits: [newCommit, ...p.commits] }
        : p
    )
    setProjects(updatedProjects)
    setSelected(updatedProjects.find(p => p.id === selected.id))
    setCommitting(false)
    setMessage("")
  }

  function handleAddProject() {
    if (!newProject.name.trim()) return
    const created = {
      id: projects.length + 1,
      name: newProject.name,
      bpm: parseInt(newProject.bpm) || 120,
      key: newProject.key || "Unknown",
      tracks: 0,
      daw: newProject.daw || "Unknown",
      version: newProject.version || "",
      commits: [],
    }
    const updatedProjects = [...projects, created]
    setProjects(updatedProjects)
    setSelected(created)
    setAddingProject(false)
    setNewProject({ name: "", bpm: "", key: "", daw: "", version: "" })
  }

  const inputStyle = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a",
    color: "#e8e4dc", padding: "10px 14px", fontSize: 12,
    fontFamily: "monospace", outline: "none", marginBottom: 10,
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", background: "#0a0a0b", color: "#e8e4dc" }}>

      {/* Sidebar */}
      <div style={{ width: 220, borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #1e1e1e" }}>
          <h2 style={{ color: "#e8c97e", fontSize: 18 }}>FIRETRACKS</h2>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => { setSelected(p); setAddingProject(false); setActiveCommit(null) }}
              style={{
                padding: "10px 16px", marginBottom: 2, cursor: "pointer",
                borderLeft: selected.id === p.id ? "2px solid #e8c97e" : "2px solid transparent",
                background: selected.id === p.id ? "#111" : "transparent",
                color: selected.id === p.id ? "#e8e4dc" : "#555",
              }}
            >
              <div style={{ fontSize: 13 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>{p.commits.length} commit{p.commits.length !== 1 ? "s" : ""}</div>
            </div>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid #1e1e1e" }}>
          <button
            onClick={() => setAddingProject(true)}
            style={{ width: "100%", background: "transparent", border: "1px solid #222", color: "#555", padding: "8px", fontSize: 11, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.1em" }}
          >
            + NEW PROJECT
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        {addingProject ? (
          <>
            <h1 style={{ fontSize: 24, marginBottom: 24, color: "#e8c97e" }}>New Project</h1>
            <input style={inputStyle} placeholder="Project name *" value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
            <input style={inputStyle} placeholder="BPM (e.g. 140)" value={newProject.bpm} onChange={e => setNewProject({ ...newProject, bpm: e.target.value })} />
            <input style={inputStyle} placeholder="Key (e.g. F minor)" value={newProject.key} onChange={e => setNewProject({ ...newProject, key: e.target.value })} />
            <input style={inputStyle} placeholder="DAW (e.g. FL Studio)" value={newProject.daw} onChange={e => setNewProject({ ...newProject, daw: e.target.value })} />
            <input style={inputStyle} placeholder="DAW version (e.g. 21.2)" value={newProject.version} onChange={e => setNewProject({ ...newProject, version: e.target.value })} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={handleAddProject} style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "10px 24px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>CREATE</button>
              <button onClick={() => setAddingProject(false)} style={{ background: "transparent", color: "#555", border: "1px solid #222", padding: "10px 24px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>CANCEL</button>
            </div>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>{selected.name}</h1>
            <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.bpm} BPM</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.key}</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.tracks} tracks</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.daw} {selected.version}</span>
            </div>
            <p style={{ fontSize: 11, color: "#333", marginBottom: 32 }}>{selected.commits.length} commit{selected.commits.length !== 1 ? "s" : ""}</p>

            {/* Commit Button */}
            <div style={{ marginBottom: 24 }}>
              {!committing ? (
                <button onClick={() => setCommitting(true)} style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "10px 20px", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.1em" }}>
                  + COMMIT
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe this version..." onKeyDown={e => e.key === "Enter" && handleSave()} style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", color: "#e8e4dc", padding: "10px 14px", fontSize: 12, fontFamily: "monospace", outline: "none" }} />
                  <button onClick={handleSave} style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "10px 20px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>SAVE</button>
                  <button onClick={() => { setCommitting(false); setMessage("") }} style={{ background: "transparent", color: "#555", border: "1px solid #222", padding: "10px 20px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>CANCEL</button>
                </div>
              )}
            </div>

            {/* Commit History */}
            {selected.commits.length === 0 ? (
              <p style={{ color: "#333", fontSize: 12 }}>No commits yet. Hit + COMMIT to save your first version.</p>
            ) : (
              <div>
                {selected.commits.map(commit => (
                  <div key={commit.id}>
                    <div
                      onClick={() => setActiveCommit(activeCommit?.id === commit.id ? null : commit)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: 4, background: "#111", borderLeft: activeCommit?.id === commit.id ? "2px solid #e8c97e" : "2px solid #1e1e1e", cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>{commit.message}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>{commit.id} · {commit.time}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 11, color: "#555" }}>{commit.size}</span>
                        <span style={{ fontSize: 10, color: "#333" }}>{activeCommit?.id === commit.id ? "▲ hide" : "▼ plugins"}</span>
                      </div>
                    </div>

                    {/* Plugin Intelligence Panel */}
                    {activeCommit?.id === commit.id && (
                      <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderTop: "none", padding: 16, marginBottom: 8 }}>
                        <p style={{ fontSize: 10, color: "#e8c97e", letterSpacing: "0.1em", marginBottom: 12 }}>PLUGIN INTELLIGENCE</p>
                        {commit.plugins.length === 0 ? (
                          <p style={{ fontSize: 11, color: "#333" }}>No plugin data stored for this commit.</p>
                        ) : (
                          commit.plugins.map((plugin, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", marginBottom: 6, background: "#111", borderLeft: "2px solid #222" }}>
                              <div>
                                <div style={{ fontSize: 12, marginBottom: 2 }}>{plugin.name}</div>
                                <div style={{ fontSize: 10, color: "#444" }}>Track: {plugin.track} · Chain #{plugin.chain_order} · Preset: {plugin.preset}</div>
                              </div>
                              <div style={{ fontSize: 10, color: "#333" }}>v{plugin.version}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  )
}

export default App