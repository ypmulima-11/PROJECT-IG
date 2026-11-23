import type { Metadata } from "next";
import type { Viewport } from "next";
import { RegisterServiceWorker } from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project IG",
  description: "Daily sales, live sessions, and router health for your hotspot locations.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#202b28" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<RegisterServiceWorker /></body></html>;
}
