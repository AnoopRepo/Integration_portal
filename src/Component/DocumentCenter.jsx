import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8000/api";

const CATEGORY_ICONS = {
  documents: "📄",
  policies: "📋",
  resumes: "👤",
  certificates: "🏆",
  reports: "📊",
  training: "🎓",
};

const CATEGORY_COLORS = {
  documents: "from-blue-500 to-cyan-500",
  policies: "from-purple-500 to-violet-500",
  resumes: "from-emerald-500 to-teal-500",
  certificates: "from-amber-500 to-orange-500",
  reports: "from-rose-500 to-pink-500",
  training: "from-indigo-500 to-blue-500",
};

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (typeof bytes === "string") return bytes;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

const DocumentCenter = () => {
  const { user, token } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isAdmin = role === "admin" || role === "administrator";

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [movingDoc, setMovingDoc] = useState(null);
  const [moveCategory, setMoveCategory] = useState("");
  const [moveLoading, setMoveLoading] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

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

  const [form, setForm] = useState({
    title: "", category: "", description: "", is_public: true, file: null,
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/documents/categories`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (!form.category && data.length) setForm(f => ({ ...f, category: data[0] }));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filterCat) params.set("category", filterCat);
      const res = await fetch(`${API}/documents?${params}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [token, search, filterCat]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file || !form.title || !form.category) {
      showToast("Please fill all required fields", "error");
      return;
    }
    setUploadLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("description", form.description);
      fd.append("is_public", form.is_public);
      fd.append("file", form.file);
      const res = await fetch(`${API}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      showToast("Document uploaded successfully! 🎉");
      setShowUpload(false);
      setForm({ title: "", category: categories[0] || "", description: "", is_public: true, file: null });
      fetchDocuments();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/documents/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Document deleted");
      setDeleteId(null);
      fetchDocuments();
    } catch (e) {
      showToast(e.message, "error");
    }
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
      fetchDocuments();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setMoveLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setForm(prev => ({ ...prev, file: f }));
  };

  // Stats
  const totalFiles = documents.length;
  const publicFiles = documents.filter(d => d.is_public).length;
  const uniqueCats = [...new Set(documents.map(d => d.category))].length;

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
          animation: "slideIn 0.3s ease",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 900, margin: 0, background: "linear-gradient(135deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            📂 Document Center
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Upload, organize and manage corporate documents
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.65rem 1.5rem", borderRadius: "12px", border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff",
            fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.03em",
            boxShadow: "0 4px 20px rgba(99,102,241,0.4)", transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(99,102,241,0.5)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(99,102,241,0.4)"; }}
        >
          ➕ Upload Document
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total Documents", value: totalFiles, icon: "📄", color: "#6366f1" },
          { label: "Categories", value: uniqueCats, icon: "🗂️", color: "#8b5cf6" },
          { label: "Public Files", value: publicFiles, icon: "🌐", color: "#06b6d4" },
          { label: "Private Files", value: totalFiles - publicFiles, icon: "🔒", color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
            borderRadius: "16px", padding: "1.25rem 1.5rem",
            display: "flex", alignItems: "center", gap: "1rem",
            backdropFilter: "blur(12px)",
          }}>
            <div style={{ fontSize: "1.75rem" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "1.5rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
          <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "1rem" }}>🔍</span>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "0.7rem 1rem 0.7rem 2.5rem",
              background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
              borderRadius: "12px", color: "var(--text-primary)", fontSize: "0.85rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          style={{
            padding: "0.7rem 1rem", background: "var(--bg-surface)",
            border: "1px solid var(--border-primary)", borderRadius: "12px",
            color: "var(--text-primary)", fontSize: "0.85rem", outline: "none", cursor: "pointer",
          }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{CATEGORY_ICONS[c] || "📁"} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Document List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          <div style={{ width: 40, height: 40, border: "4px solid rgba(99,102,241,0.3)", borderTop: "4px solid #6366f1", borderRadius: "50%", margin: "0 auto 1rem", animation: "spin 1s linear infinite" }} />
          Loading documents...
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "16px" }}>
          ⚠️ {error}
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: "20px", border: "2px dashed var(--border-primary)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📂</div>
          <p style={{ fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem" }}>No documents found</p>
          <p style={{ fontSize: "0.85rem" }}>Upload your first document to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {documents.map(doc => {
            const catColor = CATEGORY_COLORS[doc.category] || "from-indigo-500 to-purple-500";
            const catIcon = CATEGORY_ICONS[doc.category] || "📁";
            const canDelete = isAdmin || doc.created_by_id === (user?.id || user?._id);
            return (
              <div key={doc.id} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-primary)",
                borderRadius: "16px", padding: "1rem 1.5rem",
                display: "flex", alignItems: "center", gap: "1rem",
                transition: "border-color 0.2s, transform 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-primary)"; e.currentTarget.style.transform = "none"; }}
              >
                {/* Category badge */}
                <div style={{
                  width: 44, height: 44, borderRadius: "12px", flexShrink: 0,
                  background: `linear-gradient(135deg, ${catColor.replace("from-", "").replace(" to-", ", ").split(",").map(c => `var(--${c.trim()})` || c.trim()).join(", ")})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.3rem", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}>
                  {catIcon}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>{doc.title}</span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "0.2rem 0.5rem",
                      borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.05em",
                      background: doc.is_public ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                      color: doc.is_public ? "#34d399" : "#fbbf24",
                      border: `1px solid ${doc.is_public ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
                    }}>
                      {doc.is_public ? "🌐 Public" : "🔒 Private"}
                    </span>
                  </div>
                  {doc.description && <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.description}</p>}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>📁 {doc.category}</span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>📅 {formatDate(doc.created_at || doc.uploaded_at)}</span>
                    {doc.file_size && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>💾 {formatBytes(doc.file_size)}</span>}
                    {doc.created_by && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>👤 {doc.created_by}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    title="Preview"
                    onClick={() => handlePreview(doc)}
                    style={{
                      width: 36, height: 36, borderRadius: "10px", border: "1px solid var(--border-primary)",
                      background: "transparent", color: "#6366f1", cursor: "pointer", fontSize: "0.9rem",
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >👁️</button>
                  <ActionBtn
                    href={`${API}/documents/download/${doc.id}`}
                    token={token}
                    icon="⬇️" title="Download" color="#06b6d4" download
                    filename={doc.filename}
                  />
                  {isAdmin && (
                    <button
                      title="Move Category"
                      onClick={() => { setMovingDoc(doc); setMoveCategory(doc.category); }}
                      style={{
                        width: 36, height: 36, borderRadius: "10px", border: "1px solid var(--border-primary)",
                        background: "transparent", color: "#f59e0b", cursor: "pointer", fontSize: "0.9rem",
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(245,158,11,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >📦</button>
                  )}
                  {canDelete && (
                    <button
                      title="Delete"
                      onClick={() => setDeleteId(doc.id)}
                      style={{
                        width: 36, height: 36, borderRadius: "10px", border: "1px solid var(--border-primary)",
                        background: "transparent", color: "#f87171", cursor: "pointer", fontSize: "0.9rem",
                        display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >🗑️</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
            
            {/* Meta details footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0 0", borderTop: "1px solid var(--border-primary)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Category: <strong>{previewDoc.category}</strong></span>
              <span>Size: <strong>{formatBytes(previewDoc.file_size)}</strong></span>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Upload Modal ─── */}
      {showUpload && (
        <Modal onClose={() => setShowUpload(false)} title="📤 Upload Document">
          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Drag-drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#6366f1" : "var(--border-primary)"}`,
                borderRadius: "14px", padding: "1.5rem", textAlign: "center",
                cursor: "pointer", background: dragOver ? "rgba(99,102,241,0.06)" : "var(--bg-surface-alt)",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                {form.file ? "✅" : "☁️"}
              </div>
              <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                {form.file ? form.file.name : "Drag & drop or click to choose file"}
              </p>
              {form.file && (
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {formatBytes(form.file.size)}
                </p>
              )}
              <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={e => setForm(f => ({ ...f, file: e.target.files[0] }))} />
            </div>

            <FormField label="Title *">
              <input
                type="text" required placeholder="Document title"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={inputStyle}
              />
            </FormField>

            <FormField label="Category *">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {categories.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] || "📁"} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </FormField>

            <FormField label="Description">
              <textarea
                placeholder="Optional description..."
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} style={{ ...inputStyle, resize: "vertical" }}
              />
            </FormField>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
                style={{
                  width: 42, height: 24, borderRadius: "12px", cursor: "pointer",
                  background: form.is_public ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--bg-surface-alt)",
                  border: "1px solid var(--border-primary)", position: "relative", transition: "background 0.25s",
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: "9px", background: "#fff",
                  position: "absolute", top: 3, left: form.is_public ? 21 : 3, transition: "left 0.25s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }} />
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {form.is_public ? "🌐 Public — all employees can see this" : "🔒 Private — only you and admins"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={() => setShowUpload(false)} style={{ ...btnOutline, flex: 1 }}>Cancel</button>
              <button type="submit" disabled={uploadLoading} style={{ ...btnPrimary, flex: 2, opacity: uploadLoading ? 0.7 : 1 }}>
                {uploadLoading ? "Uploading..." : "⬆️ Upload Document"}
              </button>
            </div>
          </form>
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
            style={{ ...inputStyle, marginBottom: "1rem" }}
          >
            {categories.map(c => <option key={c} value={c}>{CATEGORY_ICONS[c] || "📁"} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => setMovingDoc(null)} style={{ ...btnOutline, flex: 1 }}>Cancel</button>
            <button onClick={handleMove} disabled={moveLoading} style={{ ...btnPrimary, flex: 2, opacity: moveLoading ? 0.7 : 1 }}>
              {moveLoading ? "Moving..." : "📦 Move Document"}
            </button>
          </div>
        </Modal>
      )}

      {/* ─── Delete Confirm Modal ─── */}
      {deleteId && (
        <Modal onClose={() => setDeleteId(null)} title="🗑️ Confirm Deletion">
          <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Are you sure you want to <strong style={{ color: "#f87171" }}>permanently delete</strong> this document? This action cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={() => setDeleteId(null)} style={{ ...btnOutline, flex: 1 }}>Cancel</button>
            <button onClick={() => handleDelete(deleteId)} style={{ ...btnDanger, flex: 1 }}>Delete</button>
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(12px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
};

function ActionBtn({ href, token, icon, title, color, download, filename }) {
  const handleClick = async () => {
    const res = await fetch(href, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    if (download) a.download = filename || "document";
    else a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  };

  return (
    <button
      title={title}
      onClick={handleClick}
      style={{
        width: 36, height: 36, borderRadius: "10px", border: "1px solid var(--border-primary)",
        background: "transparent", color, cursor: "pointer", fontSize: "0.9rem",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >{icon}</button>
  );
}

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

function FormField({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "0.65rem 1rem",
  background: "var(--bg-surface-alt)", border: "1px solid var(--border-primary)",
  borderRadius: "10px", color: "var(--text-primary)", fontSize: "0.85rem",
  outline: "none", boxSizing: "border-box",
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

const btnDanger = {
  padding: "0.75rem", borderRadius: "12px", border: "none", cursor: "pointer",
  background: "rgba(239,68,68,0.15)", color: "#f87171",
  fontWeight: 700, fontSize: "0.85rem",
  border: "1px solid rgba(239,68,68,0.25)",
};

export default DocumentCenter;
