import { DashboardClient } from "@/components/DashboardClient";
import { requireSessionUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: Promise<{ owner?: string }>;
}) {
  const sessionUser = await requireSessionUser("/dashboard");
  const owner = (await searchParams)?.owner;
  const users = sessionUser.role === "admin" ? repositories.listUsers() : [];
  const ownerUserId =
    sessionUser.role === "admin"
      ? owner || undefined
      : sessionUser.id;
  const runs = repositories.listRuns(ownerUserId ? { userId: ownerUserId } : undefined);

  return (
    <DashboardClient
      runs={runs}
      users={users}
      selectedOwnerId={ownerUserId ?? null}
      isAdmin={sessionUser.role === "admin"}
    />
  );
}
