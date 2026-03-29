"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

export function AppHeader({
  sessionUser
}: {
  sessionUser: {
    username: string;
    displayName: string;
  } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const links = sessionUser
    ? [
        {
          href: "/" as const,
          label: t("navWorkspace")
        },
        {
          href: "/dashboard" as const,
          label: t("navDashboard")
        }
      ]
    : [];

  async function handleLogout() {
    setLogoutError(null);
    const response = await fetch("/api/auth/logout", {
      method: "POST"
    });

    if (!response.ok) {
      setLogoutError(t("logoutError"));
      return;
    }

    startTransition(() => {
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1560px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-sm font-semibold text-white">
                HF
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">
                  {t("appTitle")}
                </p>
                <p className="truncate text-xs text-steel/80">
                  {t("appTagline")}
                </p>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition",
                    active
                      ? "bg-ink text-white"
                      : "text-steel hover:bg-mist"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {sessionUser ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-full border border-line/70 bg-mist/80 px-3 py-2 text-right sm:px-4">
                <div className="whitespace-nowrap text-xs font-semibold tracking-tight text-ink sm:text-sm">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-steel/75">
                    {t("headerSignedIn")}
                  </span>
                  <span className="mx-2 text-steel/45">/</span>
                  <span>{sessionUser.displayName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-steel transition hover:border-accent/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:text-sm"
              >
                {isPending ? t("logoutSubmitting") : t("logoutAction")}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-steel transition hover:border-accent/30 hover:text-ink md:inline-flex"
            >
              {t("loginNav")}
            </Link>
          )}

          <div className="hidden text-xs text-steel/70 sm:block">
            {t("languageLabel")}
          </div>
          <div className="flex rounded-full border border-line bg-mist p-1">
            {(["zh-CN", "en"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setLocale(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  locale === value
                    ? "bg-white text-ink shadow-sm"
                    : "text-steel hover:text-ink"
                )}
              >
                {value === "zh-CN" ? "中文" : "EN"}
              </button>
            ))}
          </div>
        </div>
      </div>
      {logoutError ? (
        <div className="mx-auto w-full max-w-[1560px] px-4 pb-3 text-right text-xs text-warning sm:px-6">
          {logoutError}
        </div>
      ) : null}
    </header>
  );
}
