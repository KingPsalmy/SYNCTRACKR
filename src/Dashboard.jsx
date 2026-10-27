import { useState, useEffect } from "react"
import { Logo } from "./ui"
import { c, baseCss } from "./theme"

// ── How this component works ──
// Dashboard is the "frame" of the signed-in app: the sidebar (or the phone drawer and top bar)
// plus the main area. What shows in the main area depends on the `children` prop:
//   - no children  -> the overview (greeting, stats, recent projects, latest version, activity)
//   - children     -> whatever you pass (the project page, the project form)
// Your data and actions come in as props, already formatted as text, so your own date and
// storage formatting code stays where it is:
//
//   userName      "FIREBREED"
//   loading       true while data is loading
//   projects      [{ id, name, subtitle, color, versionCount, lastLabel }]
//                   subtitle  = the DAW and version line, e.g. "FL Studio 26.1.7"
//                   color     = the project's colour, e.g. "#F97316"
//                   lastLabel = e.g. "Yesterday"
//   stats         { projects, versions, lastActivity }
//   latestVersion { projectId, project, message, when }   or null
//   activity      [{ id, message, project, when }]         newest first
//   storage       { used: "3.1 MB", total: "5.0 GB", percent: 0.06 }   percent is 0 to 100
//   activeId      "overview" or a project id (highlights the sidebar)
//   onNewProject, onOpenProject(id), onDeleteProject(id), onGoOverview, onSignOut
//
// onDeleteProject is expected to ask "are you sure?" itself (yours already does).

// Used when a project has no colour of its own (all in the teal family plus two neutrals).
const fallbackColors = [c.teal, c.tealDark, "#7FD1C6", "#94A3B8", "#F59E0B"]

// Picks the greeting from the visitor's local clock.
function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

// "1 version", "2 versions"
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`

// ── Page styling ──
// "db-" classes are only for this component. Buttons, inputs, fonts and colours come from ui.jsx.
const css = `
.db-shell { display: grid; grid-template-columns: 264px 1fr; min-height: 100vh; min-height: 100dvh; }
.db-top, .db-scrim, .db-close { display: none; }

/* sidebar */
.db-side { position: sticky; top: 0; height: 100vh; height: 100dvh; display: flex; flex-direction: column;
  background: var(--surface); border-right: 1px solid var(--border); padding: 22px 18px 18px; }
.db-side-head { display: flex; align-items: center; justify-content: space-between; padding: 2px 6px 18px; }
.db-new { width: 100%; }
.db-nav { flex: 1; min-height: 0; display: flex; flex-direction: column; margin-top: 18px; }
.db-navitem { width: 100%; text-align: left; background: none; border: 0; border-radius: 10px; padding: 10px 12px;
  font: 500 14.5px 'Inter', sans-serif; color: var(--text); cursor: pointer; transition: background .15s, color .15s; }
