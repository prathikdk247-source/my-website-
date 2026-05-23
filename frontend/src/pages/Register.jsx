import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Brand } from "../components/Brand";
import { Eye, EyeOff, Leaf } from "lucide-react";
import { formatError } from "../api";

const HERO_IMG = "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&w=1600&q=80";

export default function Register() {
  const { user, register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const validatePhone = (v) => /^(?:\+?91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/\s|-/g, ""));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!validatePhone(form.phone)) {
      setErr("Enter a valid Indian phone number (10 digits, starts with 6-9).");
      return;
    }
    setLoading(true);
    try {
      await register(form);
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
            Create your account
          </h1>
          <p style={{ marginTop: 10, color: "var(--ac-muted)" }}>
            Already have one? <Link to="/login" style={{ color: "var(--ac-green-800)", fontWeight: 600 }} data-testid="link-to-login">Sign in</Link>
          </p>

          <form onSubmit={submit} style={{ marginTop: 24, display: "grid", gap: 14 }}>
            <Field label="Full Name">
              <input className="input-field" data-testid="register-name" placeholder="Ravi Kumar"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Phone Number (Indian)">
              <input className="input-field" data-testid="register-phone" placeholder="+91 9876543210"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input className="input-field" data-testid="register-email" placeholder="you@farm.com" type="email"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <input className="input-field" data-testid="register-password" placeholder="At least 6 characters"
                  type={showPw ? "text" : "password"} minLength={6}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <button type="button" onClick={() => setShowPw(!showPw)} data-testid="register-toggle-pw"
                  style={{ position: "absolute", right: 12, top: 12, background: "transparent", border: 0, color: "#7d8a82", cursor: "pointer" }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            {err && <div style={{ color: "#b3261e", fontSize: 13 }} data-testid="register-error">{err}</div>}

            <button className="btn-primary" type="submit" disabled={loading} data-testid="register-submit">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
        <div className="auth-hero-content">
          <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: 0.95, fontSize: 12, letterSpacing: "0.2em" }}>
            <Leaf size={14} /> AGROCONNECT
          </div>
          <h2 className="font-display" style={{ fontSize: 44, lineHeight: 1.1, margin: "12px 0 0", maxWidth: 520, fontWeight: 900 }}>
            Join thousands of farmers already growing together.
          </h2>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ac-ink)", marginBottom: 6 }}>{label}</span>
    {children}
  </label>
);
