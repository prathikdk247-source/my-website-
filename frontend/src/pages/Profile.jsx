import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import api, { formatError } from "../api";
import { useAuth } from "../AuthContext";
import { MapPin, Mail, Phone, Check } from "lucide-react";

export default function Profile() {
  const { user, updateMe } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", location: "", bio: "" });
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [myListings, setMyListings] = useState([]);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", phone: user.phone || "", location: user.location || "", bio: user.bio || "" });
      api.get(`/listings/user/${user.id}`).then((r) => setMyListings(r.data));
    }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr(""); setSaved(false);
    try {
      await updateMe(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e2) { setErr(formatError(e2)); } finally { setBusy(false); }
  };

  if (!user) return null;
  const initials = (user.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="avatar avatar-lg">{initials}</div>
            <div>
              <h2 className="font-display" style={{ margin: 0, fontSize: 26, color: "var(--ac-green-900)" }}>{user.name}</h2>
              <span className={`chip ${user.role === "buyer" ? "chip-amber" : ""}`} style={{ textTransform: "capitalize" }}>{user.role}</span>
            </div>
          </div>
          <div style={{ marginTop: 18, display: "grid", gap: 8, color: "var(--ac-muted)", fontSize: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Mail size={14} /> {user.email}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Phone size={14} /> {user.phone}</div>
            {user.location && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><MapPin size={14} /> {user.location}</div>}
          </div>
          {user.bio && <p style={{ marginTop: 16, padding: 14, background: "var(--ac-green-100)", borderRadius: 12 }}>{user.bio}</p>}

          <div className="divider" style={{ margin: "20px 0" }} />
          <h3 className="font-display" style={{ margin: 0, color: "var(--ac-green-900)" }}>My listings ({myListings.length})</h3>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {myListings.length === 0 && <div style={{ color: "var(--ac-muted)", fontSize: 14 }}>You haven't posted any listings yet.</div>}
            {myListings.map((l) => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: 12, border: "1px solid var(--ac-line)", borderRadius: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ac-muted)", textTransform: "capitalize" }}>{l.category} · {l.location}</div>
                </div>
                <div style={{ fontWeight: 700, color: "var(--ac-green-800)" }}>₹{l.price.toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
        </div>

        <form className="card" style={{ padding: 28 }} onSubmit={submit}>
          <h3 className="font-display" style={{ margin: 0, color: "var(--ac-green-900)", fontSize: 22 }}>Edit profile</h3>
          <p style={{ color: "var(--ac-muted)", marginTop: 4 }}>Keep your info up to date for buyers and sellers.</p>
          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            <Field label="Full Name"><input className="input-field" data-testid="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Phone"><input className="input-field" data-testid="profile-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Location"><input className="input-field" data-testid="profile-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, State" /></Field>
            <Field label="Bio"><textarea className="input-field" rows={4} data-testid="profile-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about your farm..." /></Field>
            {err && <div style={{ color: "#b3261e", fontSize: 13 }}>{err}</div>}
            <button className="btn-primary" type="submit" disabled={busy} data-testid="profile-save">
              {saved ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={16} /> Saved</span> : busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--ac-muted)" }}>{label}</span>
    {children}
  </label>
);
