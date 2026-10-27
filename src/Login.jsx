import { useState } from "react"
import { Logo } from "./ui"
import { baseCss } from "./theme"

// ── How this page talks to the rest of your app ──
// This component only draws the screen and handles the form. It does NOT contain your login logic.
// You pass that in as props:
//   onGoogle()                      starts Google sign-in
//   onEmailAuth(mode, email, pass)  mode is "signin" or "signup". Return nothing on success,
//                                   or return a string (like "Check your email to confirm")
//                                   to show it as a message. THROW an Error to show a red error.
//   onBack()                        optional. Shows a "Back to home" link.

// Short selling points shown on the dark side panel (hidden on phones to save space).
const points = [
  "Version history for every session",
  "Plugin Intelligence on every track",
  "Private storage, deleted when you delete",
]

// ── Page styling ──
// "au-" classes are only for this page. Buttons, inputs, fonts and colours come from ui.jsx.
const css = `
.au-page { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(360px, 5fr) 6fr; }

/* left panel: dark teal with the same dotted texture and drifting glow as the landing hero */
.au-side { position: relative; isolation: isolate; overflow: hidden; color: #fff; padding: 44px 56px;
  display: flex; flex-direction: column; justify-content: space-between;
  background: linear-gradient(155deg, #0B5A52 0%, #073F39 55%, #052E2A 100%); }
.au-side::before { content: ""; position: absolute; inset: 0; z-index: -1;
  background-image: radial-gradient(rgba(255,255,255,.15) 1.2px, transparent 1.7px); background-size: 26px 26px;
  -webkit-mask-image: radial-gradient(ellipse at 70% 30%, #000 0%, transparent 72%);
  mask-image: radial-gradient(ellipse at 70% 30%, #000 0%, transparent 72%); }
.au-orb { position: absolute; z-index: -1; width: 340px; height: 340px; right: -100px; bottom: -60px;
  border-radius: 50%; filter: blur(80px); background: rgba(14,128,116,.6); animation: au-drift 14s ease-in-out infinite alternate; }
@keyframes au-drift { to { transform: translate(-70px, -90px); } }
.au-side .sy-logo { align-self: flex-start; }
.au-pitch h1 { font-size: clamp(32px, 3.6vw, 46px); font-weight: 700; color: #fff; margin-bottom: 16px; }
.au-pitch > p { color: #BFE0DB; font-size: 17px; max-width: 420px; }
.au-points { list-style: none; padding: 0; margin: 28px 0 0; display: grid; gap: 12px; }
.au-points li { display: flex; align-items: center; gap: 10px; color: #E7F4F2; font-size: 15px; }
.au-points i { flex: none; width: 20px; height: 20px; border-radius: 50%; background: rgba(127,209,198,.2); color: #7FD1C6;
  display: grid; place-items: center; }
.au-foot { font-size: 13px; color: #8CB8B1; }

/* right side: the form */
.au-main { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
.au-card { width: 100%; max-width: 400px; animation: sy-up .7s var(--ease) both; }
.au-back { background: none; border: 0; padding: 10px 0; margin-bottom: 18px; color: var(--soft); font: 500 14px 'Inter', sans-serif; cursor: pointer; }
.au-back:hover { color: var(--teal); }
.au-card h2 { font-size: 30px; font-weight: 700; margin-bottom: 6px; }
.au-sub { color: var(--soft); margin-bottom: 26px; }
.au-google { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; }
.au-or { display: flex; align-items: center; gap: 14px; margin: 22px 0; color: var(--faint); font-size: 13px; }
.au-or::before, .au-or::after { content: ""; flex: 1; height: 1px; background: var(--border); }
.au-field { margin-bottom: 16px; }
.au-field label { display: block; font-size: 13.5px; font-weight: 500; margin-bottom: 6px; }
.au-pw { position: relative; }
.au-pw .sy-input { padding-right: 70px; }
.au-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: 0;
  color: var(--teal); font: 600 13px 'Inter', sans-serif; padding: 11px 12px; cursor: pointer; }
.au-hint { font-size: 12.5px; color: var(--faint); margin-top: 6px; }
.au-msg { border-radius: 10px; padding: 10px 14px; font-size: 14px; margin-bottom: 16px; }
.au-error { background: #FEF2F2; border: 1px solid #FECACA; color: var(--danger); }
.au-notice { background: var(--teal-soft); color: var(--teal-dark); }
.au-submit { width: 100%; margin-top: 4px; }
.au-switch { text-align: center; margin-top: 22px; color: var(--soft); font-size: 14px; }
.au-switch button { background: none; border: 0; color: var(--teal); font: 600 14px 'Inter', sans-serif; padding: 10px 6px; cursor: pointer; }
.au-switch button:hover { color: var(--teal-dark); text-decoration: underline; }

/* phones and small tablets: the dark panel becomes a slim banner above the form */
@media (max-width: 860px) {
  .au-page { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .au-side { padding: 24px 24px 28px; gap: 18px; }
  .au-pitch h1 { font-size: 26px; margin-bottom: 6px; }
  .au-pitch > p { font-size: 15px; }
  .au-points, .au-foot { display: none; }
  .au-orb { width: 240px; height: 240px; }
  .au-main { align-items: flex-start; padding: 28px 20px 48px; }
  .au-card { max-width: 460px; }
}
`

