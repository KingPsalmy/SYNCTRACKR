import { useState, useEffect } from "react"
import { supabase } from "./supabase"

function App() {
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [commits, setCommits] = useState([])
  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState("")
  const [addingProject, setAddingProject] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", bpm: "", key: "", daw: "", version: "" })
  const [activeCommit, setActiveCommit] = useState(null)
  const [plugins, setPlugins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    if (selected) fetchCommits(selected.id)
  }, [selected])

  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false })
    if (error) console.error(error)
    else {
      setProjects(data)
      if (data.length > 0) setSelected(data[0])
    }
    setLoading(false)
  }

  async function fetchCommits(projectId) {
    const { data, error } = await supabase.from("commits").select("*").eq("project_id", projectId).order("created_at", { ascending: false })
    if (error) console.error(error)
    else setCommits(data)
  }

  async function fetchPlugins(commitId) {
    const { data, error } = await supabase.from("plugins").select("*").eq("commit_id", commitId).order("chain_order", { ascending: true })
    if (error) console.error(error)
    else setPlugins(data)
  }

  async function handleSave() {
    if (!message.trim()) return
    const { data, error } = await supabase.from("commits").insert({ project_id: selected.id, message: message }).select()
    if (error) console.error(error)
    else {
      setCommits([data[0], ...commits])
      setCommitting(false)
      setMessage("")
    }
  }

  async function handleAddProject() {
    if (!newProject.name.trim()) return
    const { data, error } = await supabase.from("projects").insert({
      name: newProject.name,
      bpm: parseInt(newProject.bpm) || 120,
      key: newProject.key || "Unknown",
      daw: newProject.daw || "Unknown",
      daw_version: newProject.version || "",
      tracks: 0,
    }).select()
    if (error) console.error(error)
    else {
      setProjects([data[0], ...projects])
      setSelected(data[0])
      setCommits([])
      setAddingProject(false)
      setNewProject({ name: "", bpm: "", key: "", daw: "", version: "" })
    }
  }

  function handleCommitClick(commit) {
    if (activeCommit?.id === commit.id) {
      setActiveCommit(null)
      setPlugins([])
    } else {
      setActiveCommit(commit)
      fetchPlugins(commit.id)
    }
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
          {loading ? (
            <p style={{ padding: 16, fontSize: 11, color: "#333" }}>Loading...</p>
          ) : projects.length === 0 ? (
            <p style={{ padding: 16, fontSize: 11, color: "#333" }}>No projects yet.</p>
          ) : (
            projects.map(p => (
              <div
                key={p.id}
                onClick={() => { setSelected(p); setAddingProject(false); setActiveCommit(null) }}
                style={{
                  padding: "10px 16px", marginBottom: 2, cursor: "pointer",
                  borderLeft: selected?.id === p.id ? "2px solid #e8c97e" : "2px solid transparent",
                  background: selected?.id === p.id ? "#111" : "transparent",
                  color: selected?.id === p.id ? "#e8e4dc" : "#555",
                }}
              >
                <div style={{ fontSize: 13 }}>{p.name}</div>
              </div>
            ))
          )}
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
        ) : selected ? (
          <>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>{selected.name}</h1>
            <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.bpm} BPM</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.key}</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.daw} {selected.daw_version}</span>
            </div>
            <p style={{ fontSize: 11, color: "#333", marginBottom: 32 }}>{commits.length} commit{commits.length !== 1 ? "s" : ""}</p>

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
            {commits.length === 0 ? (
              <p style={{ color: "#333", fontSize: 12 }}>No commits yet. Hit + COMMIT to save your first version.</p>
            ) : (
              <div>
                {commits.map((commit, index) => (
                  <div key={commit.id}>
                    <div
                      onClick={() => handleCommitClick(commit)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", marginBottom: 4, background: "#111", borderLeft: activeCommit?.id === commit.id ? "2px solid #e8c97e" : "2px solid #1e1e1e", cursor: "pointer" }}
                    >
                      <div>
                        <div style={{ fontSize: 13, marginBottom: 4 }}>{commit.message}</div>
                        <div style={{ fontSize: 10, color: "#444" }}>v1.0.{commits.length - 1 - index} · {new Date(commit.created_at).toLocaleDateString()}</div>
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
                        {plugins.length === 0 ? (
                          <p style={{ fontSize: 11, color: "#333" }}>No plugin data stored for this commit.</p>
                        ) : (
                          plugins.map((plugin, i) => (
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
        ) : (
          <p style={{ color: "#333" }}>Select a project or create a new one.</p>
        )}
      </div>

    </div>
  )
}

export default App