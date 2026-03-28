import { HomeWorkspace } from "@/components/HomeWorkspace";
import { repositories } from "@/lib/persistence/repositories";

export default function HomePage() {
  const recentRuns = repositories.listRuns().slice(0, 8);

  return <HomeWorkspace recentRuns={recentRuns} />;
}
