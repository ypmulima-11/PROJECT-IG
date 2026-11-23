import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Project IG Hotspot Management",
    short_name: "Project IG",
    description: "Hotspot sales ledger and live session controls.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3ef",
    theme_color: "#202b28",
    icons: [{ src: "/brand.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
