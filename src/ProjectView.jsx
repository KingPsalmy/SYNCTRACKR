import PluginNotes from "./PluginNotes"
import { formatBytes } from "./upload"

// ── What is in this file ──
// Two screens that appear inside the Dashboard frame:
//   ProjectView  the page for one project: its details, the "save a version" form and the version list
//   ProjectForm  the form for creating or editing a project
// Both only draw things. Your App.jsx owns the data and passes in the actions.
// They sit inside Dashboard, which already loads the shared styles from ui.jsx.

// Suggestions shown while typing in the DAW box (the same names as the landing page).
const dawOptions = [
  "FL Studio", "Cubase", "Reason", "Pro Tools", "Studio One", "Ableton Live", "Logic Pro",
  "Bitwig Studio", "Cakewalk", "GarageBand", "MOTU Digital Performer", "Ardour",
]

const css = `
.pv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.pv-head h1 { font-size: clamp(24px, 3.2vw, 32px); font-weight: 700; overflow-wrap: anywhere; }
.pv-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 26px; }
.pv-chip { background: var(--teal-soft); color: var(--teal-dark); padding: 4px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 500; }
.pv-new { margin-bottom: 24px; }

.pv-commitform { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin-bottom: 24px;
  animation: sy-up .35s var(--ease) both; }
.pv-row { display: flex; gap: 8px; flex-wrap: wrap; }
.pv-row .sy-input { flex: 1; min-width: 200px; }
.pv-file { display: block; margin-top: 14px; font-size: 13px; color: var(--soft); }
.pv-file input { display: block; margin-top: 6px; min-height: 40px; font: 400 13.5px 'Inter', sans-serif; max-width: 100%; }
.pv-file input::file-selector-button { margin-right: 12px; padding: 9px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font: 600 13px 'Inter', sans-serif; cursor: pointer; }
.pv-fileinfo { font-size: 12.5px; color: var(--soft); margin-top: 6px; overflow-wrap: anywhere; }
.pv-help { font-size: 12.5px; color: var(--soft); margin-top: 8px; }
.pv-error { color: var(--danger); font-size: 13px; margin-top: 8px; }

.pv-count { font-size: 13.5px; color: var(--soft); margin-bottom: 4px; }
.pv-numbering { font-size: 12.5px; color: var(--soft); margin-bottom: 12px; }
.pv-empty { background: var(--surface); border: 1px dashed var(--border); border-radius: 14px; padding: 28px 20px; text-align: center; color: var(--soft); }

.pv-commit { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; margin-bottom: 10px; overflow: hidden;
  animation: sy-up .5s var(--ease) both; animation-delay: calc(var(--i, 0) * .05s); }
.pv-commit-head { display: flex; align-items: center; justify-content: space-between; gap: 4px 16px; flex-wrap: wrap; padding: 6px 10px 6px 6px; }
.pv-commit-main { flex: 1; min-width: 200px; text-align: left; background: none; border: 0; border-radius: 10px; padding: 10px;
  cursor: pointer; font: inherit; color: inherit; transition: background .15s; }
.pv-commit-main:hover { background: var(--teal-faint); }
.pv-commit-main b { display: block; font-size: 14.5px; font-weight: 600; overflow-wrap: anywhere; }
.pv-commit-main span { display: block; font-size: 12.5px; color: var(--faint); }
.pv-commit-main .pv-note { font-size: 14px; color: var(--text); margin: 3px 0; overflow-wrap: anywhere; }
.pv-commit-main em { display: block; font-style: normal; font-size: 12.5px; color: var(--teal); margin-top: 2px; overflow-wrap: anywhere; }
.pv-actions { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.pv-link { background: none; border: 0; color: var(--teal); font: 600 13px 'Inter', sans-serif; padding: 10px 12px; border-radius: 8px; cursor: pointer; }
.pv-link:hover:not(:disabled) { background: var(--teal-faint); }
.pv-link:disabled { opacity: .6; cursor: wait; }
.pv-del { background: none; border: 0; color: var(--faint); font: 400 20px/1 'Inter', sans-serif; padding: 8px 12px; min-width: 40px; min-height: 40px; border-radius: 8px; cursor: pointer; }
.pv-del:hover { color: var(--danger); }

.pv-plugins { border-top: 1px solid var(--border); padding: 16px 18px; background: var(--bg); }
.pv-plugins h3 { font: 600 13px 'Inter', sans-serif; letter-spacing: 0; color: var(--teal-dark); margin-bottom: 8px; }
.pv-track { padding: 10px 0; border-bottom: 1px solid var(--border); }
.pv-track:last-child { border-bottom: 0; }
.pv-track-name { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
.pv-chain { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.pv-plugin { background: var(--teal-soft); border-radius: 8px; padding: 5px 10px; font-size: 12.5px; color: var(--teal-dark); }
.pv-plugin small { display: block; font-size: 11px; color: var(--soft); }
.pv-sep { color: var(--faint); font-size: 14px; }
.pv-none { font-size: 13px; color: var(--faint); }

/* project form */
.pv-form { max-width: 480px; }
.pv-form h1 { font-size: clamp(24px, 3.2vw, 30px); font-weight: 700; margin-bottom: 6px; }
.pv-form-sub { color: var(--soft); margin-bottom: 24px; }
.pv-field { margin-bottom: 16px; }
.pv-field label { display: block; font-size: 13.5px; font-weight: 500; margin-bottom: 6px; }
.pv-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pv-form-actions { display: flex; gap: 10px; margin-top: 8px; }

@media (max-width: 560px) {
  .pv-actions { width: 100%; justify-content: flex-end; padding: 0 4px 6px; }
  .pv-two { grid-template-columns: 1fr; gap: 0; }
  .pv-form-actions .sy-btn { flex: 1; }
  .pv-row .sy-btn { flex: 1; }
}
`

