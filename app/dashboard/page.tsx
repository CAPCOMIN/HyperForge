import { DashboardClient } from "@/components/DashboardClient";
import { repositories } from "@/lib/persistence/repositories";

export default function DashboardPage() {
  return <DashboardClient runs={repositories.listRuns()} />;
}
