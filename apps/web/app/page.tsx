import { Dashboard } from "@/components/Dashboard";
import { demoSnapshot } from "@/lib/demo-data";

export default function Home() {
  return <Dashboard initialSnapshot={demoSnapshot} initialUpdatedAt={new Date().toISOString()} />;
}

