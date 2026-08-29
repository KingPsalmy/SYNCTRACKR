import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Auth from "./Auth"
import Landing from "./Landing"

function App() {
  const [session, setSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState(null)
  const [commits, setCommits] = useState([])
  const [plugins, setPlugins] = useState([])
  const [activeCommit, setActiveCommit] = useState(null)

  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState("")

  const [addingProject, setAddingProject] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: "", bpm: "", key: "", daw: "", version: "" })

  // ── AUTH ──────────────────────────────────────────
  // On first load, ask Supabase if there's already a logged-in session
  // (e.g. the user was logged in yesterday and closed the tab).
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProjects()
      else setLoading(false)
    })

    // This listener fires automatically whenever login/logout happens
    // anywhere in the app — so the UI always reflects the real auth state.
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProjects()
    })
  }, [])

  // Whenever the selected project changes, load that project's commits.
  useEffect(() => {
    if (selected) fetchCommits(selected.id)
  }, [selected])

  // ── FETCHING ──────────────────────────────────────
  async function fetchProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) console.error(error)
    else {
      setProjects(data)
      // Auto-select the first project so the screen isn't empty on load
      if (data.length > 0) setSelected(data[0])
    }
    setLoading(false)
  }

  async function fetchCommits(projectId) {
    const { data, error } = await supabase
      .from("commits")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
    if (error) console.error(error)
    else setCommits(data)
  }

  async function fetchPlugins(commitId) {
    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .eq("commit_id", commitId)
      .order("chain_order", { ascending: true })
    if (error) console.error(error)
    else setPlugins(data)
  }

  // ── COMMITS: create + delete ─────────────────────
  async function handleSaveCommit() {
    if (!message.trim()) return
    const { data, error } = await supabase
      .from("commits")
      .insert({ project_id: selected.id, message, user_id: session.user.id })
      .select()
    if (error) console.error(error)
    else {
      setCommits([data[0], ...commits])
      setCommitting(false)
      setMessage("")
    }
  }

  async function handleDeleteCommit(commitId) {
    // Native browser confirm — simple and effective for a destructive action
    if (!confirm("Delete this commit? This can't be undone.")) return
    const { error } = await supabase.from("commits").delete().eq("id", commitId)
    if (error) {
      console.error(error)
      return
    }
    // Remove it from local state so the UI updates instantly,
    // without needing to re-fetch everything from the database.
    setCommits(commits.filter(c => c.id !== commitId))
    if (activeCommit?.id === commitId) {
      setActiveCommit(null)
      setPlugins([])
    }
  }

  function handleCommitClick(commit) {
    // Clicking an already-open commit closes it (toggle behaviour)
    if (activeCommit?.id === commit.id) {
      setActiveCommit(null)
      setPlugins([])
    } else {
      setActiveCommit(commit)
      fetchPlugins(commit.id)
    }
  }

  // ── PROJECTS: create, edit, delete ───────────────
  function openNewProjectForm() {
    setProjectForm({ name: "", bpm: "", key: "", daw: "", version: "" })
    setEditingProject(false)
    setAddingProject(true)
  }

  function openEditProjectForm() {
    // Pre-fill the form with the currently selected project's data
    setProjectForm({
      name: selected.name,
      bpm: selected.bpm || "",
      key: selected.key || "",
      daw: selected.daw || "",
      version: selected.daw_version || "",
    })
    setAddingProject(true)
    setEditingProject(true)
  }

  async function handleCreateProject() {
    if (!projectForm.name.trim()) return
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: projectForm.name,
        bpm: parseInt(projectForm.bpm) || 120,
        key: projectForm.key || "Unknown",
        daw: projectForm.daw || "Unknown",
        daw_version: projectForm.version || "",
        tracks: 0,
        user_id: session.user.id,
      })
      .select()
    if (error) {
      console.error(error)
      return
    }
    setProjects([data[0], ...projects])
    setSelected(data[0])
    setCommits([])
    setAddingProject(false)
  }

  async function handleUpdateProject() {
    if (!projectForm.name.trim()) return
    const { data, error } = await supabase
      .from("projects")
      .update({
        name: projectForm.name,
        bpm: parseInt(projectForm.bpm) || 120,
        key: projectForm.key || "Unknown",
        daw: projectForm.daw || "Unknown",
        daw_version: projectForm.version || "",
      })
      .eq("id", selected.id)
      .select()
    if (error) {
      console.error(error)
      return
    }
    // Update this one project in the local list, and keep it selected
    // with its fresh data, without touching anything else.
    const updatedProject = data[0]
    setProjects(projects.map(p => (p.id === updatedProject.id ? updatedProject : p)))
    setSelected(updatedProject)
    setAddingProject(false)
    setEditingProject(false)
  }

  async function handleDeleteProject(id) {
    if (!confirm("Delete this project and all its commits? This can't be undone.")) return
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) {
      console.error(error)
      return
    }
    const remaining = projects.filter(p => p.id !== id)
    setProjects(remaining)
    if (selected?.id === id) {
      // If we just deleted the project we were viewing, fall back to
      // the next available project (or an empty state if none are left).
      setSelected(remaining[0] || null)
      setCommits([])
    }
  }

  const inputStyle = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a",
    color: "#e8e4dc", padding: "10px 14px", fontSize: 12,
    fontFamily: "monospace", outline: "none", marginBottom: 10,
  }

  // ── SCREEN ROUTING ────────────────────────────────
  // Not logged in + hasn't clicked "get started" yet → show the landing page
  if (!session && !showAuth) return <Landing onGetStarted={() => setShowAuth(true)} />
  // Not logged in + clicked "get started" → show login/signup
  if (!session && showAuth) return <Auth />

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", background: "#0a0a0b", color: "#e8e4dc" }}>

      {/* Sidebar */}
      <div style={{ width: 220, borderRight: "1px solid #1e1e1e", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #1e1e1e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ color: "#e8c97e", fontSize: 18 }}>SYNCTRACKR</h2>
            <span onClick={() => supabase.auth.signOut()} style={{ fontSize: 10, color: "#333", cursor: "pointer", letterSpacing: "0.08em" }}>
              SIGN OUT
            </span>
          </div>
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
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 16px", marginBottom: 2, cursor: "pointer",
                  borderLeft: selected?.id === p.id ? "2px solid #e8c97e" : "2px solid transparent",
                  background: selected?.id === p.id ? "#111" : "transparent",
                  color: selected?.id === p.id ? "#e8e4dc" : "#555",
                }}
              >
                <div style={{ fontSize: 13 }}>{p.name}</div>
                {/* stopPropagation stops this click from also triggering the
                    parent div's onClick (which would re-select the project) */}
                <span
                  onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id) }}
                  style={{ fontSize: 11, color: "#333", padding: "0 4px" }}
                  title="Delete project"
                >
                  ✕
                </span>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: 16, borderTop: "1px solid #1e1e1e" }}>
          <button
            onClick={openNewProjectForm}
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
            <h1 style={{ fontSize: 24, marginBottom: 24, color: "#e8c97e" }}>
              {editingProject ? "Edit Project" : "New Project"}
            </h1>
            <input style={inputStyle} placeholder="Project name *" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
            <input style={inputStyle} placeholder="BPM (e.g. 140)" value={projectForm.bpm} onChange={e => setProjectForm({ ...projectForm, bpm: e.target.value })} />
            <input style={inputStyle} placeholder="Key (e.g. F minor)" value={projectForm.key} onChange={e => setProjectForm({ ...projectForm, key: e.target.value })} />
            <input style={inputStyle} placeholder="DAW (e.g. FL Studio)" value={projectForm.daw} onChange={e => setProjectForm({ ...projectForm, daw: e.target.value })} />
            <input style={inputStyle} placeholder="DAW version (e.g. 21.2)" value={projectForm.version} onChange={e => setProjectForm({ ...projectForm, version: e.target.value })} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={editingProject ? handleUpdateProject : handleCreateProject}
                style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "10px 24px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}
              >
                {editingProject ? "SAVE CHANGES" : "CREATE"}
              </button>
              <button
                onClick={() => { setAddingProject(false); setEditingProject(false) }}
                style={{ background: "transparent", color: "#555", border: "1px solid #222", padding: "10px 24px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}
              >
                CANCEL
              </button>
            </div>
          </>
        ) : selected ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h1 style={{ fontSize: 28, marginBottom: 8 }}>{selected.name}</h1>
              <span
                onClick={openEditProjectForm}
                style={{ fontSize: 11, color: "#555", cursor: "pointer", letterSpacing: "0.08em", marginTop: 8 }}
              >
                EDIT
              </span>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.bpm} BPM</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.key}</span>
              <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.daw} {selected.daw_version}</span>
            </div>
            <p style={{ fontSize: 11, color: "#333", marginBottom: 32 }}>
              {commits.length} commit{commits.length !== 1 ? "s" : ""}
            </p>

            {/* Commit button / form */}
            <div style={{ marginBottom: 24 }}>
              {!committing ? (
                <button
                  onClick={() => setCommitting(true)}
                  style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "10px 20px", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.1em" }}
                >
                  + COMMIT
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe this version..."
                    onKeyDown={e => e.key === "Enter" && handleSaveCommit()}
                    style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", color: "#e8e4dc", padding: "10px 14px", fontSize: 12, fontFamily: "monospace", outline: "none" }}
                  />
                  <button onClick={handleSaveCommit} style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "10px 20px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>SAVE</button>
                  <button onClick={() => { setCommitting(false); setMessage("") }} style={{ background: "transparent", color: "#555", border: "1px solid #222", padding: "10px 20px", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }}>CANCEL</button>
                </div>
              )}
            </div>

            {/* Commit history */}
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
                        <div style={{ fontSize: 10, color: "#444" }}>
                          v1.0.{commits.length - 1 - index} · {new Date(commit.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <span style={{ fontSize: 11, color: "#555" }}>{commit.size}</span>
                        <span style={{ fontSize: 10, color: "#333" }}>
                          {activeCommit?.id === commit.id ? "▲ hide" : "▼ plugins"}
                        </span>
                        <span
                          onClick={(e) => { e.stopPropagation(); handleDeleteCommit(commit.id) }}
                          style={{ fontSize: 11, color: "#333" }}
                          title="Delete commit"
                        >
                          ✕
                        </span>
                      </div>
                    </div>

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
                                <div style={{ fontSize: 10, color: "#444" }}>
                                  Track: {plugin.track} · Chain #{plugin.chain_order} · Preset: {plugin.preset}
                                </div>
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