import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Landing from "./Landing"
import Login from "./Login"
import Dashboard from "./Dashboard"
import { ProjectView, ProjectForm } from "./ProjectView"
import { Logo } from "./ui"
import { baseCss } from "./theme"
import { versionLabel } from "./versionLabel"
import { uploadFile, getDownloadUrl, deleteOnServer, formatBytes } from "./upload"

// ── Constants ───────────────────────────────────────
const FREE_QUOTA_BYTES = 5 * 1024 ** 3 // keep in sync with upload-url.js

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

// A colour per DAW, so the same DAW always gets the same project colour.
// The four DAWs you already had keep their exact colours. Any other DAW name is turned into a number
// (a "hash") and that number picks one colour from the list, so it is stable too.
const dawColors = {
  "FL Studio": "#F97316",
  "Ableton Live": "#22C55E",
  "Logic Pro": "#38BDF8",
  "Pro Tools": "#A78BFA",
}
const extraColors = ["#F59E0B", "#EC4899", "#14B8A6", "#6366F1", "#84CC16", "#EF4444", "#0EA5E9"]
function dawColor(daw) {
  if (!daw || daw === "Unknown") return "#94A3B8"
  if (dawColors[daw]) return dawColors[daw]
  let hash = 0
  for (const ch of daw) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return extraColors[hash % extraColors.length]
}

const emptyProjectForm = { name: "", bpm: "", key: "", daw: "", version: "" }

