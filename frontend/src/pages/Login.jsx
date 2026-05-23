import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Brand } from "../components/Brand";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { formatError } from "../api";

const HERO_IMG = "https://images.unsplash.com/photo-1592982537447-7440770faae9?auto=format&fit=crop&w=1600&q=80";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav("/");
    } catch (e2) {
      setErr(formatError(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <div className="auth-card">
          <div style={{ marginBottom: 28 }}><Brand /></div>
          <h1 className="font-display" style={{ fontSize: 40, margin: 0, color: "var(--ac-green-900)" }}>
            Welcome back
          </h1>
          <p style={{ marginTop: 10, color: "var(--ac-muted)" }}>
            New to AgroConnect? <Link to="/register" style={{ color: "var(--ac-green-800)", fontWeight: 600 }} data-testid="link-to-register">Create an account</Link>
          </p>

          <form onSubmit={submit} style={{ marginTop: 24, display: "grid", gap: 14 }}>
            <label>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</span>
              <input className="input-field" type="email" placeholder="you@farm.com" required
                value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" />
            </label>
            <label>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</span>
              <div style={{ position: "relative" }}>
                <input className="input-field" type={showPw ? "text" : "password"} placeholder="Your password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} data-testid="login-toggle-pw"
                  style={{ position: "absolute", right: 12, top: 12, background: "transparent", border: 0, color: "#7d8a82", cursor: "pointer" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {err && <div style={{ color: "#b3261e", fontSize: 13 }} data-testid="login-error">{err}</div>}

            <button className="btn-primary" type="submit" disabled={loading} data-testid="login-submit">
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div style={{ fontSize: 12, color: "var(--ac-muted)", marginTop: 8, padding: 12, background: "var(--ac-green-100)", borderRadius: 12 }}>
              <strong style={{ color: "var(--ac-green-900)" }}>Demo:</strong> ravi@agroconnect.in / Farm@123
            </div>
          </form>
        </div>
      </div>

      <div className="auth-hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
        <div className="auth-hero-content">
          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.95, fontSize: 12, letterSpacing: "0.2em" }}>
            <Leaf size={14} /> AGROCONNECT
          </div>
          <h2 className="font-display" style={{ fontSize: 44, lineHeight: 1.1, margin: "12px 0 0", maxWidth: 520, fontWeight: 900 }}>
            From seed to sale, all in one place.
          </h2>
        </div>
      </div>
    </div>
  );
}
