import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { getSessionUser, resolveSafeNextPath } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{
    next?: string;
  }>;
}) {
  const nextPath = resolveSafeNextPath((await searchParams)?.next);
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    redirect(nextPath as never);
  }

  return <LoginScreen nextPath={nextPath} />;
}
