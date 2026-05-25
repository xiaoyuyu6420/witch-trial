import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC } from "next/font/google";
import { Cinzel } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AppShell from "@/components/AppShell";
import "./globals.css";

const notoSerif = Noto_Serif_SC({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["300", "500", "700"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#030303",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"), // TODO: replace with prod domain before launch
  title: "魔女审判 | WITCH TRIAL — 魔法少女人格测试",
  description: "在因子侵蚀的尽头，审判等待着你。十三名预备魔女，一座孤岛监牢。测测你会被审判为谁？魔女审判人格测试，探索属于你的魔女原型。",
  keywords: ["魔女审判", "人格测试", "魔法少女", "性格测试", "Witch Trial", "personality test", "MBTI"],
  authors: [{ name: "Witch Trial" }],
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: "魔女审判 | WITCH TRIAL",
    description: "十三名预备魔女，一座孤岛监牢。测测你会被审判为谁？",
    type: "website",
    locale: "zh_CN",
    alternateLocale: ["zh_TW", "en_US", "ja_JP"],
    siteName: "Witch Trial",
  },
  twitter: {
    card: "summary_large_image",
    title: "魔女审判 | WITCH TRIAL",
    description: "十三名预备魔女，一座孤岛监牢。测测你会被审判为谁？",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    title: "魔女审判",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSerif.variable} ${cinzel.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-noto-serif)]">
        <GoogleAnalytics />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
