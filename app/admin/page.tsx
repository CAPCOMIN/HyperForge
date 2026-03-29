import { AdminConsole } from "@/components/AdminConsole";
import { getRuntimeConfig } from "@/lib/config/runtime";
import { requireAdminUser } from "@/lib/auth/session";
import { repositories } from "@/lib/persistence/repositories";

export default async function AdminPage() {
  const sessionUser = await requireAdminUser("/admin");
  const users = repositories.listUsers().map((user) => ({
    ...user,
    quota: repositories.getUserQuotaSnapshot(user.id)
  }));
  const settings = getRuntimeConfig();
  const inviteCodes = repositories.listInviteCodes();
  const runs = repositories.listRuns().slice(0, 24);

  return (
    <AdminConsole
      sessionUser={sessionUser}
      users={users}
      settings={settings}
      inviteCodes={inviteCodes}
      recentRuns={runs}
    />
  );
}
