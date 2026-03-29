import { HomeWorkspace } from "@/components/HomeWorkspace";
import { requireSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";

export default async function HomePage() {
  const sessionUser = await requireSessionUser("/");
  const recentRuns = repositories.listRuns({ userId: sessionUser.id }).slice(0, 8);

  return <HomeWorkspace recentRuns={recentRuns} sessionUser={sessionUser} />;
}
