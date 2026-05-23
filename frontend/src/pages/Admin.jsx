import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import api, { formatError } from "../api";
import { useAuth } from "../AuthContext";
import { Navigate } from "react-router-dom";
import { Plus, Trash2, MapPin, Phone, Shield } from "lucide-react";

const CATS = [
  { id: "seeds", label: "Seeds/Plants" },
  { id: "fertilizers", label: "Fertilizers" },
  { id: "pesticides", label: "Pesticides" },
  { id: "equipment", label: "Equipment" },
];

export default function Admin() {
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [tab, setTab] = useState("all");
  const [form, setForm] = useState({ name: "", category: "seeds", contact: "", location: "", description: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/agroshops");
    setShops(data);
  };
  useEffect(() => { load(); }, []);

  if (user && user.role !== "admin") return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await api.post("/agroshops", form);
      setForm({ name: "", category: form.category, contact: "", location: "", description: "" });
      await load();
    } catch (e2) {
      setErr(formatError(e2));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this AgroShop?")) return;
    await api.delete(`/agroshops/${id}`);
    await load();
  };

  const filtered = tab === "all" ? shops : shops.filter((s) => s.category === tab);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#7a5a0e", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--ac-muted)" }}>ADMIN PANEL</div>
            <h1 className="font-display" style={{ fontSize: 34, margin: "4px 0 0", color: "var(--ac-green-900)" }}>Manage AgroShops</h1>
          </div>
        </div>
        <p style={{ color: "var(--ac-muted)", marginTop: 8 }}>Add or remove shops. They'll appear instantly on the matching category page.</p>

        <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 24, marginTop: 22, alignItems: "start" }}>
          <form onSubmit={submit} className="card" style={{ padding: 20, position: "sticky", top: 80 }}>
            <h3 className="font-display" style={{ margin: 0, color: "var(--ac-green-900)", fontSize: 20 }}>Add new AgroShop</h3>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <Field label="Shop Name">
                <input className="input-field" data-testid="admin-name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Green Earth Seeds Hub" />
              </Field>
              <Field label="Category">
                <select className="input-field" data-testid="admin-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Contact (phone)">
                <input className="input-field" data-testid="admin-contact" value={form.contact} required onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+91 98765 43210" />
              </Field>
              <Field label="Location">
                <input className="input-field" data-testid="admin-location" value={form.location} required onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City, State" />
              </Field>
              <Field label="Description (optional)">
                <textarea className="input-field" rows={3} data-testid="admin-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Specialities, brands, certifications..." />
              </Field>
              {err && <div style={{ color: "#b3261e", fontSize: 13 }} data-testid="admin-error">{err}</div>}
              <button className="btn-primary" type="submit" disabled={busy} data-testid="admin-submit">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={14} /> {busy ? "Adding..." : "Add AgroShop"}</span>
              </button>
            </div>
          </form>

          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              <FilterBtn active={tab === "all"} onClick={() => setTab("all")} testid="admin-filter-all">All ({shops.length})</FilterBtn>
              {CATS.map((c) => (
                <FilterBtn key={c.id} active={tab === c.id} onClick={() => setTab(c.id)} testid={`admin-filter-${c.id}`}>
                  {c.label} ({shops.filter((s) => s.category === c.id).length})
                </FilterBtn>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {filtered.map((s) => (
                <div key={s.id} className="card" style={{ padding: 16 }} data-testid={`admin-shop-${s.id}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <h3 className="font-display" style={{ margin: 0, fontSize: 18, color: "var(--ac-green-900)" }}>{s.name}</h3>
                      <span className="chip" style={{ marginTop: 6, textTransform: "capitalize" }}>{s.category}</span>
                    </div>
                    <button onClick={() => remove(s.id)} data-testid={`admin-delete-${s.id}`} style={{ background: "transparent", border: 0, cursor: "pointer", color: "#b3261e" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--ac-muted)", display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}><MapPin size={12} /> {s.location}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Phone size={12} /> {s.contact}</div>
                  </div>
                  {s.description && <p style={{ marginTop: 8, fontSize: 13, color: "var(--ac-muted)" }}>{s.description}</p>}
                </div>
              ))}
            </div>
            {filtered.length === 0 && <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--ac-muted)" }}>No shops in this filter yet.</div>}
          </div>
        </div>
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

const FilterBtn = ({ active, onClick, children, testid }) => (
  <button onClick={onClick} data-testid={testid}
    style={{
      padding: "8px 14px", borderRadius: 999, fontWeight: 600, fontSize: 13, cursor: "pointer",
      border: `1px solid ${active ? "var(--ac-green-800)" : "var(--ac-line)"}`,
      background: active ? "var(--ac-green-800)" : "#fff",
      color: active ? "#fff" : "var(--ac-ink)",
    }}>
    {children}
  </button>
);
