import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Auth from "./Auth"
import Landing from "./Landing"

// ── Design tokens ───────────────────────────────────
const c = {
  bg: "#F7FAF9",
  surface: "#FFFFFF",
  border: "#E4E9E8",
  teal: "#0E8074",
  tealDark: "#0B685F",
  tealSoft: "#E6F3F1",
  text: "#111827",
  textSoft: "#6B7280",
  textFaint: "#9CA3AF",
  danger: "#DC2626",
}

// Turns a timestamp into "2h ago", "Yesterday", "3d ago" etc.
function timeAgo(dateString) {
  // Supabase stores timestamps without a timezone suffix, so we force
  // JS to read it as UTC — otherwise the browser assumes local time
  // and the math comes out wrong (e.g. "1h ago" for something just saved).
  const utcString = dateString.endsWith("Z") ? dateString : dateString + "Z"
  const diff = Math.max(0, (Date.now() - new Date(utcString).getTime()) / 1000)

  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 172800) return "Yesterday"
  return `${Math.floor(diff / 86400)}d ago`
}

// Deterministic color tile per DAW name, so the same DAW always
// gets the same tile color — real, derived data, not a random placeholder.
const dawColors = {
  "FL Studio": "#F97316",
  "Ableton Live": "#22C55E",
  "Logic Pro": "#38BDF8",
  "Pro Tools": "#A78BFA",
}
function dawColor(daw) {
  return dawColors[daw] || "#94A3B8"
}