// The multi-colour Google "G". It is drawn as SVG paths, so it stays sharp at any size.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function Login({ onGoogle, onEmailAuth, onBack }) {
  // State is the page's memory. Each useState holds one value and a function to change it.
  const [mode, setMode] = useState("signin")   // "signin" or "signup"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)  // is the password visible?
  const [busy, setBusy] = useState(false)      // true while we wait for the server
  const [error, setError] = useState("")       // red message
  const [notice, setNotice] = useState("")     // green message

  const isSignup = mode === "signup"

  // run() wraps any sign-in action with the same steps: clear old messages, disable the buttons,
  // run the action, show a message if it returns text or fails, and always re-enable the buttons.
  async function run(action) {
    setError("")
    setNotice("")
    setBusy(true)
    try {
      const result = await action()
      if (typeof result === "string") setNotice(result)
    } catch (e) {
      setError(e?.message || "Something went wrong. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  function submit(e) {
    e.preventDefault() // stop the browser from reloading the page when the form is submitted
    run(() => onEmailAuth(mode, email.trim(), password))
  }

  function switchMode() {
    setMode(isSignup ? "signin" : "signup")
    setError("")
    setNotice("")
  }

  return (
    <div className="sy-root au-page">
      <style>{baseCss}{css}</style>

      {/* Left: brand and pitch (becomes a slim banner on phones) */}
      <aside className="au-side">
        <div className="au-orb" aria-hidden="true" />
        <Logo color="#fff" onClick={onBack} />
        <div className="au-pitch">
          <h1>Never lose a project again.</h1>
          <p>Version history for your music sessions, with the plugins behind every track.</p>
          <ul className="au-points">
            {points.map(p => (
              <li key={p}>
                <i aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="m2.5 6.3 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </i>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="au-foot">The free plan includes 5 GB of storage.</p>
      </aside>

      {/* Right: the form */}
      <main className="au-main">
        <div className="au-card">
          {onBack && <button className="au-back" onClick={onBack}>Back to home</button>}

          <h2>{isSignup ? "Create your account" : "Welcome back"}</h2>
          <p className="au-sub">
            {isSignup ? "Start free with 5 GB of storage." : "Sign in to see your projects and versions."}
          </p>

          <button className="sy-btn sy-btn-ghost au-google" onClick={() => run(onGoogle)} disabled={busy}>
            <GoogleIcon /> Continue with Google
          </button>

          <div className="au-or">or</div>

          <form onSubmit={submit}>
            <div className="au-field">
              <label htmlFor="au-email">Email</label>
              <input id="au-email" className="sy-input" type="email" autoComplete="email" required
                placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="au-field">
              <label htmlFor="au-password">Password</label>
              <div className="au-pw">
                <input id="au-password" className="sy-input" required minLength={isSignup ? 6 : undefined}
                  type={showPw ? "text" : "password"}
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="au-eye" onClick={() => setShowPw(s => !s)} aria-pressed={showPw}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {isSignup && <p className="au-hint">At least 6 characters.</p>}
            </div>

            {error && <p className="au-msg au-error" role="alert">{error}</p>}
            {notice && <p className="au-msg au-notice" role="status">{notice}</p>}

            <button className="sy-btn sy-btn-primary au-submit" type="submit" disabled={busy}>
              {busy ? "Please wait..." : isSignup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="au-switch">
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            <button type="button" onClick={switchMode}>{isSignup ? "Sign in" : "Sign up"}</button>
          </p>
        </div>
      </main>
    </div>
  )
}
