import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Brand } from "./Brand";
import { LogOut, Home, Info, Sprout, FlaskConical, ShieldCheck, Tractor, MessageSquare, Shield } from "lucide-react";

const Item = ({ to, icon: Icon, label, testid, end = false }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} data-testid={testid}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Icon size={15} /> {label}
    </span>
  </NavLink>
);

export default function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const isAdmin = user?.role === "admin";

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" data-testid="nav-home-brand"><Brand small /></NavLink>
        <nav className="nav-links nav-scroll">
          {isAdmin && <Item to="/admin" icon={Shield} label="Admin" testid="nav-admin" />}
          <Item to="/" icon={Home} label="Home" testid="nav-home" end />
          <Item to="/about" icon={Info} label="About Us" testid="nav-about" />
          <Item to="/shops/seeds" icon={Sprout} label="Seeds/Plants" testid="nav-seeds" />
          <Item to="/shops/fertilizers" icon={FlaskConical} label="Fertilizers" testid="nav-fertilizers" />
          <Item to="/shops/pesticides" icon={ShieldCheck} label="Pesticides" testid="nav-pesticides" />
          <Item to="/shops/equipment" icon={Tractor} label="Equipment" testid="nav-equipment" />
          <Item to="/chat" icon={MessageSquare} label="Chat" testid="nav-chat" />
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="avatar" data-testid="topbar-avatar" title={user?.name}>{initials}</div>
          <button className="btn-ghost" onClick={async () => { await logout(); nav("/login"); }} data-testid="logout-btn">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
