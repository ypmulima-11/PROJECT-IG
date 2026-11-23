import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const pagesBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/PROJECT-IG";

const nextConfig: NextConfig = isGitHubPages
  ? {
      output: "export",
      basePath: pagesBasePath,
      trailingSlash: true,
    }
  : {
      async rewrites() {
        return [{ source: "/api/:path*", destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/:path*` }];
      },
    };

export default nextConfig;

