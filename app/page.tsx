import { HomeWorkspace } from "@/components/HomeWorkspace";
import { requireSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";

export default async function HomePage() {
  await requireSessionUser("/");
  const recentRuns = repositories.listRuns().slice(0, 8);

  return <HomeWorkspace recentRuns={recentRuns} />;
}
