import React from "react";
import TopBar from "../components/TopBar";
import { Sprout, Users, Shield, MessageSquare, Leaf } from "lucide-react";

export default function About() {
  return (
    <div className="app-shell">
      <TopBar />
      <div className="container" style={{ maxWidth: 920 }}>
        <div style={{ fontSize: 12, letterSpacing: ".2em", color: "var(--ac-muted)" }}>ABOUT US</div>
        <h1 className="font-display" style={{ fontSize: 44, margin: "8px 0 0", color: "var(--ac-green-900)" }}>
          Built for the farmer, by the farmer.
        </h1>
        <p style={{ fontSize: 17, color: "var(--ac-muted)", marginTop: 12, lineHeight: 1.6 }}>
          AgroConnect brings every link of the farming chain into a single, simple app — from finding trusted
          shops for seeds, fertilizers, pesticides and equipment, to chatting live with fellow farmers across
          India and learning what's working in their fields.
        </p>

        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <Feat icon={Sprout} title="Verified AgroShops" desc="Every shop on AgroConnect is curated and verified by our admin team before going live." />
          <Feat icon={MessageSquare} title="Live Farmer Chat" desc="A single WhatsApp-style room where farmers share prices, weather tips and crop updates in real time." />
          <Feat icon={Users} title="Community First" desc="No middlemen, no spam. Just farmers, buyers and verified suppliers — together." />
          <Feat icon={Shield} title="Safe & Private" desc="Indian phone validation, secure login and full control over your messages and images." />
        </div>

        <div className="card" style={{ marginTop: 28, padding: 28, background: "linear-gradient(135deg, var(--ac-green-900), var(--ac-green-700))", color: "#fff", border: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: ".2em", opacity: .85 }}>
            <Leaf size={14} /> OUR MISSION
          </div>
          <p className="font-display" style={{ fontSize: 24, lineHeight: 1.35, margin: "10px 0 0", maxWidth: 720 }}>
            "Empower every Indian farmer with the information, supplies and community they need —
            from seed selection to harvest sale."
          </p>
        </div>
      </div>
    </div>
  );
}

const Feat = ({ icon: Icon, title, desc }) => (
  <div className="card" style={{ padding: 20 }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: "var(--ac-green-100)", color: "var(--ac-green-800)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <Icon size={20} />
    </div>
    <h3 className="font-display" style={{ margin: "10px 0 4px", color: "var(--ac-green-900)", fontSize: 18 }}>{title}</h3>
    <p style={{ margin: 0, color: "var(--ac-muted)", fontSize: 14 }}>{desc}</p>
  </div>
);
