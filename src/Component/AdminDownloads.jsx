import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000/api";

const ACTION_COLORS = {
  Upload: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#34d399" },
  Download: { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.25)", text: "#22d3ee" },
  Preview: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", text: "#a78bfa" },
  Delete: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", text: "#f87171" },
  Move: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", text: "#fbbf24" },
};

const ACTION_ICONS = {
  Upload: "⬆️", Download: "⬇️", Preview: "👁️", Delete: "🗑️", Move: "📦",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (typeof bytes === "string") return bytes;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function downloadCSV(logs) {
  const headers = ["Timestamp", "User", "Action", "Document", "Details"];
  const rows = logs.map(l => [
    l.timestamp || "", l.user_name || "", l.action || "",
    l.document_title || "", l.details || "",
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "document_audit_logs.csv";
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
}

const AdminDownloads = () => {
  const { token } = useAuth();
  const [tab, setTab] = useState("audit");
  const [logs, setLogs] = useState([]);
  const [docs, setDocs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [toast, setToast] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API}/documents/admin/audit-logs`, { headers });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch(`${API}/documents`, { headers });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setDocsLoading(false);
    }
  }, [token]);

  const [categories, setCategories] = useState([]);
  const [storage, setStorage] = useState(null);
  const [storageLoading, setStorageLoading] = useState(true);

  const [movingDoc, setMovingDoc] = useState(null);
  const [moveCategory, setMoveCategory] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/documents/categories`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchStorage = useCallback(async () => {
    setStorageLoading(true);
    try {
      const res = await fetch(`${API}/documents/admin/storage-usage`, { headers });
      if (res.ok) {
        const data = await res.json();
        setStorage(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStorageLoading(false);
    }
  }, [token]);

  const handlePreview = async (doc) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    setPreviewText("");
    setPreviewUrl("");
    try {
      const ext = (doc.filename || "").toLowerCase();
      const isPdf = ext.endsWith(".pdf");
      const isTxt = ext.endsWith(".txt");
      
      const res = await fetch(`${API}/documents/preview/${doc.id}`, { headers });
      if (!res.ok) throw new Error("Failed to load document preview");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      setPreviewUrl(objUrl);
      
      if (isTxt) {
        const text = await blob.text();
        setPreviewText(text);
      } else if (!isPdf) {
        const textRes = await fetch(`${API}/documents/preview/${doc.id}/text`, { headers });
        if (textRes.ok) {
          const textData = await textRes.json();
          setPreviewText(textData.text);
        } else {
          setPreviewText("Document content extraction preview. Click download to read full document.");
        }
      }
    } catch (e) {
      showToast(e.message, "error");
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl("");
    setPreviewText("");
  };

  const handleMove = async () => {
    if (!moveCategory) return;
    setMoveLoading(true);
    try {
      const res = await fetch(`${API}/documents/${movingDoc.id}/category`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ category: moveCategory }),
      });
      if (!res.ok) throw new Error("Move failed");
      showToast(`Moved to '${moveCategory}' ✅`);
      setMovingDoc(null);
      fetchDocs();
      fetchStorage();
      fetchLogs();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setMoveLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); fetchStorage(); fetchCategories(); }, [fetchLogs, fetchStorage, fetchCategories]);
  useEffect(() => { if (tab === "docs") fetchDocs(); }, [tab, fetchDocs]);

  const handleDeleteDoc = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const res = await fetch(`${API}/documents/${id}`, { method: "DELETE", headers });
    if (res.ok || res.status === 204) {
      showToast("Document deleted ✓");
      fetchDocs();
      fetchStorage();
      fetchLogs();
    } else {
      showToast("Delete failed", "error");
    }
  };

  const filteredLogs = logs.filter(l => {
    const q = logSearch.toLowerCase();
    const matchSearch = !q || (l.document_title || "").toLowerCase().includes(q)
      || (l.user_name || "").toLowerCase().includes(q)
      || (l.action || "").toLowerCase().includes(q)
      || (l.details || "").toLowerCase().includes(q);
    const matchAction = !actionFilter || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const filteredDocs = docs.filter(d => {
    const q = docSearch.toLowerCase();
    return !q || (d.title || "").toLowerCase().includes(q) || (d.category || "").toLowerCase().includes(q);
  });

  const actionCounts = logs.reduce((acc, l) => {
    acc[l.action] = (acc[l.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)", color: "var(--text-primary)", fontFamily: "Inter, sans-serif", padding: "2rem 1.5rem" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "0.75rem 1.5rem", borderRadius: "12px", fontWeight: 600, fontSize: "0.85rem",
          background: toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
          border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          color: toast.type === "error" ? "#f87171" : "#34d399",
          backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0, background: "linear-gradient(135deg, #f59e0b, #ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🛡️ Admin Downloads
        </h1>
        <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Document audit logs and administrative document management
        </p>
      </div>

      {/* Dashboard Stats & Storage Usage */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
        {/* Actions Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
          {[
            { label: "Total Events", value: logs.length, icon: "📊", color: "#6366f1" },
            { label: "Uploads", value: actionCounts.Upload || 0, icon: "⬆️", color: "#10b981" },
            { label: "Downloads", value: actionCounts.Download || 0, icon: "⬇️", color: "#06b6d4" },
            { label: "Deletions", value: actionCounts.Delete || 0, icon: "🗑️", color: "#ef4444" },
          ].map(s => (
            <div key={s.label} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
              borderRadius: "16px", padding: "1.25rem",
              display: "flex", alignItems: "center", gap: "0.75rem",
              backdropFilter: "blur(12px)"
            }}>
              <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "1.35rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Storage Summary Card */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
          borderRadius: "20px", padding: "1.5rem",
          display: "flex", flexDirection: "column", gap: "1rem",
          backdropFilter: "blur(12px)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>💾 Storage Usage</span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{storage?.total_files || 0} Files</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, margin: 0, color: "#a78bfa" }}>
              {storage?.total_size_str || "0 Bytes"}
            </h2>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>allocated in Knowledge Layer</span>
          </div>
          
          {/* Progress Bar breakdown */}
          <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", background: "var(--border-primary)", marginTop: "0.25rem" }}>
            {storage?.categories && Object.entries(storage.categories).map(([cat, info], idx) => {
              const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];
              const pct = storage.total_size_bytes > 0 ? (info.size_bytes / storage.total_size_bytes) * 100 : 0;
              return (
                <div 
                  key={cat} 
                  style={{ 
                    width: `${pct}%`, 
                    height: "100%", 
                    background: colors[idx % colors.length] 
                  }} 
                  title={`${cat}: ${info.size_str} (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>

          {/* Categories details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.50rem", fontSize: "0.65rem", color: "var(--text-muted)" }}>
            {storage?.categories && Object.entries(storage.categories).slice(0, 6).map(([cat, info], idx) => {
              const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#ef4444", "#10b981"];
              return (
                <div key={cat} style={{ display: "flex", flexDirection: "column", gap: "0.15rem", borderLeft: `3px solid ${colors[idx % colors.length]}`, paddingLeft: "0.35rem" }}>
                  <span style={{ fontWeight: 700, textTransform: "capitalize", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat}</span>
                  <span>{info.size_str}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", background: "var(--bg-surface)", padding: "0.35rem", borderRadius: "14px", width: "fit-content", border: "1px solid var(--border-primary)" }}>
        {[
          { key: "audit", label: "📋 Audit Logs" },
          { key: "docs", label: "📂 All Documents" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "0.55rem 1.25rem", borderRadius: "10px", border: "none", cursor: "pointer",
              background: tab === t.key ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: tab === t.key ? "#fff" : "var(--text-secondary)",
              fontWeight: 700, fontSize: "0.8rem", transition: "all 0.2s",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ─── Audit Logs Tab ─── */}
      {tab === "audit" && (
        <>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>🔍</span>
              <input
                type="text" placeholder="Search logs..."
                value={logSearch} onChange={e => setLogSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "2.25rem", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={inputStyle}>
              <option value="">All Actions</option>
              {["Upload", "Download", "Preview", "Delete", "Move"].map(a => (
                <option key={a} value={a}>{ACTION_ICONS[a]} {a}</option>
              ))}
            </select>
            <button
              onClick={() => downloadCSV(filteredLogs)}
              style={{
                padding: "0.65rem 1.25rem", borderRadius: "12px", border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff",
                fontWeight: 700, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              📥 Export CSV
            </button>
          </div>

          {logsLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <div style={{ width: 36, height: 36, border: "4px solid rgba(99,102,241,0.3)", borderTop: "4px solid #6366f1", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
              Loading audit logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: "16px", border: "2px dashed var(--border-primary)" }}>
              📋 No audit logs found
            </div>
          ) : (
            <div style={{ background: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border-primary)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface-alt)" }}>
                      {["Timestamp", "User", "Action", "Document", "Details"].map(h => (
                        <th key={h} style={{
                          padding: "0.85rem 1rem", textAlign: "left",
                          color: "var(--text-muted)", fontWeight: 700,
                          fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em",
                          borderBottom: "1px solid var(--border-primary)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log, i) => {
                      const ac = ACTION_COLORS[log.action] || ACTION_COLORS.Upload;
                      return (
                        <tr key={log.id || i} style={{ borderBottom: "1px solid var(--border-primary)", transition: "background 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface-alt)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {formatDate(log.timestamp)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                            👤 {log.user_name || "—"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "0.3rem",
                              padding: "0.2rem 0.6rem", borderRadius: "6px",
                              background: ac.bg, border: `1px solid ${ac.border}`, color: ac.text,
                              fontSize: "0.7rem", fontWeight: 700,
                            }}>
                              {ACTION_ICONS[log.action] || "•"} {log.action}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.document_title || "—"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {log.details || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem", borderTop: "1px solid var(--border-primary)", textAlign: "right" }}>
                Showing {filteredLogs.length} of {logs.length} events
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── All Documents Tab ─── */}
      {tab === "docs" && (
        <>
          <div style={{ marginBottom: "1rem", position: "relative", maxWidth: 400 }}>
            <span style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>🔍</span>
            <input
              type="text" placeholder="Search documents..."
              value={docSearch} onChange={e => setDocSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: "2.25rem", width: "100%", boxSizing: "border-box" }}
            />
          </div>

          {docsLoading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <div style={{ width: 36, height: 36, border: "4px solid rgba(99,102,241,0.3)", borderTop: "4px solid #6366f1", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
              Loading documents...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: "16px", border: "2px dashed var(--border-primary)" }}>
              📂 No documents found
            </div>
          ) : (
            <div style={{ background: "var(--bg-surface)", borderRadius: "16px", border: "1px solid var(--border-primary)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-surface-alt)" }}>
                      {["Title", "Category", "Visibility", "Size", "Uploaded By", "Date", "Actions"].map(h => (
                        <th key={h} style={{
                          padding: "0.85rem 1rem", textAlign: "left",
                          color: "var(--text-muted)", fontWeight: 700,
                          fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em",
                          borderBottom: "1px solid var(--border-primary)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc, i) => (
                      <tr key={doc.id || i} style={{ borderBottom: "1px solid var(--border-primary)", transition: "background 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-surface-alt)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--text-primary)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.title}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                          📁 {doc.category}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem", borderRadius: "6px",
                            fontSize: "0.7rem", fontWeight: 700,
                            background: doc.is_public ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                            color: doc.is_public ? "#34d399" : "#fbbf24",
                            border: `1px solid ${doc.is_public ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                          }}>
                            {doc.is_public ? "🌐 Public" : "🔒 Private"}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>
                          {formatBytes(doc.file_size)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                          {doc.created_by || doc.uploaded_by_name || "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {formatDate(doc.created_at || doc.uploaded_at)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", display: "flex", gap: "0.35rem" }}>
                          <button
                            title="Preview"
                            onClick={() => handlePreview(doc)}
                            style={{
                              padding: "0.3rem 0.5rem", borderRadius: "8px",
                              border: "1px solid var(--border-primary)",
                              background: "transparent", color: "#6366f1",
                              cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
                            }}
                          >👁️</button>
                          <button
                            title="Download"
                            onClick={async () => {
                              const res = await fetch(`${API}/documents/download/${doc.id}`, { headers });
                              if (!res.ok) return;
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = doc.filename || "document";
                              document.body.appendChild(a);
                              a.click();
                              URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            }}
                            style={{
                              padding: "0.3rem 0.5rem", borderRadius: "8px",
                              border: "1px solid var(--border-primary)",
                              background: "transparent", color: "#06b6d4",
                              cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
                            }}
                          >📥</button>
                          <button
                            title="Move Category"
                            onClick={() => { setMovingDoc(doc); setMoveCategory(doc.category); }}
                            style={{
                              padding: "0.3rem 0.5rem", borderRadius: "8px",
                              border: "1px solid var(--border-primary)",
                              background: "transparent", color: "#f59e0b",
                              cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
                            }}
                          >📦</button>
                          <button
                            title="Delete"
                            onClick={() => handleDeleteDoc(doc.id, doc.title)}
                            style={{
                              padding: "0.3rem 0.5rem", borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.25)",
                              background: "rgba(239,68,68,0.1)", color: "#f87171",
                              cursor: "pointer", fontWeight: 700, fontSize: "0.75rem",
                            }}
                          >🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem", borderTop: "1px solid var(--border-primary)", textAlign: "right" }}>
                {filteredDocs.length} documents total
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Preview Modal ─── */}
      {previewDoc && (
        <Modal onClose={handleClosePreview} title={`👁️ Preview: ${previewDoc.title}`}>
          <div style={{ minHeight: "200px", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {previewLoading ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem", color: "var(--text-muted)", gap: "1rem" }}>
                <div style={{ width: 40, height: 40, border: "4px solid rgba(99,102,241,0.3)", borderTop: "4px solid #6366f1", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
                <span>Preparing file preview...</span>
              </div>
            ) : (
              <div style={{ background: "var(--bg-surface-alt)", borderRadius: "12px", border: "1px solid var(--border-primary)", overflow: "hidden", position: "relative" }}>
                {previewDoc.filename.toLowerCase().endsWith(".pdf") && previewUrl ? (
                  <iframe 
                    src={previewUrl} 
                    title={previewDoc.title}
                    style={{ width: "100%", height: "550px", border: "none", background: "#fff" }} 
                  />
                ) : previewDoc.filename.toLowerCase().endsWith(".txt") ? (
                  <pre style={{ 
                    margin: 0, padding: "1.5rem", fontSize: "0.85rem", color: "var(--text-primary)", 
                    fontFamily: "Fira Code, Courier New, monospace", whiteSpace: "pre-wrap", 
                    maxHeight: "550px", overflowY: "auto", background: "var(--bg-surface)",
                    lineHeight: "1.6", textAlign: "left"
                  }}>
                    {previewText}
                  </pre>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "1rem", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-surface)" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>EXTRACTED TEXT PREVIEW</span>
                      <a 
                        href={`${API}/documents/download/${previewDoc.id}`}
                        onClick={async (e) => {
                          e.preventDefault();
                          const res = await fetch(`${API}/documents/download/${previewDoc.id}`, { headers });
                          if (!res.ok) return;
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = previewDoc.filename;
                          document.body.appendChild(a);
                          a.click();
                          URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        }}
                        style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 700, textDecoration: "none" }}
                      >
                        📥 Download Original
                      </a>
                    </div>
                    <pre style={{ 
                      margin: 0, padding: "1.5rem", fontSize: "0.85rem", color: "var(--text-primary)", 
                      fontFamily: "Fira Code, Courier New, monospace", whiteSpace: "pre-wrap", 
                      maxHeight: "500px", overflowY: "auto", background: "var(--bg-surface)",
                      lineHeight: "1.6", textAlign: "left"
                    }}>
                      {previewText}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0 0", borderTop: "1px solid var(--border-primary)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Category: <strong>{previewDoc.category}</strong></span>
              <span>Size: <strong>{formatBytes(previewDoc.file_size)}</strong></span>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Move Category Modal ─── */}
      {movingDoc && (
        <Modal onClose={() => setMovingDoc(null)} title="📦 Move Document">
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Move <strong style={{ color: "var(--text-primary)" }}>{movingDoc.title}</strong> to a different category:
          </p>
          <select
            value={moveCategory}
            onChange={e => setMoveCategory(e.target.value)}
            style={{ ...inputStyle, marginBottom: "1rem", width: "100%", boxSizing: "border-box" }}
          >
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => setMovingDoc(null)} style={{ ...btnOutline, flex: 1 }}>Cancel</button>
            <button onClick={handleMove} disabled={moveLoading} style={{ ...btnPrimary, flex: 2, opacity: moveLoading ? 0.7 : 1 }}>
              {moveLoading ? "Moving..." : "📦 Move Document"}
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
};

function Modal({ onClose, title, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
        borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: 500,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
        animation: "modalIn 0.25s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "0.65rem 1rem",
  background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
  borderRadius: "12px", color: "var(--text-primary)", fontSize: "0.85rem", outline: "none",
};

const btnPrimary = {
  padding: "0.75rem", borderRadius: "12px", border: "none", cursor: "pointer",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
  fontWeight: 700, fontSize: "0.85rem", transition: "opacity 0.15s",
};

const btnOutline = {
  padding: "0.75rem", borderRadius: "12px",
  border: "1px solid var(--border-primary)", background: "transparent",
  color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
};

export default AdminDownloads;
