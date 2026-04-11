import { useState } from "react"
import { supabase } from "./supabase"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const inputStyle = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a",
    color: "#e8e4dc", padding: "12px 14px", fontSize: 13,
    fontFamily: "monospace", outline: "none", marginBottom: 12,
  }

  async function handleSubmit() {
    setLoading(true)
    setMessage("")
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage("Check your email to confirm your account.")
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    })
  }

  return (
    <div style={{
      display: "flex", height: "100vh", alignItems: "center", justifyContent: "center",
      background: "#0a0a0b", fontFamily: "monospace", color: "#e8e4dc"
    }}>
      <div style={{ width: 360 }}>
        <h1 style={{ color: "#e8c97e", fontSize: 24, marginBottom: 8, letterSpacing: "0.1em" }}>FIRETRACKS</h1>
        <p style={{ fontSize: 12, color: "#444", marginBottom: 32 }}>Never lose a project again.</p>

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          style={{
            width: "100%", background: "#fff", color: "#0a0a0b", border: "none",
            padding: "12px", fontSize: 12, fontFamily: "monospace",
            cursor: "pointer", letterSpacing: "0.1em", marginBottom: 16,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <img src="https://www.google.com/favicon.ico" width={14} height={14} />
          CONTINUE WITH GOOGLE
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
          <span style={{ fontSize: 10, color: "#333" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "#1a1a1a" }} />
        </div>

        <input
          style={inputStyle}
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          style={inputStyle}
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        {message && (
          <p style={{ fontSize: 11, color: "#e8c97e", marginBottom: 12 }}>{message}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%", background: "#e8c97e", color: "#0a0a0b", border: "none",
            padding: "12px", fontSize: 12, fontFamily: "monospace",
            cursor: "pointer", letterSpacing: "0.1em", marginBottom: 16,
          }}
        >
          {loading ? "..." : isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
        </button>

        <p
          onClick={() => setIsLogin(!isLogin)}
          style={{ fontSize: 11, color: "#444", cursor: "pointer", textAlign: "center" }}
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </p>
      </div>
    </div>
  )
}