export function ProjectView({
  project, commits, versionLabels, activeCommitId,
  committing, message, file, uploading, uploadProgress, uploadError, downloadingId,
  timeAgo,
  onEdit, onStartCommit, onCancelCommit, onMessageChange, onFileChange, onSave,
  onToggleCommit, onDownload, onDeleteCommit,
}) {
  const details = `${project.daw || ""} ${project.daw_version || ""}`.trim()

  return (
    <>
      <style>{css}</style>

      <div className="pv-head">
        <h1>{project.name}</h1>
        <button className="sy-btn sy-btn-ghost sy-btn-sm" onClick={onEdit}>Edit</button>
      </div>
      <div className="pv-chips">
        <span className="pv-chip">{project.bpm} BPM</span>
        <span className="pv-chip">{project.key}</span>
        {details && <span className="pv-chip">{details}</span>}
      </div>

      {/* Save-a-version button, or the form once it is open */}
      {!committing ? (
        <button className="sy-btn sy-btn-primary pv-new" onClick={onStartCommit}>+ Save a version</button>
      ) : (
        <form className="pv-commitform" onSubmit={e => { e.preventDefault(); onSave() }}>
          <div className="pv-row">
            <input className="sy-input" value={message} disabled={uploading} onChange={e => onMessageChange(e.target.value)}
              placeholder="Version note, e.g. Balanced the vocals" aria-label="Version note" aria-describedby="pv-note-help" autoFocus />
            <button className="sy-btn sy-btn-primary" type="submit" disabled={uploading || !message.trim()}>
              {uploading ? (uploadProgress === null ? "Saving..." : "Uploading...") : "Save"}
            </button>
            <button className="sy-btn sy-btn-ghost" type="button" onClick={onCancelCommit} disabled={uploading}>Cancel</button>
          </div>
          <p id="pv-note-help" className="pv-help">Your new version will follow the versions currently saved.</p>
          <label className="pv-file">
            Attach your project file or a zipped folder (optional)
            <input type="file" disabled={uploading} onChange={e => onFileChange(e.target.files[0] || null)} />
          </label>
          {file && <p className="pv-fileinfo">{file.name} · {formatBytes(file.size)}</p>}
          {uploading && <div className="pv-help" role="status" aria-live="polite">
            {uploadProgress === null ? "Saving your version..." : <>
              <label htmlFor="upload-progress">{uploadProgress === 100 ? "Upload sent. Waiting for storage confirmation..." : `Uploading to cloud storage: ${uploadProgress}%`}</label>
              <progress id="upload-progress" max="100" value={uploadProgress} style={{ width: "100%", accentColor: "var(--teal)" }} />
            </>}
          </div>}
          {uploadError && <p className="pv-error" role="alert">{uploadError}</p>}
        </form>
      )}

      <p className="pv-count">{commits.length} saved version{commits.length !== 1 ? "s" : ""}</p>
      {commits.length > 0 && <p className="pv-numbering">Numbered oldest to newest. Deleting a version updates the displayed numbers.</p>}

      {commits.length === 0 ? (
        <div className="pv-empty">No versions yet. Press "Save a version" to add your first.</div>
      ) : (
        commits.map((commit, index) => {
          const open = activeCommitId === commit.id
          const label = versionLabels.get(commit.id) || "Saved version"
          return (
            <div key={commit.id} className="pv-commit" style={{ "--i": Math.min(index, 8) }}>
              <div className="pv-commit-head">
                {/* The text area is a real button, so keyboard and screen reader users can open it too */}
                <button className="pv-commit-main" aria-expanded={open} onClick={() => onToggleCommit(commit)}>
                  <b>{label}</b>
                  {commit.message && <span className="pv-note">Note: {commit.message}</span>}
                  <span>{timeAgo(commit.created_at)}</span>
                  {commit.file_name && <em>{commit.file_name} · {formatBytes(commit.file_size)}</em>}
                </button>
                <div className="pv-actions">
                  {commit.file_url && (
                    <button className="pv-link" onClick={() => onDownload(commit)} disabled={downloadingId === commit.id}>
                      {downloadingId === commit.id ? "Preparing..." : "Download"}
                    </button>
                  )}
                  <button className="pv-link" onClick={() => onToggleCommit(commit)}>{open ? "Hide plugins" : "Plugins"}</button>
                  <button className="pv-del" aria-label={`Delete ${label}${commit.message ? `, note: ${commit.message}` : ""}`} onClick={() => onDeleteCommit(commit.id)}>×</button>
                </div>
              </div>

              {open && (
                <div className="pv-plugins">
                  <h3>Plugin Intelligence</h3>
                  <PluginNotes
                    key={commit.id}
                    commitId={commit.id}
                    title={label}
                    fileName={commit.file_name}
                    hasFile={Boolean(commit.file_url)}
                    onDownload={() => onDownload(commit)}
                    downloading={downloadingId === commit.id}
                  />
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}

export function ProjectForm({ editing, form, onChange, onSubmit, onCancel }) {
  return (
    <>
      <style>{css}</style>
      <form className="pv-form" onSubmit={e => { e.preventDefault(); onSubmit() }}>
        <h1>{editing ? "Edit project" : "New project"}</h1>
        <p className="pv-form-sub">
          {editing ? "Update the details of this project." : "Add the basics. You can change them later."}
        </p>

        <div className="pv-field">
          <label htmlFor="pf-name">Project name</label>
          <input id="pf-name" className="sy-input" required autoFocus value={form.name}
            onChange={e => onChange("name", e.target.value)} />
        </div>

        <div className="pv-two">
          <div className="pv-field">
            <label htmlFor="pf-bpm">BPM</label>
            <input id="pf-bpm" className="sy-input" inputMode="numeric" placeholder="120" value={form.bpm}
              onChange={e => onChange("bpm", e.target.value)} />
          </div>
          <div className="pv-field">
            <label htmlFor="pf-key">Key</label>
            <input id="pf-key" className="sy-input" placeholder="F minor" value={form.key}
              onChange={e => onChange("key", e.target.value)} />
          </div>
        </div>

        <div className="pv-two">
          <div className="pv-field">
            <label htmlFor="pf-daw">DAW</label>
            <input id="pf-daw" className="sy-input" list="pv-daws" placeholder="FL Studio" value={form.daw}
              onChange={e => onChange("daw", e.target.value)} />
            <datalist id="pv-daws">{dawOptions.map(d => <option key={d} value={d} />)}</datalist>
          </div>
          <div className="pv-field">
            <label htmlFor="pf-version">DAW version</label>
            <input id="pf-version" className="sy-input" placeholder="26.1.7" value={form.version}
              onChange={e => onChange("version", e.target.value)} />
          </div>
        </div>

        <div className="pv-form-actions">
          <button className="sy-btn sy-btn-primary" type="submit">{editing ? "Save changes" : "Create project"}</button>
          <button className="sy-btn sy-btn-ghost" type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </>
  )
}
