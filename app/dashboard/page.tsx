import { DashboardClient } from "@/components/DashboardClient";
import { requireSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";

export default async function DashboardPage() {
  await requireSessionUser("/dashboard");
  return <DashboardClient runs={repositories.listRuns()} />;
}
