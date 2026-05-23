import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import api from "../api";
import { useAuth } from "../AuthContext";
import { MapPin, Phone, Sprout, FlaskConical, ShieldCheck, Tractor, Trash2 } from "lucide-react";

const META = {
  seeds: { label: "Seeds & Plants", icon: Sprout, color: "#1A6B3D", tag: "SEEDS" },
  fertilizers: { label: "Fertilizers", icon: FlaskConical, color: "#0F4F2C", tag: "FERTILIZERS" },
  pesticides: { label: "Pesticides", icon: ShieldCheck, color: "#7a5a0e", tag: "PESTICIDES" },
  equipment: { label: "Equipment", icon: Tractor, color: "#0B3B23", tag: "EQUIPMENT" },
};

export default function ShopsCategory() {
  const { category } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  const meta = META[category];
  useEffect(() => {
    if (!meta) { nav("/"); return; }
    setLoading(true);
    api.get("/agroshops", { params: { category } })
      .then((r) => setShops(r.data))
      .finally(() => setLoading(false));
  }, [category, meta, nav]);

  const remove = async (id) => {
    if (!window.confirm("Delete this AgroShop?")) return;
    await api.delete(`/agroshops/${id}`);
    setShops((s) => s.filter((x) => x.id !== id));
  };

  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: meta.color, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--ac-muted)" }}>{meta.tag}</div>
            <h1 className="font-display" style={{ fontSize: 38, margin: "4px 0 0", color: "var(--ac-green-900)" }}>{meta.label}</h1>
          </div>
        </div>
        <p style={{ color: "var(--ac-muted)", marginTop: 10 }}>
          Verified AgroShops for {meta.label.toLowerCase()} across India. Admin-curated — pick a shop and reach out directly.
        </p>

        {loading ? (
          <div className="card" style={{ padding: 28, marginTop: 24, color: "var(--ac-muted)", textAlign: "center" }}>Loading shops...</div>
        ) : shops.length === 0 ? (
          <div className="card" style={{ padding: 28, marginTop: 24, color: "var(--ac-muted)", textAlign: "center" }} data-testid="shops-empty">
            No AgroShops added yet in this category. {user?.role === "admin" && "Open Admin Panel to add one."}
          </div>
        ) : (
          <div style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 18,
          }}>
            {shops.map((s) => (
              <div key={s.id} className="shop-card" data-testid={`shop-${s.id}`}>
                <div className="shop-card-banner" style={{ background: `linear-gradient(135deg, ${meta.color}, var(--ac-green-700))` }}>
                  <Icon size={28} color="#fff" />
                  <span className="chip" style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.28)", textTransform: "capitalize" }}>{s.category}</span>
                </div>
                <div style={{ padding: 18 }}>
                  <h3 className="font-display" style={{ margin: 0, fontSize: 20, color: "var(--ac-green-900)" }}>{s.name}</h3>
                  {s.description && <p style={{ marginTop: 6, color: "var(--ac-muted)", fontSize: 14 }}>{s.description}</p>}
                  <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 14, color: "var(--ac-ink)" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}><MapPin size={14} color="var(--ac-green-800)" /> {s.location}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Phone size={14} color="var(--ac-green-800)" /> {s.contact}</div>
                  </div>
                  <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                    <a href={`tel:${s.contact.replace(/[^\d+]/g, "")}`} className="btn-primary" style={{ flex: 1, textAlign: "center" }} data-testid={`shop-call-${s.id}`}>
                      Call now
                    </a>
                    {user?.role === "admin" && (
                      <button className="btn-ghost" onClick={() => remove(s.id)} data-testid={`shop-delete-${s.id}`} style={{ color: "#b3261e" }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
