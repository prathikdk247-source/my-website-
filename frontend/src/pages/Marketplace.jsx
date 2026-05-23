import React, { useEffect, useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import api, { formatError } from "../api";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MapPin, Phone, Trash2, X } from "lucide-react";

const CATS = [
  { id: "all", label: "All" },
  { id: "seeds", label: "Seeds" },
  { id: "fertilizers", label: "Fertilizers" },
  { id: "pesticides", label: "Pesticides" },
  { id: "equipment", label: "Equipment" },
];

const catEmoji = { seeds: "🌱", fertilizers: "🧪", pesticides: "🛡️", equipment: "🚜" };
const catInitial = { seeds: "S", fertilizers: "F", pesticides: "P", equipment: "E" };

export default function Marketplace() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const { data } = await api.get("/listings", { params: { category: cat, q: q || undefined } });
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [cat]);

  const onSearch = (e) => {
    e.preventDefault();
    load();
  };

  const filtered = useMemo(() => items, [items]);

  const contact = async (it) => {
    await api.post("/messages", { to_user_id: it.seller_id, content: `Hi ${it.seller_name}, I'm interested in your "${it.title}". Is it still available?` });
    nav(`/messages?with=${it.seller_id}`);
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--ac-muted)" }}>MARKETPLACE</div>
            <h1 className="font-display" style={{ fontSize: 40, margin: "6px 0 0", color: "var(--ac-green-900)" }}>
              Seeds, fertilizers, pesticides & equipment
            </h1>
            <p style={{ color: "var(--ac-muted)", marginTop: 6 }}>Direct from farmers — no middlemen.</p>
          </div>
          <button className="btn-primary" onClick={() => setOpen(true)} data-testid="open-create-listing">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Plus size={16} /> List an item</span>
          </button>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <form onSubmit={onSearch} style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: 14, color: "var(--ac-muted)" }} />
            <input className="input-field" style={{ paddingLeft: 38 }} placeholder="Search by title, location or description..."
              value={q} onChange={(e) => setQ(e.target.value)} data-testid="search-input" />
          </form>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CATS.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} data-testid={`cat-${c.id}`}
                style={{
                  padding: "10px 16px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer",
                  border: `1px solid ${cat === c.id ? "var(--ac-green-800)" : "var(--ac-line)"}`,
                  background: cat === c.id ? "var(--ac-green-800)" : "#fff",
                  color: cat === c.id ? "#fff" : "var(--ac-ink)",
                }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 18,
        }}>
          {filtered.map((it) => (
            <div key={it.id} className="listing-card" data-testid={`listing-${it.id}`}>
              <div className="listing-img"><span style={{ position: "relative", zIndex: 1 }}>{catEmoji[it.category] || catInitial[it.category]}</span></div>
              <div className="listing-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <h3 className="font-display" style={{ fontSize: 18, margin: 0, color: "var(--ac-green-900)" }}>{it.title}</h3>
                  <span className="chip" style={{ textTransform: "capitalize" }}>{it.category}</span>
                </div>
                <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, color: "var(--ac-green-800)" }}>
                  ₹{it.price.toLocaleString("en-IN")} <span style={{ fontSize: 13, color: "var(--ac-muted)", fontWeight: 600 }}>/ {it.unit}</span>
                </div>
                <div style={{ fontSize: 13, color: "var(--ac-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={13} /> {it.location} · {it.quantity} {it.unit} available
                </div>
                <p style={{ marginTop: 10, color: "var(--ac-muted)", fontSize: 14, minHeight: 38 }}>{it.description}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setSelected(it)} data-testid={`view-${it.id}`}>View</button>
                  {user?.id !== it.seller_id && (
                    <button className="btn-primary" style={{ flex: 1 }} onClick={() => contact(it)} data-testid={`contact-${it.id}`}>
                      Contact
                    </button>
                  )}
                  {user?.id === it.seller_id && (
                    <button className="btn-ghost" onClick={async () => { await api.delete(`/listings/${it.id}`); load(); }} data-testid={`delete-${it.id}`}
                      style={{ color: "#b3261e" }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <div className="card" style={{ padding: 28, marginTop: 24, textAlign: "center", color: "var(--ac-muted)" }}>No listings match your search.</div>}
      </div>

      {open && <CreateListingModal onClose={() => setOpen(false)} onCreated={() => { setOpen(false); load(); }} />}
      {selected && <ListingDetail item={selected} onClose={() => setSelected(null)} onContact={contact} canContact={user?.id !== selected.seller_id} />}
    </div>
  );
}

const CreateListingModal = ({ onClose, onCreated }) => {
  const [f, setF] = useState({ title: "", category: "seeds", price: "", unit: "kg", quantity: "", location: "", description: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await api.post("/listings", { ...f, price: parseFloat(f.price), quantity: parseFloat(f.quantity) });
      onCreated();
    } catch (e2) { setErr(formatError(e2)); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title="List a new item">
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <Row label="Title">
          <input className="input-field" data-testid="new-listing-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required placeholder="e.g. Organic Wheat Seeds" />
        </Row>
        <Row label="Category">
          <select className="input-field" data-testid="new-listing-category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CATS.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Row>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <Row label="Price (₹)">
            <input type="number" min="0" step="0.01" className="input-field" data-testid="new-listing-price" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} required />
          </Row>
          <Row label="Unit">
            <select className="input-field" data-testid="new-listing-unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
              {["kg", "quintal", "bag", "litre", "piece"].map((u) => <option key={u}>{u}</option>)}
            </select>
          </Row>
          <Row label="Quantity">
            <input type="number" min="0" step="0.01" className="input-field" data-testid="new-listing-quantity" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} required />
          </Row>
        </div>
        <Row label="Location">
          <input className="input-field" data-testid="new-listing-location" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} required placeholder="City, State" />
        </Row>
        <Row label="Description">
          <textarea className="input-field" rows={3} data-testid="new-listing-description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Quality, variety, harvest date..." />
        </Row>
        {err && <div style={{ color: "#b3261e", fontSize: 13 }} data-testid="new-listing-error">{err}</div>}
        <button className="btn-primary" type="submit" disabled={busy} data-testid="new-listing-submit">
          {busy ? "Publishing..." : "Publish listing"}
        </button>
      </form>
    </Modal>
  );
};

