import { useEffect, useRef } from 'react'

const css = `
.sy-dialog { width: min(460px, calc(100% - 32px)); padding: 28px; border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 24px 80px #073f3933; }
.sy-dialog::backdrop { background: #073f3977; backdrop-filter: blur(4px); }
.sy-dialog h2 { font-size: 23px; margin: 12px 0; }
.sy-dialog p { color: var(--soft); overflow-wrap: anywhere; }
.sy-dialog-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--teal-soft); color: var(--teal-dark); font-size: 22px; font-weight: 700; }
.sy-dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
.sy-btn-danger { background: var(--danger); color: white; }
.sy-btn-danger:hover { background: #8f1c13; }
`

export default function Dialog({ request, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const element = ref.current
    if (request && !element.open) element.showModal()
    if (!request && element.open) element.close()
  }, [request])
  return <dialog ref={ref} className="sy-root sy-dialog" aria-labelledby="dialog-title" aria-describedby="dialog-message"
    onCancel={event => { event.preventDefault(); onClose(false) }}>
    <style>{css}</style>
    {request && <>
      <div className="sy-dialog-icon" aria-hidden="true">{request.confirmLabel ? '?' : '!'}</div>
      <h2 id="dialog-title">{request.title}</h2>
      <p id="dialog-message">{request.message}</p>
      <div className="sy-dialog-actions">
        {request.confirmLabel && <button className="sy-btn sy-btn-ghost" autoFocus onClick={() => onClose(false)}>Cancel</button>}
        <button className={`sy-btn ${request.confirmLabel ? 'sy-btn-danger' : 'sy-btn-primary'}`} autoFocus={!request.confirmLabel}
          onClick={() => onClose(true)}>{request.confirmLabel || 'Got it'}</button>
      </div>
    </>}
  </dialog>
}