function App() {
  const [session, setSession] = useState(null)
  const [showAuth, setShowAuth] = useState(false)
  const [loading, setLoading] = useState(true)

  const [projects, setProjects] = useState([])
  const [allCommits, setAllCommits] = useState([]) // every commit, across every project
  const [selected, setSelected] = useState(null)
  const [activeCommit, setActiveCommit] = useState(null)

  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState("")
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [downloadingId, setDownloadingId] = useState(null) // which commit is preparing a download

  const [addingProject, setAddingProject] = useState(false)
  const [editingProject, setEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState(emptyProjectForm)

  const [view, setView] = useState("overview") // overview | project

  // ── AUTH ──────────────────────────────────────────
  useEffect(() => {
    // The id of the person we have already loaded data for.
    // It is a plain variable (not state) because we only need it inside this effect.
    let loadedUserId = null

    // Called whenever Supabase tells us about the session.
    // Supabase also reports "events" when you return to the tab or when its token refreshes.
    // Those are the same person, so we skip them. Without this check, coming back to the tab
    // reloaded everything and jumped you back to your first project.
    function handleSession(newSession) {
      setSession(newSession)
      const newId = newSession?.user?.id ?? null
      if (newId === loadedUserId) return
      loadedUserId = newId
      if (newSession) fetchAll()
      else resetData()
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session)
    })

    // Cleanup: stop listening when this component goes away.
    return () => subscription.unsubscribe()
  }, [])

  // When someone signs out, clear everything so the next person never sees old data.
  function resetData() {
    setProjects([])
    setAllCommits([])
    setSelected(null)

    setActiveCommit(null)
    setView("overview")
    setAddingProject(false)
    setEditingProject(false)
    setLoading(false)
  }

  // ── SIGN-IN ACTIONS (used by the Login page) ──────
  // Each one THROWS on failure. The Login page catches the error and shows its message.
  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      // After Google finishes, send the person back to the same site they started on:
      // localhost while you develop, your live address in production. (Same as your old Auth.jsx.)
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function handleEmailAuth(mode, email, password) {
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      return
    }
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // If email confirmation is switched on in Supabase, there is no session yet.
    // Returning a string makes the Login page show it as a message.
    if (!data.session) return "Check your email to confirm your account, then sign in."
  }

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


  // ── DERIVED, REAL DATA ────────────────────────────
  // Commits belonging to the currently open project
  const projectCommits = selected ? allCommits.filter(cm => cm.project_id === selected.id) : []

  // The single most recent commit across everything the user owns
  const latestCommit = allCommits[0] || null
  const latestCommitProject = latestCommit ? projects.find(p => p.id === latestCommit.project_id) : null

  // A real activity feed: just the last 5 commits, newest first,
  // each one labelled with which project it belongs to.
  const recentActivity = allCommits.slice(0, 5).map(commit => ({
    id: commit.id,
    label: versionLabel(commit),
    message: commit.message,
    project: projects.find(p => p.id === commit.project_id)?.name || "Unknown project",
    when: timeAgo(commit.created_at),
  }))

  const usedBytes = allCommits.reduce((sum, cm) => sum + (Number(cm.file_size) || 0), 0)
  const usedPercent = Math.min(100, (usedBytes / FREE_QUOTA_BYTES) * 100) // 0 to 100

  function commitCountFor(projectId) {
    return allCommits.filter(cm => cm.project_id === projectId).length
  }

  function lastActivityFor(projectId) {
    const found = allCommits.find(cm => cm.project_id === projectId)
    return found ? timeAgo(found.created_at) : ""
  }

  // ── NAVIGATION ────────────────────────────────────
  function goOverview() {
    setView("overview")
    setAddingProject(false)
    setEditingProject(false)
  }

  function openProject(id) {
    const project = projects.find(p => p.id === id)
    if (!project) return
    setSelected(project)
    setView("project")
    setActiveCommit(null)
    // Close any open form and clear a half-typed version note so it does not leak into another project.
    setAddingProject(false)
    setEditingProject(false)
    setCommitting(false)
    setMessage("")
    setFile(null)
    setUploadError("")
  }

  // ── COMMITS: create + delete + download ──────────
  async function handleSaveCommit() {
    if (!message.trim() || uploading) return
    setUploadError("")

    // Step 1: if a file was chosen, upload it first.
    let uploaded = null
    if (file) {
      setUploading(true)
      try {
        uploaded = await uploadFile(file, selected.id)
      } catch (err) {
        console.error(err)
        setUploadError(err.message)
        return
      } finally {
        setUploading(false)
      }
    }

    // Step 2: only after the upload succeeds, save the commit row.
    const { data, error } = await supabase
      .from("commits")
      .insert({
        project_id: selected.id,
        message,
        user_id: session.user.id,
        file_url: uploaded ? uploaded.key : null,
        file_name: uploaded ? uploaded.name : null,
        file_size: uploaded ? uploaded.size : null,
      })
      .select()
    if (error) { console.error(error); return }
    setAllCommits([data[0], ...allCommits])
    setCommitting(false)
    setMessage("")
    setFile(null)
  }

  // Delete goes through our server function, which removes the file
  // from R2 first and the database row second. The screen only
  // changes after the server confirms.
  async function handleDeleteCommit(commitId) {
    if (!confirm("Delete this version and its attached file? This can't be undone.")) return
    try {
      await deleteOnServer({ commitId })
    } catch (err) {
      console.error(err)
      alert(err.message)
      return
    }
    setAllCommits(allCommits.filter(cm => cm.id !== commitId))
    if (activeCommit?.id === commitId) {
      setActiveCommit(null)
    }
  }

  function handleCommitClick(commit) {
    if (activeCommit?.id === commit.id) {
      setActiveCommit(null)
    } else {
      setActiveCommit(commit)
    }
  }

  // Ask our server function for a short-lived download link, then
  // send the browser to it. The reply is marked "attachment", so the
  // browser saves the file and stays on this page.
  async function handleDownload(commit) {
    setDownloadingId(commit.id)
    try {
      const url = await getDownloadUrl(commit.id)
      window.location.assign(url)
    } catch (err) {
      console.error(err)
      alert(err.message)
    } finally {
      setDownloadingId(null)
    }
  }

  // ── PROJECTS: create, edit, delete ───────────────
  function openNewProjectForm() {
    setProjectForm(emptyProjectForm)
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

  function closeProjectForm() {
    setAddingProject(false)
    setEditingProject(false)
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
    if (!confirm("Delete this project, all its versions and their files? This can't be undone.")) return
    try {
      await deleteOnServer({ projectId: id })
    } catch (err) {
      console.error(err)
      alert(err.message)
      return
    }
    const remaining = projects.filter(p => p.id !== id)
    setProjects(remaining)
    setAllCommits(allCommits.filter(cm => cm.project_id !== id))
    if (selected?.id === id) {
      setSelected(remaining[0] || null)
      setView("overview")
    }
  }

  // ── SCREEN ROUTING ────────────────────────────────
  // While we are still checking whether someone is signed in, show a quiet splash.
  // Without it, a signed-in person would see the landing page flash for a moment on every reload.
  if (!session && loading) {
    return (
      <div className="sy-root" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <style>{baseCss}</style>
        <Logo />
      </div>
    )
  }
  if (!session && !showAuth) return <Landing onGetStarted={() => setShowAuth(true)} />
  if (!session && showAuth) {
    return <Login onGoogle={handleGoogle} onEmailAuth={handleEmailAuth} onBack={() => setShowAuth(false)} />
  }

  const firstName = session?.user?.user_metadata?.full_name?.split(" ")[0]
    || session?.user?.email?.split("@")[0]
    || "there"

  // What the main area shows. null means "show the overview".
  let content = null
  if (addingProject) {
    content = (
      <ProjectForm
        editing={editingProject}
        form={projectForm}
        onChange={(field, value) => setProjectForm(f => ({ ...f, [field]: value }))}
        onSubmit={editingProject ? handleUpdateProject : handleCreateProject}
        onCancel={closeProjectForm}
      />
    )
  } else if (view === "project" && selected) {
    content = (
      <ProjectView
        project={selected}
        commits={projectCommits}
        activeCommitId={activeCommit?.id}
        committing={committing}
        message={message}
        file={file}
        uploading={uploading}
        uploadError={uploadError}
        downloadingId={downloadingId}
        timeAgo={timeAgo}
        onEdit={openEditProjectForm}
        onStartCommit={() => setCommitting(true)}
        onCancelCommit={() => { setCommitting(false); setMessage(""); setFile(null); setUploadError("") }}
        onMessageChange={setMessage}
        onFileChange={setFile}
        onSave={handleSaveCommit}
        onToggleCommit={handleCommitClick}
        onDownload={handleDownload}
        onDeleteCommit={handleDeleteCommit}
      />
    )
  }

  return (
    <Dashboard
      userName={firstName}
      loading={loading}
      projects={projects.map(p => ({
        id: p.id,
        name: p.name,
        subtitle: `${p.daw || ""} ${p.daw_version || ""}`.trim(),
        color: dawColor(p.daw),
        versionCount: commitCountFor(p.id),
        lastLabel: lastActivityFor(p.id),
      }))}
      stats={{
        projects: projects.length,
        versions: allCommits.length,
        lastActivity: latestCommit ? timeAgo(latestCommit.created_at) : "—",
      }}
      latestVersion={latestCommit ? {
        projectId: latestCommit.project_id,
        project: latestCommitProject?.name || "Unknown project",
        label: versionLabel(latestCommit),
        message: latestCommit.message,
        when: timeAgo(latestCommit.created_at),
      } : null}
      activity={recentActivity}
      storage={{ used: formatBytes(usedBytes), total: formatBytes(FREE_QUOTA_BYTES), percent: usedPercent }}
      activeId={view === "project" && selected ? selected.id : "overview"}
      onNewProject={openNewProjectForm}
      onOpenProject={openProject}
      onDeleteProject={handleDeleteProject}
      onGoOverview={goOverview}
      onSignOut={() => supabase.auth.signOut()}
    >
      {content}
    </Dashboard>
  )
}

export default App