function App() {
  const [session, setSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState([])
  const [allCommits, setAllCommits] = useState([]) // every commit, across every project
  const [selected, setSelected] = useState(null)
  const [plugins, setPlugins] = useState([])
  const [activeCommit, setActiveCommit] = useState(null)

  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState("")

  const [addingProject, setAddingProject] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: "", bpm: "", key: "", daw: "", version: "" })

  const [search, setSearch] = useState("")
  const [view, setView] = useState("overview") // overview | project

  // ── AUTH ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchAll()
      else setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchAll()
    })
  }, [])

  // ── FETCHING ──────────────────────────────────────
  // One pass: get every project, then every commit for those projects.
  // This lets us compute real stats (counts, last activity) without
  // guessing or inventing numbers.
  async function fetchAll() {
    setLoading(true)
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })

    if (projectError) {
      console.error(projectError)
      setLoading(false)
      return
    }

    setProjects(projectData)

    if (projectData.length > 0) {
      const ids = projectData.map(p => p.id)
      const { data: commitData, error: commitError } = await supabase
        .from("commits")
        .select("*")
        .in("project_id", ids)
        .order("created_at", { ascending: false })

      if (commitError) console.error(commitError)
      else setAllCommits(commitData)

      setSelected(projectData[0])
    }
    setLoading(false)
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

  // ── DERIVED, REAL DATA ────────────────────────────
  // Commits belonging to the currently open project
  const projectCommits = selected ? allCommits.filter(c2 => c2.project_id === selected.id) : []

  // The single most recent commit across everything the user owns
  const latestCommit = allCommits[0] || null
  const latestCommitProject = latestCommit ? projects.find(p => p.id === latestCommit.project_id) : null

  // A real activity feed — just the last 5 commits, newest first,
  // each one labelled with which project it belongs to.
  const recentActivity = allCommits.slice(0, 5).map(commit => ({
    ...commit,
    projectName: projects.find(p => p.id === commit.project_id)?.name || "Unknown project",
  }))

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  function commitCountFor(projectId) {
    return allCommits.filter(c2 => c2.project_id === projectId).length
  }

  function lastActivityFor(projectId) {
    const found = allCommits.find(c2 => c2.project_id === projectId)
    return found ? timeAgo(found.created_at) : "No commits yet"
  }

  // ── COMMITS: create + delete ─────────────────────
  async function handleSaveCommit() {
    if (!message.trim()) return
    const { data, error } = await supabase
      .from("commits")
      .insert({ project_id: selected.id, message, user_id: session.user.id })
      .select()
    if (error) { console.error(error); return }
    setAllCommits([data[0], ...allCommits])
    setCommitting(false)
    setMessage("")
  }

  async function handleDeleteCommit(commitId) {
    if (!confirm("Delete this commit? This can't be undone.")) return
    const { error } = await supabase.from("commits").delete().eq("id", commitId)
    if (error) { console.error(error); return }
    setAllCommits(allCommits.filter(c2 => c2.id !== commitId))
    if (activeCommit?.id === commitId) {
      setActiveCommit(null)
      setPlugins([])
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

  // ── PROJECTS: create, edit, delete ───────────────
  function openNewProjectForm() {
    setProjectForm({ name: "", bpm: "", key: "", daw: "", version: "" })
    setEditingProject(false)
    setAddingProject(true)
  }

  function openEditProjectForm() {
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
    if (error) { console.error(error); return }
    setProjects([data[0], ...projects])
    setSelected(data[0])
    setAddingProject(false)
    setView("project")
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
    if (error) { console.error(error); return }
    const updated = data[0]
    setProjects(projects.map(p => (p.id === updated.id ? updated : p)))
    setSelected(updated)
    setAddingProject(false)
    setEditingProject(false)
  }

  async function handleDeleteProject(id) {
    if (!confirm("Delete this project and all its commits? This can't be undone.")) return
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (error) { console.error(error); return }
    const remaining = projects.filter(p => p.id !== id)
    setProjects(remaining)
    setAllCommits(allCommits.filter(c2 => c2.project_id !== id))
    if (selected?.id === id) {
      setSelected(remaining[0] || null)
      setView("overview")
    }
  }

  // ── SHARED STYLES ─────────────────────────────────
  const input = {
    width: "100%", background: c.surface, border: `1px solid ${c.border}`,
    color: c.text, padding: "10px 14px", fontSize: 14,
    borderRadius: 8, outline: "none", marginBottom: 10, fontFamily: "inherit",
  }
  const card = {
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: 12,
  }
  const btnPrimary = {
    background: c.teal, color: "#fff", border: "none", borderRadius: 8,
    padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  }
  const btnGhost = {
    background: "transparent", color: c.textSoft, border: `1px solid ${c.border}`,
    borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer",
  }

  // ── SCREEN ROUTING ────────────────────────────────
  if (!session && !showAuth) return <Landing onGetStarted={() => setShowAuth(true)} />
  if (!session && showAuth) return <Auth />

  const firstName = session?.user?.user_metadata?.full_name?.split(" ")[0]
    || session?.user?.email?.split("@")[0]
    || "there"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.bg, color: c.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Sidebar */}
      <div style={{ width: 240, borderRight: `1px solid ${c.border}`, background: c.surface, display: "flex", flexDirection: "column", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: c.teal }}>SyncTrackr</span>
        </div>

        <button onClick={openNewProjectForm} style={{ ...btnPrimary, width: "100%", marginBottom: 20 }}>
          + New Project
        </button>

        <div
          onClick={() => setView("overview")}
          style={{
            padding: "9px 12px", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 4,
            background: view === "overview" ? c.tealSoft : "transparent",
            color: view === "overview" ? c.teal : c.textSoft,
          }}
        >
          Overview
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginTop: 8 }}>
          <p style={{ fontSize: 11, color: c.textFaint, fontWeight: 600, letterSpacing: "0.04em", margin: "12px 4px 6px" }}>PROJECTS</p>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => { setSelected(p); setView("project"); setActiveCommit(null) }}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                background: view === "project" && selected?.id === p.id ? c.tealSoft : "transparent",
                color: view === "project" && selected?.id === p.id ? c.teal : c.textSoft,
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              <span onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id) }} style={{ fontSize: 12, color: c.textFaint }}>✕</span>
            </div>
          ))}
        </div>

        <div onClick={() => supabase.auth.signOut()} style={{ fontSize: 13, color: c.textFaint, cursor: "pointer", paddingTop: 12, borderTop: `1px solid ${c.border}` }}>
          Sign out
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "32px 40px", overflowY: "auto" }}>

        {addingProject ? (
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{editingProject ? "Edit project" : "New project"}</h1>
            <input style={input} placeholder="Project name" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
            <input style={input} placeholder="BPM" value={projectForm.bpm} onChange={e => setProjectForm({ ...projectForm, bpm: e.target.value })} />
            <input style={input} placeholder="Key (e.g. F minor)" value={projectForm.key} onChange={e => setProjectForm({ ...projectForm, key: e.target.value })} />
            <input style={input} placeholder="DAW (e.g. FL Studio)" value={projectForm.daw} onChange={e => setProjectForm({ ...projectForm, daw: e.target.value })} />
            <input style={input} placeholder="DAW version" value={projectForm.version} onChange={e => setProjectForm({ ...projectForm, version: e.target.value })} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={editingProject ? handleUpdateProject : handleCreateProject} style={btnPrimary}>
                {editingProject ? "Save changes" : "Create project"}
              </button>
              <button onClick={() => { setAddingProject(false); setEditingProject(false) }} style={btnGhost}>Cancel</button>
            </div>
          </div>

        ) : view === "overview" ? (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>{greeting}, {firstName} 👋</h1>
            <p style={{ color: c.textSoft, fontSize: 14, marginBottom: 24 }}>Every commit tells a story. Yours is safe with us.</p>

            <input
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...input, maxWidth: 360, marginBottom: 28 }}
            />

            {/* Real stats row — no invented numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
              <div style={{ ...card, padding: 20 }}>
                <p style={{ fontSize: 13, color: c.textSoft, marginBottom: 6 }}>Projects</p>
                <p style={{ fontSize: 26, fontWeight: 700 }}>{projects.length}</p>
              </div>
              <div style={{ ...card, padding: 20 }}>
                <p style={{ fontSize: 13, color: c.textSoft, marginBottom: 6 }}>Versions saved</p>
                <p style={{ fontSize: 26, fontWeight: 700 }}>{allCommits.length}</p>
              </div>
              <div style={{ ...card, padding: 20 }}>
                <p style={{ fontSize: 13, color: c.textSoft, marginBottom: 6 }}>Last activity</p>
                <p style={{ fontSize: 26, fontWeight: 700 }}>{latestCommit ? timeAgo(latestCommit.created_at) : "—"}</p>
              </div>
            </div>

            {loading ? (
              <p style={{ color: c.textFaint, fontSize: 13 }}>Loading...</p>
            ) : projects.length === 0 ? (
              <div style={{ ...card, padding: 32, textAlign: "center" }}>
                <p style={{ color: c.textSoft, fontSize: 14, marginBottom: 12 }}>No projects yet.</p>
                <button onClick={openNewProjectForm} style={btnPrimary}>Create your first project</button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent projects</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
                  {filteredProjects.slice(0, 6).map(p => (
                    <div
                      key={p.id}
                      onClick={() => { setSelected(p); setView("project") }}
                      style={{ ...card, cursor: "pointer", overflow: "hidden" }}
                    >
                      <div style={{ height: 64, background: dawColor(p.daw) }} />
                      <div style={{ padding: 14 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.name}</p>
                        <p style={{ fontSize: 12, color: c.textSoft, marginBottom: 8 }}>{p.daw} {p.daw_version}</p>
                        <p style={{ fontSize: 11.5, color: c.textFaint }}>
                          {commitCountFor(p.id)} commit{commitCountFor(p.id) !== 1 ? "s" : ""} · {lastActivityFor(p.id)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {latestCommit && (
                  <div style={{ ...card, padding: 20, marginBottom: 32 }}>
                    <p style={{ fontSize: 13, color: c.textSoft, marginBottom: 10, fontWeight: 600 }}>Latest version</p>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>{latestCommitProject?.name}</p>
                    <p style={{ fontSize: 13, color: c.textSoft, marginBottom: 2 }}>{latestCommit.message}</p>
                    <p style={{ fontSize: 12, color: c.textFaint }}>{timeAgo(latestCommit.created_at)}</p>
                  </div>
                )}

                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Recent activity</p>
                {recentActivity.length === 0 ? (
                  <p style={{ color: c.textFaint, fontSize: 13 }}>No commits yet — activity will show up here once you start saving versions.</p>
                ) : (
                  <div style={{ ...card, padding: 4 }}>
                    {recentActivity.map(a => (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${c.border}` }}>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 500 }}>{a.message}</p>
                          <p style={{ fontSize: 12, color: c.textSoft }}>{a.projectName}</p>
                        </div>
                        <span style={{ fontSize: 12, color: c.textFaint, whiteSpace: "nowrap" }}>{timeAgo(a.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>

        ) : selected ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700 }}>{selected.name}</h1>
              <span onClick={openEditProjectForm} style={{ fontSize: 13, color: c.teal, cursor: "pointer", fontWeight: 500 }}>Edit</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <span style={{ background: c.tealSoft, color: c.teal, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{selected.bpm} BPM</span>
              <span style={{ background: c.tealSoft, color: c.teal, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{selected.key}</span>
              <span style={{ background: c.tealSoft, color: c.teal, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{selected.daw} {selected.daw_version}</span>
            </div>

            <div style={{ marginBottom: 24 }}>
              {!committing ? (
                <button onClick={() => setCommitting(true)} style={btnPrimary}>+ Commit</button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Describe this version..."
                    onKeyDown={e => e.key === "Enter" && handleSaveCommit()}
                    style={{ ...input, marginBottom: 0, flex: 1 }}
                  />
                  <button onClick={handleSaveCommit} style={btnPrimary}>Save</button>
                  <button onClick={() => { setCommitting(false); setMessage("") }} style={btnGhost}>Cancel</button>
                </div>
              )}
            </div>

            <p style={{ fontSize: 13, color: c.textSoft, marginBottom: 12 }}>
              {projectCommits.length} commit{projectCommits.length !== 1 ? "s" : ""}
            </p>

            {projectCommits.length === 0 ? (
              <p style={{ color: c.textFaint, fontSize: 13 }}>No commits yet. Hit + Commit to save your first version.</p>
            ) : (
              <div>
                {projectCommits.map((commit, index) => (
                  <div key={commit.id} style={{ ...card, marginBottom: 8, overflow: "hidden" }}>
                    <div
                      onClick={() => handleCommitClick(commit)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", cursor: "pointer" }}
                    >
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 500 }}>{commit.message}</p>
                        <p style={{ fontSize: 12, color: c.textFaint }}>
                          v1.0.{projectCommits.length - 1 - index} · {timeAgo(commit.created_at)}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontSize: 12, color: c.teal }}>{activeCommit?.id === commit.id ? "Hide" : "Plugins"}</span>
                        <span onClick={(e) => { e.stopPropagation(); handleDeleteCommit(commit.id) }} style={{ fontSize: 12, color: c.textFaint }}>✕</span>
                      </div>
                    </div>

                    {activeCommit?.id === commit.id && (
                      <div style={{ borderTop: `1px solid ${c.border}`, padding: 16, background: c.bg }}>
                        <p style={{ fontSize: 11, color: c.teal, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 10 }}>PLUGIN INTELLIGENCE</p>
                        {plugins.length === 0 ? (
                          <p style={{ fontSize: 12, color: c.textFaint }}>No plugin data stored for this commit.</p>
                        ) : (
                          plugins.map((plugin, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", marginBottom: 6, background: c.surface, borderRadius: 8, border: `1px solid ${c.border}` }}>
                              <div>
                                <p style={{ fontSize: 12.5, fontWeight: 500 }}>{plugin.name}</p>
                                <p style={{ fontSize: 11, color: c.textFaint }}>Track: {plugin.track} · Chain #{plugin.chain_order} · Preset: {plugin.preset}</p>
                              </div>
                              <span style={{ fontSize: 11, color: c.textFaint }}>v{plugin.version}</span>
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
        ) : null}
      </div>
    </div>
  )
}

export default App