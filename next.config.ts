import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  output: "standalone",
  async rewrites() {
    return [
      // Serve the static welcome page directly at "/" — bypasses React/Next runtime
      // for the landing experience to keep TTI minimal. The quiz lives at /test.
      { source: "/", destination: "/index.html" },
    ];
  },
};

export default nextConfig;
