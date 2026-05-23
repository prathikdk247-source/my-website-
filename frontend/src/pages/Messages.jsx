import React, { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import api from "../api";
import { useAuth } from "../AuthContext";
import { useSearchParams } from "react-router-dom";
import { Send, MessagesSquare } from "lucide-react";

const initials = (n) => (n || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

export default function Messages() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialWith = params.get("with");
  const [convs, setConvs] = useState([]);
  const [active, setActive] = useState(null); // {user_id, name, role}
  const [thread, setThread] = useState([]);
  const [text, setText] = useState("");
  const endRef = useRef(null);

  const loadConvs = async () => {
    const { data } = await api.get("/messages/conversations");
    setConvs(data);
    return data;
  };

  const openWith = async (uid, name, role) => {
    setActive({ user_id: uid, name, role });
    const { data } = await api.get(`/messages/${uid}`);
    setThread(data);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => {
    (async () => {
      const cs = await loadConvs();
      if (initialWith) {
        const c = cs.find((x) => x.user_id === initialWith);
        if (c) openWith(c.user_id, c.name, c.role);
        else {
          // fetch user info
          const { data: u } = await api.get(`/users/${initialWith}`);
          openWith(u.id, u.name, u.role);
        }
      } else if (cs.length) {
        openWith(cs[0].user_id, cs[0].name, cs[0].role);
      }
    })();
    // eslint-disable-next-line
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    await api.post("/messages", { to_user_id: active.user_id, content: text.trim() });
    setText("");
    const { data } = await api.get(`/messages/${active.user_id}`);
    setThread(data);
    await loadConvs();
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container">
        <h1 className="font-display" style={{ fontSize: 32, margin: 0, color: "var(--ac-green-900)" }}>Messages</h1>
        <p style={{ color: "var(--ac-muted)", marginTop: 6 }}>Direct conversations with farmers and buyers.</p>

        <div className="card" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "300px 1fr", height: 600, overflow: "hidden" }}>
          <div style={{ borderRight: "1px solid var(--ac-line)", overflowY: "auto" }}>
            <div style={{ padding: 16, fontWeight: 700, color: "var(--ac-muted)", fontSize: 12, letterSpacing: ".15em" }}>CONVERSATIONS</div>
            {convs.length === 0 && (
              <div style={{ padding: 16, color: "var(--ac-muted)", fontSize: 14 }}>
                No conversations yet. Contact a seller from the Marketplace.
              </div>
            )}
            {convs.map((c) => (
              <button key={c.user_id} onClick={() => openWith(c.user_id, c.name, c.role)} data-testid={`conv-${c.user_id}`}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px",
                  display: "flex", gap: 12, alignItems: "center", cursor: "pointer",
                  background: active?.user_id === c.user_id ? "var(--ac-green-100)" : "transparent",
                  border: 0, borderBottom: "1px solid var(--ac-line)",
                }}>
                <div className="avatar">{initials(c.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "var(--ac-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last_message}</div>
                </div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            {!active && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ac-muted)", flexDirection: "column", gap: 12 }}>
                <MessagesSquare size={42} />
                <div>Select a conversation</div>
              </div>
            )}
            {active && (
              <>
                <div style={{ padding: 16, borderBottom: "1px solid var(--ac-line)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="avatar">{initials(active.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{active.name}</div>
                    <span className={`chip ${active.role === "buyer" ? "chip-amber" : ""}`} style={{ textTransform: "capitalize" }}>{active.role}</span>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 18, background: "var(--ac-bg)" }} data-testid="message-thread">
                  {thread.map((m) => {
                    const mine = m.from_user_id === user.id;
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", marginBottom: 8 }}>
                        <div style={{
                          maxWidth: "70%",
                          background: mine ? "var(--ac-green-800)" : "#fff",
                          color: mine ? "#fff" : "var(--ac-ink)",
                          padding: "10px 14px", borderRadius: 16,
                          borderBottomRightRadius: mine ? 4 : 16,
                          borderBottomLeftRadius: mine ? 16 : 4,
                          border: mine ? 0 : "1px solid var(--ac-line)",
                        }}>{m.content}</div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>
                <form onSubmit={send} style={{ borderTop: "1px solid var(--ac-line)", padding: 12, display: "flex", gap: 8 }}>
                  <input className="input-field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message..." data-testid="message-input" />
                  <button className="btn-primary" type="submit" disabled={!text.trim()} data-testid="message-send"><Send size={16} /></button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
