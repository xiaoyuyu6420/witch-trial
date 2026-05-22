"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const Recharts = dynamic(() => import("./_components/DashboardTab"), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

type Tab = "dashboard" | "users" | "questions" | "types";

const API_BASE = "/api/admin";
const TABS: { key: Tab; label: string }[] = [
  { key: "dashboard", label: "统计面板" },
  { key: "users", label: "用户追踪" },
  { key: "questions", label: "题目管理" },
  { key: "types", label: "人格管理" },
];

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [storedPw, setStoredPw] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    const saved = sessionStorage.getItem("admin-pw");
    if (saved) { setStoredPw(saved); setAuthed(true); }
  }, []);

  const api = useCallback(async (path: string, opts?: RequestInit) => {
    const pw = storedPw || password;
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", "x-admin-password": pw, ...opts?.headers },
    });
    if (res.status === 401) { setAuthed(false); setStoredPw(null); sessionStorage.removeItem("admin-pw"); throw new Error("Unauthorized"); }
    return res;
  }, [storedPw, password]);

  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/stats`, { headers: { "x-admin-password": password } });
      if (res.ok) { sessionStorage.setItem("admin-pw", password); setStoredPw(password); setAuthed(true); }
      else setAuthError("密码错误");
    } catch { setAuthError("连接失败"); }
  };

  const handleLogout = () => {
    setAuthed(false); setStoredPw(null); setPassword(""); sessionStorage.removeItem("admin-pw");
  };

  if (!authed) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", letterSpacing: "0.2em", color: "#d4af37", marginBottom: "2rem" }}>WITCH TRIAL ADMIN</h1>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="输入管理密码" autoFocus
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "0.75rem 1.5rem", color: "#e6e6e6", fontSize: "0.9rem", width: 280, outline: "none" }} />
          {authError && <div style={{ color: "#ef4444", marginTop: "0.5rem", fontSize: "0.8rem" }}>{authError}</div>}
          <button onClick={handleLogin}
            style={{ display: "block", margin: "1rem auto 0", background: "#d4af37", color: "#050308", border: "none", borderRadius: 8, padding: "0.6rem 2rem", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
            登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "1.2rem", letterSpacing: "0.2em", color: "#d4af37" }}>WITCH TRIAL ADMIN</h1>
        <button onClick={handleLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 6, padding: "0.4rem 1rem", cursor: "pointer", fontSize: "0.75rem" }}>退出</button>
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.5rem" }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ background: "transparent", border: "none", color: tab === t.key ? "#d4af37" : "rgba(255,255,255,0.3)", fontWeight: tab === t.key ? 700 : 400, fontSize: "0.85rem", padding: "0.5rem 1rem", cursor: "pointer", borderBottom: tab === t.key ? "2px solid #d4af37" : "2px solid transparent" }}>
            {t.label}
          </button>
        ))}
      </div>
      <div>
        {tab === "dashboard" && <Recharts api={api} />}
        {tab === "users" && <UsersTab api={api} />}
        {tab === "questions" && <QuestionsTab api={api} />}
        {tab === "types" && <TypesTab api={api} />}
      </div>
    </div>
  );
}

// ========== Users Tab ==========
function UsersTab({ api }: { api: (path: string, opts?: RequestInit) => Promise<Response> }) {
  const [users, setUsers] = useState<Rec[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<Rec | null>(null);
  const [userDetail, setUserDetail] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await api(`/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch { } finally { setLoading(false); }
  }, [api, page, search, typeFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openDetail = async (id: number) => {
    try {
      const res = await api(`/users/${id}`);
      const data = await res.json();
      setUserDetail(data);
      setSelectedUser(data);
    } catch { }
  };

  const exportCSV = async () => {
    try {
      const res = await api("/export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "witch-trial-records.csv"; a.click();
      URL.revokeObjectURL(url);
    } catch { }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input placeholder="搜索 Session / IP" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "#e6e6e6", fontSize: "0.8rem", width: 200, outline: "none" }} />
        <input placeholder="筛选类型 (如 EMMA)" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value.toUpperCase()); setPage(1); }}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "0.5rem 0.75rem", color: "#e6e6e6", fontSize: "0.8rem", width: 160, outline: "none" }} />
        <button onClick={exportCSV} style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", borderRadius: 6, padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.8rem" }}>导出 CSV</button>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem", alignSelf: "center" }}>共 {total} 条</span>
      </div>
      {loading ? <div style={{ color: "rgba(255,255,255,0.3)" }}>加载中...</div> : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                {["ID", "类型", "相似度", "IP", "设备", "分辨率", "时长", "时间"].map((h) => (
                  <th key={h} style={{ padding: "0.5rem", textAlign: "left", color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id as number} onClick={() => openDetail(u.id as number)}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer" }}>
                  <td style={{ padding: "0.5rem" }}>{u.id as number}</td>
                  <td style={{ padding: "0.5rem" }}><span style={{ color: "#d4af37" }}>{u.resultCode as string}</span></td>
                  <td style={{ padding: "0.5rem" }}>{(u.similarity as number).toFixed(1)}%</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.5)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(u.ipAddress as string) || "-"}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.5)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(u.userAgent as string)?.slice(0, 40) || "-"}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.5)" }}>{(u.screenRes as string) || "-"}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.5)" }}>{u.duration ? `${Math.round((u.duration as number) / 1000)}s` : "-"}</td>
                  <td style={{ padding: "0.5rem", color: "rgba(255,255,255,0.5)" }}>{new Date(u.createdAt as string).toLocaleString("zh-CN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "center" }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: page <= 1 ? "rgba(255,255,255,0.1)" : "#e6e6e6", padding: "0.3rem 0.8rem", borderRadius: 4, cursor: page <= 1 ? "default" : "pointer" }}>上一页</button>
          <span style={{ color: "rgba(255,255,255,0.4)", alignSelf: "center", fontSize: "0.8rem" }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ background: "rgba(255,255,255,0.05)", border: "none", color: page >= totalPages ? "rgba(255,255,255,0.1)" : "#e6e6e6", padding: "0.3rem 0.8rem", borderRadius: 4, cursor: page >= totalPages ? "default" : "pointer" }}>下一页</button>
        </div>
      )}
      {selectedUser && userDetail && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }} onClick={() => setSelectedUser(null)}>
          <div style={{ background: "#0a0612", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "1.5rem", maxWidth: 800, width: "90%", maxHeight: "80vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1rem", color: "#d4af37" }}>用户 #{userDetail.id} 详情</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>关闭</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>类型：</span><span style={{ color: "#d4af37" }}>{userDetail.resultCode as string}</span></div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>相似度：</span>{(userDetail.similarity as number).toFixed(1)}%</div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>向量：</span>{userDetail.userVector as string}</div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>IP：</span>{userDetail.ipAddress as string || "-"}</div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>分辨率：</span>{userDetail.screenRes as string || "-"}</div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>语言：</span>{userDetail.language as string || "-"}</div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>时区：</span>{userDetail.timezone as string || "-"}</div>
              <div><span style={{ color: "rgba(255,255,255,0.4)" }}>时长：</span>{userDetail.duration ? `${Math.round((userDetail.duration as number) / 1000)}s` : "-"}</div>
              <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "rgba(255,255,255,0.4)" }}>UA：</span>{userDetail.userAgent as string || "-"}</div>
            </div>
            <div style={{ fontSize: "0.75rem" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: "0.5rem" }}>作答详情：</div>
              {((userDetail.answers as Rec[]) || []).map((a, i) => (
                <div key={i} style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)" }}>Q{(a.question as Rec)?.order as number}: {((a.question as Rec)?.text as string)?.slice(0, 60)}...</div>
                  <div style={{ color: "#d4af37" }}>选项ID: {a.optionId as number}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Excel Toolbar ==========
function ExcelToolbar({ api, onImported }: { api: (path: string, opts?: RequestInit) => Promise<Response>; onImported: () => void }) {
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const downloadTemplate = async () => {
    try {
      const res = await api("/template");
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "witch-trial-template.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch { setMsg({ text: "下载失败", ok: false }); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setMsg(null);
    try {
      const pw = sessionStorage.getItem("admin-pw") || "";
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "x-admin-password": pw },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setMsg({ text: `导入成功：${data.updatedQuestions} 道题目，${data.updatedTypes} 个人格`, ok: true });
      onImported();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "导入失败", ok: false });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={downloadTemplate} style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37", borderRadius: 6, padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.8rem" }}>
        下载模板
      </button>
      <label style={{ background: importing ? "rgba(255,255,255,0.05)" : "rgba(212,175,55,0.15)", border: `1px solid ${importing ? "rgba(255,255,255,0.1)" : "rgba(212,175,55,0.4)"}`, color: importing ? "rgba(255,255,255,0.3)" : "#d4af37", borderRadius: 6, padding: "0.5rem 1rem", cursor: importing ? "wait" : "pointer", fontSize: "0.8rem", display: "inline-block" }}>
        {importing ? "导入中..." : "导入 Excel"}
        <input type="file" accept=".xlsx,.xls" onChange={handleImport} disabled={importing} style={{ display: "none" }} />
      </label>
      {msg && <span style={{ fontSize: "0.75rem", color: msg.ok ? "#4ade80" : "#ef4444" }}>{msg.text}</span>}
    </div>
  );
}