.db-navitem:hover { background: var(--teal-faint); }
.db-navitem.on { background: var(--teal-soft); color: var(--teal-dark); font-weight: 600; }
.db-label { font-size: 12px; font-weight: 600; color: var(--soft); padding: 20px 12px 8px; }
.db-projects { overflow-y: auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); gap: 2px; align-content: start; }
.db-proj { display: flex; align-items: center; border-radius: 10px; transition: background .15s; }
.db-proj:hover { background: var(--teal-faint); }
.db-proj.on { background: var(--teal-soft); }
.db-proj-name { flex: 1; min-width: 0; text-align: left; background: none; border: 0; padding: 9px 12px; cursor: pointer;
  font: 500 14.5px 'Inter', sans-serif; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-x { background: none; border: 0; color: var(--faint); font: 400 18px/1 'Inter', sans-serif; padding: 11px 12px; cursor: pointer; border-radius: 8px; }
.db-x:hover { color: var(--danger); }
.db-side-foot { border-top: 1px solid var(--border); padding-top: 14px; margin-top: 10px; }
.db-signout { width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px;
  padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; color: var(--text);
  font: 600 14px 'Inter', sans-serif; cursor: pointer; transition: background .15s, border-color .15s, color .15s; }
.db-signout svg { flex: none; transition: transform .2s var(--ease); }
.db-signout:hover { background: #FEF2F2; border-color: #FECACA; color: var(--danger); }
.db-signout:hover svg { transform: translateX(3px); }
.db-none { font-size: 13px; color: var(--faint); padding: 4px 12px; }
.db-storage-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--soft); margin: 8px 0 6px; }
.db-bar { height: 6px; border-radius: 99px; background: var(--teal-soft); overflow: hidden; }
.db-bar i { display: block; height: 100%; border-radius: inherit; background: var(--teal); transition: width 1s var(--ease); }
.db-bar.warn i { background: #D97706; }

/* main area */
.db-main { padding: 40px 44px 64px; min-width: 0; }
.db-wrap { max-width: 1160px; margin: 0 auto; }
.db-in { animation: sy-up .6s var(--ease) both; animation-delay: calc(var(--i, 0) * .07s); }
.db-hello { font-size: clamp(26px, 3.4vw, 34px); font-weight: 700; }
.db-wave { display: inline-block; transform-origin: 70% 70%; animation: db-wave 1.6s ease .5s 1; }
@keyframes db-wave { 0%, 60%, 100% { transform: none; } 10%, 30% { transform: rotate(16deg); } 20%, 40% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
.db-sub { color: var(--soft); margin: 6px 0 22px; }
.db-search { max-width: 380px; }
.db-loading { color: var(--faint); font-size: 14px; }

.db-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; margin: 26px 0 36px; }
.db-stat { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px 22px;
  transition: transform .25s var(--ease), border-color .2s; }
.db-stat:hover { transform: translateY(-3px); border-color: var(--teal); }
.db-stat span { font-size: 13.5px; color: var(--soft); }
.db-stat b { display: block; margin-top: 4px; font: 700 32px 'Bricolage Grotesque', sans-serif; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

.db-h { font-size: 18px; font-weight: 700; margin-bottom: 14px; }
.db-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 36px; }
.db-card { text-align: left; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
  padding: 0; cursor: pointer; font: inherit; color: inherit;
  transition: transform .25s var(--ease), box-shadow .25s, border-color .2s; }
.db-card:hover { transform: translateY(-4px); border-color: var(--teal); box-shadow: 0 14px 30px -16px rgba(7,63,57,.4); }
.db-strip { height: 68px; position: relative; }
.db-strip::after { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,.3), transparent 60%); }
.db-card-body { padding: 16px 18px 18px; }
.db-card h3 { font: 600 16px 'Inter', sans-serif; letter-spacing: 0; overflow-wrap: anywhere; }
.db-card-sub { font-size: 13px; color: var(--soft); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-card-meta { font-size: 12.5px; color: var(--faint); margin-top: 10px; }

.db-panel { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 20px 22px; margin-bottom: 36px; }
.db-panel b { display: block; font-size: 17px; }
.db-panel p { color: var(--soft); font-size: 14.5px; }
.db-panel em { font-style: normal; color: var(--faint); font-size: 13px; }
.db-link { background: none; border: 0; color: var(--teal); font: 600 14px 'Inter', sans-serif; cursor: pointer; padding: 12px 4px; }
.db-link:hover { color: var(--teal-dark); text-decoration: underline; }

.db-list { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.db-row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; padding: 14px 20px; border-top: 1px solid var(--border); }
.db-row:first-child { border-top: 0; }
.db-row b { font-size: 14.5px; font-weight: 600; }
.db-row span { display: block; font-size: 13px; color: var(--soft); }
.db-row time { font-size: 13px; color: var(--faint); white-space: nowrap; }
.db-empty { background: var(--surface); border: 1px dashed var(--border); border-radius: 14px; padding: 28px 20px; text-align: center; color: var(--soft); margin-bottom: 36px; }
.db-empty .sy-btn { margin-top: 14px; }

/* tablets and phones: the sidebar becomes a drawer that slides in from the left */
@media (max-width: 860px) {
  .db-shell { grid-template-columns: 1fr; }
  .db-top { display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 30; height: 60px; padding: 0 16px;
    background: rgba(255,255,255,.92); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
  .db-spacer { flex: 1; }
  .db-burger { width: 42px; height: 42px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; cursor: pointer; }
  .db-burger span { display: block; width: 18px; height: 2px; background: var(--text); border-radius: 2px; }
  .db-scrim { display: block; position: fixed; inset: 0; z-index: 40; background: rgba(7,63,57,.45);
    opacity: 0; pointer-events: none; transition: opacity .3s; }
  .db-scrim.open { opacity: 1; pointer-events: auto; }
  .db-side { position: fixed; left: 0; top: 0; bottom: 0; height: auto; width: min(300px, 86vw); z-index: 50;
    transform: translateX(-102%); visibility: hidden; transition: transform .35s var(--ease), visibility 0s .35s; }
  .db-side.open { transform: none; visibility: visible; transition-delay: 0s; box-shadow: 0 0 60px rgba(0,0,0,.25); }
  .db-close { display: block; background: none; border: 0; font: 400 26px/1 'Inter', sans-serif; color: var(--soft); cursor: pointer; padding: 8px 12px; }
  .db-navitem { padding: 12px; }
  .db-proj-name { padding-top: 12px; padding-bottom: 12px; }
  .db-main { padding: 24px 16px 56px; }
  .db-search { max-width: none; }
  .db-row { flex-direction: column; gap: 2px; }
}

/* phones: the three summary cards become a compact 2 + 1 grid instead of three tall cards */
@media (max-width: 560px) {
  .db-stats { grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0 28px; }
  .db-stat { padding: 16px 18px; }
  .db-stat b { font-size: 26px; }
  .db-stat:last-child { grid-column: 1 / -1; }
}
`

// ── Small pieces ──

// Counts up from 0 to a number when it first appears.
function CountUp({ to }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setVal(to))
      return () => cancelAnimationFrame(frame)
    }
    let raf = 0, t0 = 0
    const tick = t => {
      if (!t0) t0 = t
      const k = Math.min(1, (t - t0) / 900)
      setVal(Math.round(to * (1 - Math.pow(1 - k, 3)))) // ease-out: fast first, slow at the end
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{val}</>
}

export default function Dashboard({
  userName = "there",
  loading = false,
  projects = [],
  stats = { projects: 0, versions: 0, lastActivity: "—" },
  latestVersion = null,
  activity = [],
  storage = { used: "0 MB", total: "5.0 GB", percent: 0 },
  activeId = "overview",
  onNewProject, onOpenProject, onDeleteProject, onGoOverview, onSignOut,
  children,
}) {
  const [query, setQuery] = useState("")              // what is typed in the search box
  const [drawerOpen, setDrawerOpen] = useState(false) // is the mobile sidebar open?
  const [barReady, setBarReady] = useState(false)     // lets the storage bar grow from 0 on load

  // Grow the storage bar one frame after the first paint, so the CSS transition has something to animate from.
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // While the mobile drawer is open: lock the page behind it from scrolling, and let Escape close it.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = e => { if (e.key === "Escape") setDrawerOpen(false) }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [drawerOpen])

  // Close the drawer, then run the action. Used by every sidebar button.
  const go = fn => () => { setDrawerOpen(false); if (fn) fn() }

  // Filter the project cards by whatever is typed in the search box.
  // With no search we show the 6 most recent; with a search we show every match.
  const q = query.trim().toLowerCase()
  const matches = projects.filter(p =>
    !q || p.name.toLowerCase().includes(q) || (p.subtitle || "").toLowerCase().includes(q)
  )
  const shown = q ? matches : matches.slice(0, 6)

  // percent is always 0 to 100. A tiny but non-zero amount still gets a sliver so it stays visible.
  const pct = Math.min(100, Math.max(0, Number(storage.percent) || 0))

  // The overview screen. It is only shown when no children were passed in.
  const overview = (
    <>
      <h1 className="db-hello db-in">{greeting()}, {userName} <span className="db-wave" aria-hidden="true">👋</span></h1>
      <p className="db-sub db-in" style={{ "--i": 1 }}>Every version tells a story. Yours is safe with us.</p>
      <input className="sy-input db-search db-in" style={{ "--i": 2 }} type="search" placeholder="Search projects"
        aria-label="Search projects" value={query} onChange={e => setQuery(e.target.value)} />

      <div className="db-stats">
        <div className="db-stat db-in" style={{ "--i": 3 }}><span>Projects</span><b><CountUp to={stats.projects} /></b></div>
        <div className="db-stat db-in" style={{ "--i": 4 }}><span>Versions saved</span><b><CountUp to={stats.versions} /></b></div>
        <div className="db-stat db-in" style={{ "--i": 5 }}><span>Last activity</span><b>{stats.lastActivity}</b></div>
      </div>

      {loading ? (
        <p className="db-loading">Loading...</p>
      ) : (
        <>
          <h2 className="db-h db-in" style={{ "--i": 6 }}>Recent projects</h2>
          {projects.length === 0 ? (
            <div className="db-empty db-in" style={{ "--i": 7 }}>
              <p>No projects yet. Create one to start saving versions.</p>
              <button className="sy-btn sy-btn-primary" onClick={onNewProject}>Create your first project</button>
            </div>
          ) : shown.length === 0 ? (
            <div className="db-empty db-in"><p>No projects match "{query}".</p></div>
          ) : (
            <div className="db-cards">
              {shown.map((p, i) => (
                <button key={p.id} className="db-card db-in" style={{ "--i": 7 + i }} onClick={() => onOpenProject && onOpenProject(p.id)}>
                  <div className="db-strip" style={{ background: p.color || fallbackColors[i % fallbackColors.length] }} />
                  <div className="db-card-body">
                    <h3>{p.name}</h3>
                    {p.subtitle && <p className="db-card-sub">{p.subtitle}</p>}
                    <p className="db-card-meta">
                      {p.versionCount ? `${plural(p.versionCount, "version")} · ${p.lastLabel}` : "No versions yet"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <h2 className="db-h db-in" style={{ "--i": 8 }}>Latest version</h2>
          {latestVersion ? (
            <div className="db-panel db-in" style={{ "--i": 9 }}>
              <div>
                <b>{latestVersion.project}</b>
                <p>{latestVersion.message}</p>
                <em>{latestVersion.when}</em>
              </div>
              {latestVersion.projectId && (
                <button className="db-link" onClick={() => onOpenProject && onOpenProject(latestVersion.projectId)}>Open project</button>
              )}
            </div>
          ) : (
            <div className="db-empty db-in" style={{ "--i": 9 }}><p>Your latest saved version will show up here.</p></div>
          )}

          <h2 className="db-h db-in" style={{ "--i": 10 }}>Recent activity</h2>
          {activity.length ? (
            <div className="db-list db-in" style={{ "--i": 11 }}>
              {activity.map((a, i) => (
                <div key={a.id ?? i} className="db-row">
                  <div><b>{a.message}</b><span>{a.project}</span></div>
                  <time>{a.when}</time>
                </div>
              ))}
            </div>
          ) : (
            <div className="db-empty db-in" style={{ "--i": 11 }}><p>Nothing here yet. Save your first version to see activity.</p></div>
          )}
        </>
      )}
    </>
  )

  return (
    <div className="sy-root db-shell">
      <style>{baseCss}{css}</style>

      {/* Phone top bar: menu button, logo, quick "New" button */}
      <header className="db-top">
        <button className="db-burger" aria-label="Open menu" aria-expanded={drawerOpen} aria-controls="db-side"
          onClick={() => setDrawerOpen(true)}>
          <span /><span /><span />
        </button>
        <Logo size={24} onClick={onGoOverview} />
        <span className="db-spacer" />
        <button className="sy-btn sy-btn-primary sy-btn-sm" onClick={onNewProject}>+ New</button>
      </header>

      {/* Dark scrim behind the drawer. Tapping it closes the menu. */}
      <div className={`db-scrim ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} aria-hidden="true" />

      {/* Sidebar (a fixed column on desktop, a sliding drawer on phones) */}
      <aside id="db-side" className={`db-side ${drawerOpen ? "open" : ""}`} aria-label="Sidebar">
        <div className="db-side-head">
          <Logo onClick={go(onGoOverview)} />
          <button className="db-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>×</button>
        </div>

        <button className="sy-btn sy-btn-primary db-new" onClick={go(onNewProject)}>+ New project</button>

        <nav className="db-nav" aria-label="Dashboard">
          <button className={`db-navitem ${activeId === "overview" ? "on" : ""}`} onClick={go(onGoOverview)}>Overview</button>
          <p className="db-label">Projects</p>
          <div className="db-projects">
            {projects.length === 0 && <p className="db-none">No projects yet</p>}
            {projects.map(p => (
              <div key={p.id} className={`db-proj ${activeId === p.id ? "on" : ""}`}>
                <button className="db-proj-name" onClick={go(() => onOpenProject && onOpenProject(p.id))}>{p.name}</button>
                <button className="db-x" aria-label={`Delete ${p.name}`}
                  onClick={() => onDeleteProject && onDeleteProject(p.id)}>×</button>
              </div>
            ))}
          </div>
        </nav>

        <div className="db-side-foot">
          <div className="db-storage-row"><span>Storage</span><span>{storage.used} of {storage.total}</span></div>
          <div className={`db-bar ${pct >= 90 ? "warn" : ""}`} role="progressbar" aria-label="Storage used"
            aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
            <i style={{ width: `${barReady ? Math.max(pct, pct > 0 ? 1.5 : 0) : 0}%` }} />
          </div>
          <button className="db-signout" onClick={go(onSignOut)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content: your children if you passed any, otherwise the overview */}
      <main className="db-main">
        <div className="db-wrap">{children ?? overview}</div>
      </main>
    </div>
  )
}
