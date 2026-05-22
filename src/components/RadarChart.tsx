interface RadarDataPoint {
  dimension: string;
  user: number;
  template: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  templateName: string;
  youLabel: string;
}

export default function RadarChart({ data, templateName, youLabel }: RadarChartProps) {
  const n = data.length;
  const cx = 200, cy = 200, r = 150;
  const levels = [0.33, 0.66, 1];
  const angleStep = (2 * Math.PI) / n;
  const toRad = (deg: number) => deg - Math.PI / 2;

  const pt = (i: number, val: number) => {
    const a = toRad(i * angleStep);
    const ratio = val / 3;
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) };
  };

  return (
    <div style={{ width: "100%", marginBottom: "1.5rem" }}>
      <svg viewBox="0 0 400 400" width="100%" style={{ maxWidth: 360, display: "block", margin: "0 auto" }}>
        {levels.map((level, li) => (
          <polygon key={li}
            points={Array.from({ length: n }, (_, i) => {
              const a = toRad(i * angleStep);
              return `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`;
            }).join(" ")}
            fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1"
          />
        ))}
        {Array.from({ length: n }, (_, i) => {
          const a = toRad(i * angleStep);
          return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="rgba(0,0,0,0.04)" strokeWidth="1" />;
        })}
        <polygon
          points={data.map((d, i) => { const p = pt(i, d.template); return `${p.x},${p.y}`; }).join(" ")}
          fill="rgba(139,0,0,0.06)" stroke="#8b0000" strokeWidth="1.5" strokeDasharray="4 2"
        />
        <polygon
          points={data.map((d, i) => { const p = pt(i, d.user); return `${p.x},${p.y}`; }).join(" ")}
          fill="rgba(10,10,10,0.1)" stroke="#0a0a0a" strokeWidth="2"
        />
        {data.map((d, i) => {
          const a = toRad(i * angleStep);
          const lx = cx + (r + 24) * Math.cos(a);
          const ly = cy + (r + 24) * Math.sin(a);
          const anchor = Math.abs(Math.cos(a)) < 0.1 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
          return <text key={i} x={lx} y={ly} textAnchor={anchor} dominantBaseline="central" fontSize="10" fill="#888" fontFamily="'Noto Serif SC', serif">{d.dimension}</text>;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "0.3rem", fontSize: "0.7rem", color: "#888" }}>
        <span><span style={{ display: "inline-block", width: 14, height: 2, background: "#0a0a0a", verticalAlign: "middle", marginRight: 5 }} />{youLabel}</span>
        <span><span style={{ display: "inline-block", width: 14, height: 0, borderTop: "2px dashed #8b0000", verticalAlign: "middle", marginRight: 5 }} />{templateName}</span>
      </div>
    </div>
  );
}