const ListingDetail = ({ item, onClose, onContact, canContact }) => (
  <Modal onClose={onClose} title={item.title}>
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <span className="chip" style={{ textTransform: "capitalize" }}>{item.category}</span>
      <span style={{ color: "var(--ac-muted)", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={13} /> {item.location}</span>
    </div>
    <div style={{ marginTop: 12, fontSize: 28, fontWeight: 800, color: "var(--ac-green-800)" }}>
      ₹{item.price.toLocaleString("en-IN")} <span style={{ fontSize: 14, color: "var(--ac-muted)", fontWeight: 600 }}>/ {item.unit}</span>
    </div>
    <p style={{ color: "var(--ac-ink)", marginTop: 8 }}>{item.description}</p>
    <div style={{ marginTop: 12, fontSize: 14, color: "var(--ac-muted)" }}>Available: {item.quantity} {item.unit}</div>
    <div style={{ marginTop: 16, padding: 14, background: "var(--ac-green-100)", borderRadius: 12 }}>
      <div style={{ fontWeight: 700 }}>Seller: {item.seller_name}</div>
      <div style={{ marginTop: 4, fontSize: 14, color: "var(--ac-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Phone size={14} /> {item.seller_phone}
      </div>
    </div>
    {canContact && (
      <button className="btn-primary" style={{ marginTop: 14, width: "100%" }} onClick={() => onContact(item)} data-testid="detail-contact-seller">
        Message seller
      </button>
    )}
  </Modal>
);

const Modal = ({ children, onClose, title }) => (
  <div onClick={onClose}
    style={{ position: "fixed", inset: 0, background: "rgba(11,27,20,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
    <div onClick={(e) => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 520, padding: 24, maxHeight: "90vh", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 className="font-display" style={{ margin: 0, color: "var(--ac-green-900)", fontSize: 24 }}>{title}</h2>
        <button onClick={onClose} data-testid="modal-close" style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--ac-muted)" }}>
          <X size={20} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Row = ({ label, children }) => (
  <label style={{ display: "block" }}>
    <span style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--ac-muted)" }}>{label}</span>
    {children}
  </label>
);
