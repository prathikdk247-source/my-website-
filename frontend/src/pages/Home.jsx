import React from "react";
import { Link } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useAuth } from "../AuthContext";
import { Sprout, FlaskConical, ShieldCheck, Tractor, MessageSquare, Shield, Leaf } from "lucide-react";

const CARDS = [
  { to: "/shops/seeds", icon: Sprout, title: "Seeds & Plants", desc: "Hybrid seeds, saplings & nursery stock from trusted shops.", color: "#1A6B3D" },
  { to: "/shops/fertilizers", icon: FlaskConical, title: "Fertilizers", desc: "Urea, DAP, NPK and organic compost suppliers.", color: "#0F4F2C" },
  { to: "/shops/pesticides", icon: ShieldCheck, title: "Pesticides", desc: "Bio-pesticides, insecticides and crop-care brands.", color: "#7a5a0e" },
  { to: "/shops/equipment", icon: Tractor, title: "Equipment", desc: "Tractors, sprayers, drip kits & farm machinery.", color: "#0B3B23" },
];

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="app-shell">
      <TopBar />
      <div className="container">
        <div className="hero" data-testid="home-hero">
          <div style={{ fontSize: 12, letterSpacing: ".2em", opacity: .9, display: "flex", alignItems: "center", gap: 8 }}>
            <Leaf size={14} /> WELCOME TO AGROCONNECT
          </div>
          <h1 className="font-display" style={{ fontSize: 46, margin: "10px 0 0", fontWeight: 900, maxWidth: 760 }}>
            Hello {user?.name?.split(" ")[0] || "Farmer"} — your one-stop farm network 🌾
          </h1>
          <p style={{ opacity: .92, maxWidth: 620, marginTop: 10, fontSize: 16 }}>
            Explore verified agro-shops for seeds, fertilizers, pesticides & equipment, and chat live with fellow farmers across India.
          </p>
          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/chat" className="btn-primary" data-testid="home-cta-chat" style={{ background: "#fff", color: "var(--ac-green-900)", borderColor: "#fff" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><MessageSquare size={16} /> Open Farmer Chat</span>
            </Link>
            <Link to="/shops/seeds" className="btn-ghost" data-testid="home-cta-shops" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", borderColor: "rgba(255,255,255,0.32)" }}>
              Browse Agro-Shops
            </Link>
          </div>
        </div>

        <div style={{
          marginTop: 30,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}>
          {CARDS.map((c) => (
            <Link key={c.to} to={c.to} className="cat-card" data-testid={`home-card-${c.title.split(" ")[0].toLowerCase()}`}>
              <div className="cat-card-icon" style={{ background: c.color }}><c.icon size={22} color="#fff" /></div>
              <h3 className="font-display" style={{ margin: "12px 0 4px", fontSize: 22, color: "var(--ac-green-900)" }}>{c.title}</h3>
              <p style={{ margin: 0, color: "var(--ac-muted)", fontSize: 14 }}>{c.desc}</p>
              <div style={{ marginTop: 14, color: "var(--ac-green-800)", fontWeight: 700, fontSize: 14 }}>Explore shops →</div>
            </Link>
          ))}
        </div>

        {user?.role === "admin" && (
          <div className="card" style={{ marginTop: 24, padding: 24, background: "linear-gradient(180deg, #FBF1D9, #fff)" }}>
            <div style={{ fontSize: 12, color: "#7a5a0e", letterSpacing: ".15em" }}>ADMIN CONTROL</div>
            <h3 className="font-display" style={{ margin: "6px 0", color: "var(--ac-green-900)" }}>You're signed in as Admin</h3>
            <p style={{ color: "var(--ac-muted)", margin: "0 0 12px" }}>Add or remove AgroShop listings that appear across categories.</p>
            <Link to="/admin" className="btn-primary" data-testid="home-admin-link" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Shield size={14} /> Open Admin Panel</Link>
          </div>
        )}
      </div>
    </div>
  );
}