// ========== Questions Tab ==========
const LANG_TABS = [
  { code: "zh-CN", label: "中文" },
  { code: "en", label: "EN" },
  { code: "ja", label: "JA" },
  { code: "zh-TW", label: "繁體" },
] as const;
type EditLocale = (typeof LANG_TABS)[number]["code"];

function LangSwitcher({ value, onChange }: { value: EditLocale; onChange: (l: EditLocale) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: "0.5rem", background: "rgba(255,255,255,0.03)", borderRadius: 4, padding: 2, width: "fit-content" }}>
      {LANG_TABS.map((l) => (
        <button key={l.code} onClick={() => onChange(l.code)}
          style={{ background: value === l.code ? "rgba(212,175,55,0.15)" : "transparent", border: "none", color: value === l.code ? "#d4af37" : "rgba(255,255,255,0.3)", padding: "0.25rem 0.7rem", borderRadius: 3, fontSize: "0.75rem", cursor: "pointer", fontWeight: value === l.code ? 700 : 400 }}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

function QuestionsTab({ api }: { api: (path: string, opts?: RequestInit) => Promise<Response> }) {
  const [questions, setQuestions] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Rec | null>(null);
  const [editLocale, setEditLocale] = useState<EditLocale>("zh-CN");
  const [saving, setSaving] = useState(false);

  const fetchQ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/questions");
      const data = await res.json();
      setQuestions(data);
    } catch { } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchQ(); }, [fetchQ]);

  const startEdit = (q: Rec) => {
    setEditing(q.id as number);
    setEditData(JSON.parse(JSON.stringify(q)));
    setEditLocale("zh-CN");
  };

  const saveQuestion = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await api(`/questions/${editData.id}`, {
        method: "PUT",
        body: JSON.stringify(editData),
      });
      setEditing(null);
      setEditData(null);
      fetchQ();
    } catch { } finally { setSaving(false); }
  };

  const updateOption = (optIdx: number, field: string, value: string | number) => {
    if (!editData) return;
    const opts = [...(editData.options as Rec[])];
    opts[optIdx] = { ...opts[optIdx], [field]: value };
    setEditData({ ...editData, options: opts });
  };

  // Get locale-specific question text
  const getLocaleText = (): string => {
    if (!editData) return "";
    if (editLocale === "zh-CN") return editData.text as string;
    try {
      const trans = JSON.parse((editData.translations as string) || "{}");
      return trans[editLocale]?.text || "";
    } catch { return ""; }
  };

  const getLocaleMeta = (): string => {
    if (!editData) return "";
    if (editLocale === "zh-CN") return editData.meta as string;
    try {
      const trans = JSON.parse((editData.translations as string) || "{}");
      return trans[editLocale]?.meta || "";
    } catch { return ""; }
  };

  const getLocaleOptions = (): string[] => {
    if (!editData) return [];
    if (editLocale === "zh-CN") return (editData.options as Rec[]).map((o) => o.label as string);
    try {
      const trans = JSON.parse((editData.translations as string) || "{}");
      const baseCount = (editData.options as Rec[]).length;
      const opts: string[] = trans[editLocale]?.options || [];
      // Pad to match base options count
      while (opts.length < baseCount) opts.push("");
      return opts;
    } catch { return (editData.options as Rec[]).map(() => ""); }
  };

  const setLocaleField = (field: "text" | "meta", value: string) => {
    if (!editData) return;
    if (editLocale === "zh-CN") {
      setEditData({ ...editData, [field]: value });
    } else {
      try {
        const trans = JSON.parse((editData.translations as string) || "{}");
        if (!trans[editLocale]) trans[editLocale] = {};
        trans[editLocale][field] = value;
        setEditData({ ...editData, translations: JSON.stringify(trans) });
      } catch { /* ignore */ }
    }
  };

  const setLocaleOption = (idx: number, value: string) => {
    if (!editData) return;
    if (editLocale === "zh-CN") {
      updateOption(idx, "label", value);
    } else {
      try {
        const trans = JSON.parse((editData.translations as string) || "{}");
        if (!trans[editLocale]) trans[editLocale] = {};
        const baseCount = (editData.options as Rec[]).length;
        if (!trans[editLocale].options) trans[editLocale].options = Array(baseCount).fill("");
        while (trans[editLocale].options.length < baseCount) trans[editLocale].options.push("");
        trans[editLocale].options[idx] = value;
        setEditData({ ...editData, translations: JSON.stringify(trans) });
      } catch { /* ignore */ }
    }
  };

  if (loading) return <div style={{ color: "rgba(255,255,255,0.3)" }}>加载中...</div>;

  const localeText = getLocaleText();
  const localeMeta = getLocaleMeta();
  const localeOptions = getLocaleOptions();

  return (
    <div>
      <ExcelToolbar api={api} onImported={fetchQ} />
      {questions.map((q) => (
        <div key={q.id as number} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, marginBottom: "0.75rem", padding: "1rem" }}>
          {editing === (q.id as number) && editData ? (
            <div>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: "#d4af37", fontSize: "0.8rem", fontWeight: 700 }}>#{editData.order as number}</span>
                <input value={editData.dim as string} onChange={(e) => setEditData({ ...editData, dim: e.target.value })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem 0.5rem", color: "#e6e6e6", fontSize: "0.8rem", width: 60 }} />
                <input value={editData.type as string} onChange={(e) => setEditData({ ...editData, type: e.target.value })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem 0.5rem", color: "#e6e6e6", fontSize: "0.8rem", width: 80 }} />
              </div>

              <LangSwitcher value={editLocale} onChange={setEditLocale} />

              <input value={localeMeta} onChange={(e) => setLocaleField("meta", e.target.value)} placeholder="meta" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem 0.5rem", color: "#e6e6e6", fontSize: "0.8rem", marginBottom: "0.4rem" }} />
              <textarea value={localeText} onChange={(e) => setLocaleField("text", e.target.value)} rows={3} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.5rem", color: "#e6e6e6", fontSize: "0.8rem", marginBottom: "0.5rem", resize: "vertical" }} />

              <div style={{ fontSize: "0.75rem" }}>
                {localeOptions.map((label, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.3)", width: 20 }}>{i + 1}.</span>
                    <textarea value={label} onChange={(e) => setLocaleOption(i, e.target.value)} rows={1} style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.75rem" }} />
                    {editLocale === "zh-CN" && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem" }}>分</span>
                        <input type="number" value={(editData.options as Rec[])[i]?.score as number ?? 0} onChange={(e) => updateOption(i, "score", parseInt(e.target.value) || 0)} style={{ width: 50, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#d4af37", fontSize: "0.75rem", textAlign: "center" }} />
                      </>
                    )}
                    {editLocale === "zh-CN" && (editData.type === "gate" || editData.type === "trigger") && (
                      <input value={((editData.options as Rec[])[i]?.value as string) || ((editData.options as Rec[])[i]?.trigger as string) || ""} onChange={(e) => updateOption(i, editData.type === "gate" ? "value" : "trigger", e.target.value)} placeholder={editData.type === "gate" ? "value" : "trigger"} style={{ width: 100, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.7rem" }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button onClick={saveQuestion} disabled={saving} style={{ background: "#d4af37", color: "#050308", border: "none", borderRadius: 4, padding: "0.4rem 1rem", fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>{saving ? "保存中..." : "保存"}</button>
                <button onClick={() => { setEditing(null); setEditData(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 4, padding: "0.4rem 1rem", fontSize: "0.8rem", cursor: "pointer" }}>取消</button>
              </div>
            </div>
          ) : (
            <div onClick={() => startEdit(q)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ color: "#d4af37", fontSize: "0.8rem", fontWeight: 700 }}>#{q.order as number}</span>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>{q.dim as string}</span>
                {(q.type as string) !== "normal" && <span style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", fontSize: "0.65rem", padding: "0.1rem 0.5rem", borderRadius: 999 }}>{q.type as string}</span>}
                {(q.meta as string) && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>{q.meta as string}</span>}
              </div>
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{(q.text as string).slice(0, 80)}...</div>
              <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.2)", marginTop: "0.3rem" }}>
                {(q.options as Rec[]).map((o, i) => (
                  <span key={i} style={{ marginRight: "1rem" }}>{i + 1}. 分={o.score as number} </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ========== Types Tab ==========
function TypesTab({ api }: { api: (path: string, opts?: RequestInit) => Promise<Response> }) {
  const [types, setTypes] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Rec | null>(null);
  const [editLocale, setEditLocale] = useState<EditLocale>("zh-CN");
  const [saving, setSaving] = useState(false);

  const fetchT = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/types");
      const data = await res.json();
      setTypes(data);
    } catch { } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchT(); }, [fetchT]);

  const startEdit = (t: Rec) => {
    setEditing(t.id as number);
    setEditData(JSON.parse(JSON.stringify(t)));
    setEditLocale("zh-CN");
  };

  const saveType = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      await api(`/types/${editData.id}`, { method: "PUT", body: JSON.stringify(editData) });
      setEditing(null); setEditData(null); fetchT();
    } catch { } finally { setSaving(false); }
  };

  const getTypeField = (field: string): string => {
    if (!editData) return "";
    if (editLocale === "zh-CN") return (editData[field] as string) || "";
    try {
      const trans = JSON.parse((editData.translations as string) || "{}");
      return trans[editLocale]?.[field] || "";
    } catch { return ""; }
  };

  const setTypeField = (field: string, value: string) => {
    if (!editData) return;
    if (editLocale === "zh-CN") {
      setEditData({ ...editData, [field]: value });
    } else {
      try {
        const trans = JSON.parse((editData.translations as string) || "{}");
        if (!trans[editLocale]) trans[editLocale] = {};
        trans[editLocale][field] = value;
        setEditData({ ...editData, translations: JSON.stringify(trans) });
      } catch { /* ignore */ }
    }
  };

  if (loading) return <div style={{ color: "rgba(255,255,255,0.3)" }}>加载中...</div>;

  return (
    <div>
      <ExcelToolbar api={api} onImported={fetchT} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.75rem" }}>
      {types.map((t) => (
        <div key={t.id as number} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "1rem" }}>
          {editing === (t.id as number) && editData ? (
            <div>
              {editLocale === "zh-CN" && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <input value={editData.code as string} onChange={(e) => setEditData({ ...editData, code: e.target.value })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.8rem", width: 80 }} />
                  <input value={editData.group as string} onChange={(e) => setEditData({ ...editData, group: e.target.value })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.8rem", width: 60 }} />
                  <input value={editData.vector as string} onChange={(e) => setEditData({ ...editData, vector: e.target.value })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#d4af37", fontSize: "0.8rem", width: 160 }} />
                </div>
              )}

              <LangSwitcher value={editLocale} onChange={setEditLocale} />

              <input value={getTypeField("name")} onChange={(e) => setTypeField("name", e.target.value)} placeholder="名称" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.8rem", marginBottom: "0.3rem" }} />
              <input value={getTypeField("subtitle") || ""} onChange={(e) => setTypeField("subtitle", e.target.value)} placeholder="副标题" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.8rem", marginBottom: "0.3rem" }} />
              <input value={getTypeField("slogan")} onChange={(e) => setTypeField("slogan", e.target.value)} placeholder="标语" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.8rem", marginBottom: "0.3rem" }} />
              <textarea value={getTypeField("desc")} onChange={(e) => setTypeField("desc", e.target.value)} rows={3} placeholder="描述" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.75rem", marginBottom: "0.3rem", resize: "vertical" }} />
              <input value={getTypeField("keywords") || ""} onChange={(e) => setTypeField("keywords", e.target.value)} placeholder="关键词" style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "0.3rem", color: "#e6e6e6", fontSize: "0.75rem", marginBottom: "0.5rem" }} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={saveType} disabled={saving} style={{ background: "#d4af37", color: "#050308", border: "none", borderRadius: 4, padding: "0.4rem 1rem", fontSize: "0.8rem", cursor: "pointer", fontWeight: 700 }}>{saving ? "保存中..." : "保存"}</button>
                <button onClick={() => { setEditing(null); setEditData(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 4, padding: "0.4rem 1rem", fontSize: "0.8rem", cursor: "pointer" }}>取消</button>
              </div>
            </div>
          ) : (
            <div onClick={() => startEdit(t)} style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <span style={{ color: "#d4af37", fontSize: "0.9rem", fontWeight: 700 }}>{t.name as string}</span>
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem" }}>{t.code as string}</span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", marginBottom: "0.3rem" }}>{t.slogan as string}</div>
              <div style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.65rem" }}>{t.vector as string}</div>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}
