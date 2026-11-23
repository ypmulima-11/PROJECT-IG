import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const appRoot = `${basePath}/`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Project IG Hotspot Management",
    short_name: "Project IG",
    description: "Hotspot sales ledger and session controls.",
    start_url: appRoot,
    scope: appRoot,
    display: "standalone",
    background_color: "#f4f3ef",
    theme_color: "#202b28",
    icons: [{ src: `${basePath}/brand.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

