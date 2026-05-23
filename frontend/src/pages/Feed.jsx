import React, { useEffect, useState } from "react";
import TopBar from "../components/TopBar";
import { useAuth } from "../AuthContext";
import api, { formatError } from "../api";
import { Heart, MessageCircle, Trash2, Send, Leaf } from "lucide-react";

const initials = (n) => (n || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState({}); // post_id -> comments

  const load = async () => {
    const { data } = await api.get("/posts");
    setPosts(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr("");
    try {
      await api.post("/posts", { content: text.trim() });
      setText("");
      await load();
    } catch (e2) { setErr(formatError(e2)); } finally { setBusy(false); }
  };

  const toggleLike = async (id) => {
    const { data } = await api.post(`/posts/${id}/like`);
    setPosts((ps) => ps.map((p) => (p.id === id ? data : p)));
  };

  const toggleComments = async (id) => {
    if (open[id]) {
      setOpen({ ...open, [id]: null });
      return;
    }
    const { data } = await api.get(`/posts/${id}/comments`);
    setOpen({ ...open, [id]: { list: data, draft: "" } });
  };

  const addComment = async (id) => {
    const draft = open[id]?.draft?.trim();
    if (!draft) return;
    await api.post(`/posts/${id}/comments`, { content: draft });
    const { data } = await api.get(`/posts/${id}/comments`);
    setOpen({ ...open, [id]: { list: data, draft: "" } });
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, comment_count: data.length } : p)));
  };

  const remove = async (id) => {
    await api.delete(`/posts/${id}`);
    await load();
  };

  return (
    <div className="app-shell">
      <TopBar />
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 28 }}>
        <div>
          <div className="hero" data-testid="feed-hero">
            <div style={{ fontSize: 12, letterSpacing: "0.2em", opacity: .9, display: "flex", alignItems: "center", gap: 8 }}>
              <Leaf size={14} /> COMMUNITY
            </div>
            <h1 className="font-display" style={{ fontSize: 42, margin: "10px 0 0", fontWeight: 900 }}>
              Hello, {user?.name?.split(" ")[0] || "Farmer"} 🌾
            </h1>
            <p style={{ opacity: .9, maxWidth: 560, marginTop: 8 }}>
              Share crop updates, ask questions, or find buyers. Your farmer network is right here.
            </p>
          </div>

          <form onSubmit={submit} className="post-card" style={{ marginTop: 18 }} data-testid="post-composer">
            <div style={{ display: "flex", gap: 12 }}>
              <div className="avatar">{initials(user?.name)}</div>
              <textarea className="input-field" rows={3} placeholder="What's happening on your farm?"
                value={text} onChange={(e) => setText(e.target.value)} data-testid="post-input"
                style={{ resize: "vertical" }} />
            </div>
            {err && <div style={{ color: "#b3261e", fontSize: 13, marginTop: 8 }}>{err}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn-primary" type="submit" disabled={busy || !text.trim()} data-testid="post-submit">
                {busy ? "Posting..." : "Share"}
              </button>
            </div>
          </form>

          <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
            {posts.length === 0 && <div className="card" style={{ padding: 24, textAlign: "center", color: "var(--ac-muted)" }}>No posts yet. Be the first to share!</div>}
            {posts.map((p) => (
              <div key={p.id} className="post-card" data-testid={`post-${p.id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div className="avatar">{initials(p.author_name)}</div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.author_name}</div>
                      <div style={{ fontSize: 12, color: "var(--ac-muted)" }}>
                        <span className={`chip ${p.author_role === "buyer" ? "chip-amber" : ""}`}>{p.author_role}</span>
                        <span style={{ marginLeft: 8 }}>{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {p.author_id === user?.id && (
                    <button onClick={() => remove(p.id)} data-testid={`post-delete-${p.id}`}
                      style={{ background: "transparent", border: 0, color: "#b3261e", cursor: "pointer" }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p style={{ marginTop: 12, marginBottom: 12, whiteSpace: "pre-wrap" }}>{p.content}</p>
                <div style={{ display: "flex", gap: 18, color: "var(--ac-muted)", fontSize: 14 }}>
                  <button onClick={() => toggleLike(p.id)} data-testid={`post-like-${p.id}`}
                    style={{ background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: p.likes?.includes(user?.id) ? "var(--ac-green-800)" : "inherit", fontWeight: 600 }}>
                    <Heart size={16} fill={p.likes?.includes(user?.id) ? "currentColor" : "none"} /> {p.likes?.length || 0}
                  </button>
                  <button onClick={() => toggleComments(p.id)} data-testid={`post-comment-${p.id}`}
                    style={{ background: "transparent", border: 0, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                    <MessageCircle size={16} /> {p.comment_count || 0}
                  </button>
                </div>
                {open[p.id] && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--ac-line)", paddingTop: 14 }}>
                    {(open[p.id].list || []).map((c) => (
                      <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials(c.author_name)}</div>
                        <div style={{ background: "var(--ac-green-100)", padding: "8px 12px", borderRadius: 12 }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{c.author_name}</div>
                          <div style={{ fontSize: 14 }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input className="input-field" placeholder="Write a comment..."
                        value={open[p.id].draft}
                        onChange={(e) => setOpen({ ...open, [p.id]: { ...open[p.id], draft: e.target.value } })}
                        onKeyDown={(e) => e.key === "Enter" && addComment(p.id)}
                        data-testid={`comment-input-${p.id}`} />
                      <button className="btn-primary" onClick={() => addComment(p.id)} data-testid={`comment-submit-${p.id}`}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside style={{ position: "sticky", top: 80, alignSelf: "start", display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: "var(--ac-muted)", letterSpacing: ".15em" }}>QUICK STATS</div>
            <h3 className="font-display" style={{ fontSize: 22, margin: "8px 0 6px", color: "var(--ac-green-900)" }}>Network at a glance</h3>
            <Stat label="Posts" value={posts.length} />
            <Stat label="You" value={user?.role || "—"} />
          </div>
          <div className="card" style={{ padding: 18, background: "linear-gradient(180deg, var(--ac-green-100), #fff)" }}>
            <div style={{ fontSize: 12, color: "var(--ac-muted)", letterSpacing: ".15em" }}>TIP OF THE DAY</div>
            <h3 className="font-display" style={{ fontSize: 20, margin: "8px 0 6px", color: "var(--ac-green-900)" }}>
              Test soil pH before sowing
            </h3>
            <p style={{ margin: 0, color: "var(--ac-muted)", fontSize: 14 }}>
              Crops like tomato and onion prefer pH 6.0–7.0. Apply lime if too acidic, gypsum if too alkaline.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

const Stat = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px dashed var(--ac-line)" }}>
    <span style={{ color: "var(--ac-muted)", textTransform: "capitalize" }}>{label}</span>
    <span style={{ fontWeight: 700, textTransform: "capitalize" }}>{value}</span>
  </div>
);
