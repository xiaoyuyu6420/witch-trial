"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#d4af37", "#8b0000", "#6b21a8", "#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#f43f5e", "#84cc16", "#a855f7"];

export default function DashboardTab({ api }: { api: (path: string, opts?: RequestInit) => Promise<Response> }) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/stats")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [api]);

  if (loading) return <div style={{ color: "rgba(255,255,255,0.3)" }}>加载中...</div>;
  if (!stats) return <div style={{ color: "#ef4444" }}>加载失败</div>;

  const typeDist = (stats.typeDistribution as { resultCode: string; _count: number }[]) || [];
  const dailyTrends = ((stats.dailyTrends as { day: string; count: number }[]) || []).reverse();
  const gateDist = (stats.gateDistribution as { gateValue: string; _count: number }[]) || [];
  const recent = (stats.recentActivity as Record<string, unknown>[]) || [];

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {[
          { label: "总参与人数", value: stats.totalParticipants as number, color: "#d4af37" },
          { label: "今日新增", value: stats.todayCount as number, color: "#22c55e" },
          { label: "平均相似度", value: `${((stats.avgSimilarity as number) || 0).toFixed(1)}%`, color: "#0ea5e9" },
          { label: "类型数", value: typeDist.length, color: "#a855f7" },
        ].map((c) => (
          <div key={c.label} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "1rem" }}>
            <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", marginBottom: "0.3rem" }}>{c.label}</div>
            <div style={{ color: c.color, fontSize: "1.5rem", fontWeight: 700 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Type Distribution */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "1rem" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "0.75rem" }}>类型分布</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={typeDist.map((t) => ({ name: t.resultCode, count: t._count }))}>
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e6e6e6", fontSize: "0.75rem" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {typeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Trends */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "1rem" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "0.75rem" }}>每日趋势（近30天）</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyTrends.map((d) => ({ name: (d.day || "unknown").slice(5), count: d.count }))}>
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e6e6e6", fontSize: "0.75rem" }} />
              <Line type="monotone" dataKey="count" stroke="#d4af37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gate + Recent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
        {/* Gate Distribution */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "1rem" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "0.75rem" }}>门控选择分布</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={gateDist.map((g) => ({ name: g.gateValue, value: g._count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={false}>
                {gateDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1a1028", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e6e6e6", fontSize: "0.75rem" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "1rem" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: "0.75rem" }}>最近活动</div>
          <div style={{ fontSize: "0.75rem" }}>
            {recent.map((r) => (
              <div key={r.id as number} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>#{r.id as number}</span>
                  <span style={{ color: "#d4af37", marginLeft: "0.75rem" }}>{r.resultCode as string}</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", marginLeft: "0.75rem" }}>{(r.similarity as number).toFixed(1)}%</span>
                  {r.duration != null && <span style={{ color: "rgba(255,255,255,0.2)", marginLeft: "0.75rem" }}>{Math.round((r.duration as number) / 1000)}s</span>}
                </div>
                <div style={{ color: "rgba(255,255,255,0.2)" }}>{r.ipAddress as string || "-"} · {new Date(r.createdAt as string).toLocaleString("zh-CN")}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
