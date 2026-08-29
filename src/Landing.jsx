export default function Landing({ onGetStarted }) {
  return (
    <div style={{ background: "#0a0a0b", color: "#e8e4dc", fontFamily: "monospace", minHeight: "100vh" }}>

      {/* Navbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: "1px solid #1a1a1a" }}>
        <span style={{ color: "#e8c97e", fontSize: 18, letterSpacing: "0.1em" }}>SyncTrackr</span>
        <button
          onClick={onGetStarted}
          style={{ background: "transparent", border: "1px solid #333", color: "#888", padding: "8px 20px", fontSize: 11, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.1em" }}
        >
          SIGN IN
        </button>
      </div>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "100px 48px 80px" }}>
        <p style={{ fontSize: 11, color: "#e8c97e", letterSpacing: "0.2em", marginBottom: 24 }}>FOR MUSIC CREATORS</p>
        <h1 style={{ fontSize: 52, fontWeight: 400, lineHeight: 1.1, marginBottom: 24, maxWidth: 700, margin: "0 auto 24px" }}>
          Never lose a project again.
        </h1>
        <p style={{ fontSize: 14, color: "#555", maxWidth: 480, margin: "0 auto 48px", lineHeight: 1.8 }}>
          SyncTrackr is a Git-like backup and versioning system for music projects. Commit your sessions, track every change, and restore anything — intelligently.
        </p>
        <button
          onClick={onGetStarted}
          style={{ background: "#e8c97e", color: "#0a0a0b", border: "none", padding: "14px 36px", fontSize: 12, fontFamily: "monospace", cursor: "pointer", letterSpacing: "0.12em" }}
        >
          GET STARTED FREE
        </button>
      </div>

      {/* Features */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "#1a1a1a", borderTop: "1px solid #1a1a1a", borderBottom: "1px solid #1a1a1a" }}>
        {[
          { title: "Version Control", desc: "Commit snapshots of your session at any point. Roll back to any previous version instantly." },
          { title: "Plugin Intelligence", desc: "Every commit stores your plugin chain — name, version, preset, parameters, and order." },
          { title: "Smart Restore", desc: "Restore your full session with guided reconstruction. Never start from scratch again." },
          { title: "DAW Agnostic", desc: "Works with FL Studio, Ableton, Logic, Pro Tools — any DAW you use." },
          { title: "Cloud Backup", desc: "All your project files backed up securely. Access them from any machine." },
          { title: "Collaboration", desc: "Share projects with collaborators. Coming soon." },
        ].map((f, i) => (
          <div key={i} style={{ background: "#0a0a0b", padding: "40px 32px" }}>
            <h3 style={{ fontSize: 13, color: "#e8c97e", marginBottom: 12, letterSpacing: "0.08em" }}>{f.title}</h3>
            <p style={{ fontSize: 12, color: "#444", lineHeight: 1.8 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div style={{ padding: "80px 48px", textAlign: "center" }}>
        <p style={{ fontSize: 11, color: "#e8c97e", letterSpacing: "0.2em", marginBottom: 48 }}>PRICING</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, maxWidth: 900, margin: "0 auto" }}>
          {[
            { name: "Free", price: "$0", storage: "5 GB", features: "Last commit only" },
            { name: "Starter", price: "$19/yr", storage: "100 GB", features: "Full history" },
            { name: "Creator", price: "$39/yr", storage: "200 GB", features: "Collaboration" },
            { name: "Pro", price: "$69/yr", storage: "1 TB", features: "Priority support" },
          ].map((p, i) => (
            <div key={i} style={{ border: `1px solid ${i === 2 ? "#e8c97e" : "#1a1a1a"}`, padding: "32px 24px" }}>
              <p style={{ fontSize: 11, color: i === 2 ? "#e8c97e" : "#555", letterSpacing: "0.1em", marginBottom: 16 }}>{p.name}</p>
              <p style={{ fontSize: 28, color: "#e8e4dc", marginBottom: 8 }}>{p.price}</p>
              <p style={{ fontSize: 11, color: "#333", marginBottom: 8 }}>{p.storage}</p>
              <p style={{ fontSize: 11, color: "#333" }}>{p.features}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1a1a1a", padding: "24px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#e8c97e", fontSize: 14, letterSpacing: "0.1em" }}>SyncTrackr</span>
        <span style={{ fontSize: 11, color: "#333" }}>Never lose a project again.</span>
      </div>

    </div>
  )
}