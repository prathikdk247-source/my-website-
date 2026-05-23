import React, { useEffect, useRef, useState } from "react";
import TopBar from "../components/TopBar";
import api from "../api";
import { useAuth } from "../AuthContext";
import { Send, Image as ImageIcon, Trash2, X } from "lucide-react";

const initials = (n) => (n || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
const palette = ["#0F4F2C", "#7a5a0e", "#3FA66B", "#1A6B3D", "#0B3B23", "#b3261e", "#5b6b61", "#0e6ba8"];
const colorFor = (id) => {
  let h = 0; for (const c of id || "") h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};
const timeShort = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Chat() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [pendingImg, setPendingImg] = useState(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const load = async () => {
    const { data } = await api.get("/chat");
    setMsgs(data);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // poll for new messages
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const pickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 900_000) {
      alert("Image too large. Please pick one under 900 KB.");
      e.target.value = "";
      return;
    }
    const r = new FileReader();
    r.onload = () => setPendingImg(r.result);
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const send = async (e) => {
    e?.preventDefault();
    if (!text.trim() && !pendingImg) return;
    setSending(true);
    try {
      const { data } = await api.post("/chat", { text: text.trim(), image: pendingImg });
      setMsgs((m) => [...m, data]);
      setText(""); setPendingImg(null);
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    await api.delete(`/chat/${id}`);
    setMsgs((m) => m.filter((x) => x.id !== id));
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container" style={{ maxWidth: 920 }}>
        <h1 className="font-display" style={{ fontSize: 34, margin: 0, color: "var(--ac-green-900)" }}>Farmer Chat</h1>
        <p style={{ color: "var(--ac-muted)", marginTop: 6 }}>One room. Every farmer. Share prices, weather, photos and tips — instantly.</p>

        <div className="card chat-card" data-testid="chat-card">
          <div className="chat-header">
            <div className="avatar" style={{ background: "var(--ac-green-800)" }}>FC</div>
            <div>
              <div style={{ fontWeight: 800 }}>AgroConnect Farmers</div>
              <div style={{ fontSize: 12, color: "var(--ac-muted)" }}>{msgs.length} messages · live</div>
            </div>
          </div>

          <div className="chat-body" data-testid="chat-body">
            {msgs.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--ac-muted)", padding: 24 }}>
                Be the first to say hello, {user?.name?.split(" ")[0] || "farmer"}!
              </div>
            )}
            {msgs.map((m) => {
              const mine = m.user_id === user.id;
              return (
                <div key={m.id} className={`chat-row ${mine ? "mine" : ""}`} data-testid={`msg-${m.id}`}>
                  {!mine && <div className="avatar" style={{ background: colorFor(m.user_id) }}>{initials(m.user_name)}</div>}
                  <div className={`bubble ${mine ? "bubble-mine" : ""}`}>
                    {!mine && <div className="bubble-name" style={{ color: colorFor(m.user_id) }}>{m.user_name}</div>}
                    {m.image && <img src={m.image} alt="" className="bubble-img" />}
                    {m.text && <div className="bubble-text">{m.text}</div>}
                    <div className="bubble-time">{timeShort(m.created_at)}</div>
                    {(mine || user.role === "admin") && (
                      <button className="bubble-del" onClick={() => remove(m.id)} data-testid={`msg-del-${m.id}`}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>

          {pendingImg && (
            <div style={{ padding: "10px 14px", borderTop: "1px solid var(--ac-line)", display: "flex", alignItems: "center", gap: 10, background: "var(--ac-green-100)" }}>
              <img src={pendingImg} alt="preview" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />
              <span style={{ fontSize: 13, color: "var(--ac-muted)" }}>Image ready to send</span>
              <button onClick={() => setPendingImg(null)} data-testid="chat-clear-image"
                style={{ marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer", color: "#b3261e" }}>
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={send} className="chat-input">
            <button type="button" onClick={() => fileRef.current?.click()} data-testid="chat-image-btn"
              className="btn-ghost" style={{ borderRadius: 12 }} title="Send image">
              <ImageIcon size={16} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickImage} style={{ display: "none" }} data-testid="chat-file-input" />
            <input className="input-field" placeholder="Type a message..."
              value={text} onChange={(e) => setText(e.target.value)} data-testid="chat-input" />
            <button className="btn-primary" type="submit" disabled={sending || (!text.trim() && !pendingImg)} data-testid="chat-send">
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
