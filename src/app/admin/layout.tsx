export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#050308", color: "#e6e6e6", fontFamily: "'Noto Serif SC', serif" }}>
      {children}
    </div>
  );
}
