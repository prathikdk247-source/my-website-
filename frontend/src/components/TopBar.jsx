import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Brand } from "./Brand";
import { LogOut, Home, Store, MessagesSquare, User } from "lucide-react";

const NavItem = ({ to, icon: Icon, label, testid }) => (
  <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} data-testid={testid}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Icon size={16} /> {label}
    </span>
  </NavLink>
);

export default function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" data-testid="nav-home-brand"><Brand small /></NavLink>
        <nav className="nav-links">
          <NavItem to="/" icon={Home} label="Feed" testid="nav-feed" />
          <NavItem to="/marketplace" icon={Store} label="Marketplace" testid="nav-marketplace" />
          <NavItem to="/messages" icon={MessagesSquare} label="Messages" testid="nav-messages" />
          <NavItem to="/profile" icon={User} label="Profile" testid="nav-profile" />
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="avatar" data-testid="topbar-avatar" title={user?.name}>{initials}</div>
          <button className="btn-ghost" onClick={async () => { await logout(); nav("/login"); }} data-testid="logout-btn">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><LogOut size={14} /> Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
