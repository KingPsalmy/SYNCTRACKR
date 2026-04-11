import { useState } from "react"

const initialProjects = [
  {
    id: 1, name: "Midnight Gospel", bpm: 98, key: "C# minor", tracks: 12,
    daw: "FL Studio", version: "21.2",
    commits: [
      { id: "v1.0.2", message: "Added vocal doubles + reverb tail", time: "2h ago", size: "340 MB" },
      { id: "v1.0.1", message: "Re-EQ'd synth lead, dropped sub", time: "Yesterday", size: "310 MB" },
      { id: "v1.0.0", message: "First rough mix", time: "3 days ago", size: "280 MB" },
    ]
  },
  {
    id: 2, name: "Sunday Morning", bpm: 72, key: "G major", tracks: 8,
    daw: "Ableton Live", version: "11.3",
    commits: [
      { id: "v1.0.0", message: "Initial commit — choir arrangement", time: "5 days ago", size: "190 MB" },
    ]
  },
  {
    id: 3, name: "Lagos Rain", bpm: 112, key: "F# minor", tracks: 16,
    daw: "FL Studio", version: "21.2",
    commits: [
      { id: "v1.0.3", message: "Final mix — mastering ready", time: "1h ago", size: "520 MB" },
      { id: "v1.0.2", message: "Afrobeat percussion overdubs", time: "2 days ago", size: "480 MB" },
      { id: "v1.0.1", message: "Bass & keys locked", time: "4 days ago", size: "410 MB" },
      { id: "v1.0.0", message: "Skeleton arrangement", time: "1 week ago", size: "180 MB" },
    ]
  },
]

function App() {
  const [projects, setProjects] = useState(initialProjects)
  const [selected, setSelected] = useState(initialProjects[0])
  const [committing, setCommitting] = useState(false)
  const [message, setMessage] = useState("")

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

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "monospace", background: "#0a0a0b", color: "#e8e4dc" }}>

      {/* Sidebar */}
      <div style={{ width: 220, borderRight: "1px solid #1e1e1e", padding: 16 }}>
        <h2 style={{ color: "#e8c97e", marginBottom: 24, fontSize: 18 }}>FIRETRACKS</h2>
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => setSelected(p)}
            style={{
              padding: "10px 12px",
              marginBottom: 8,
              cursor: "pointer",
              borderLeft: selected.id === p.id ? "2px solid #e8c97e" : "2px solid transparent",
              background: selected.id === p.id ? "#111" : "transparent",
              color: selected.id === p.id ? "#e8e4dc" : "#555",
            }}
          >
            {p.name}
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>{selected.name}</h1>
        <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.bpm} BPM</span>
          <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.key}</span>
          <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.tracks} tracks</span>
          <span style={{ background: "#1a1a1a", padding: "4px 10px", fontSize: 11 }}>{selected.daw} {selected.version}</span>
        </div>

        <p style={{ fontSize: 11, color: "#333", marginBottom: 32 }}>
          {selected.commits.length} commit{selected.commits.length !== 1 ? "s" : ""}
        </p>

        {/* Commit Button */}
        <div style={{ marginBottom: 24 }}>
          {!committing ? (
            <button
              onClick={() => setCommitting(true)}
              style={{
                background: "#e8c97e", color: "#0a0a0b", border: "none",
                padding: "10px 20px", fontSize: 12, fontFamily: "monospace",
                cursor: "pointer", letterSpacing: "0.1em",
              }}
            >
              + COMMIT
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe this version..."
                onKeyDown={e => e.key === "Enter" && handleSave()}
                style={{
                  flex: 1, background: "#111", border: "1px solid #2a2a2a",
                  color: "#e8e4dc", padding: "10px 14px", fontSize: 12,
                  fontFamily: "monospace", outline: "none",
                }}
              />
              <button
                onClick={handleSave}
                style={{
                  background: "#e8c97e", color: "#0a0a0b", border: "none",
                  padding: "10px 20px", fontSize: 12, fontFamily: "monospace",
                  cursor: "pointer",
                }}
              >
                SAVE
              </button>
              <button
                onClick={() => { setCommitting(false); setMessage("") }}
                style={{
                  background: "transparent", color: "#555", border: "1px solid #222",
                  padding: "10px 20px", fontSize: 12, fontFamily: "monospace",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
            </div>
          )}
        </div>

        {/* Commit History */}
        <div>
          {selected.commits.map(commit => (
            <div key={commit.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 16px", marginBottom: 8, background: "#111",
              borderLeft: "2px solid #1e1e1e",
            }}>
              <div>
                <div style={{ fontSize: 13, marginBottom: 4 }}>{commit.message}</div>
                <div style={{ fontSize: 10, color: "#444" }}>{commit.id} · {commit.time}</div>
              </div>
              <div style={{ fontSize: 11, color: "#555" }}>{commit.size}</div>
            </div>
          ))}
        </div>

      </div>

    </div>
  )
}

export default App