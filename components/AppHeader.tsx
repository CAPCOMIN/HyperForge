"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

export function AppHeader() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLocale();

  const links = [
    {
      href: "/" as const,
      label: t("navWorkspace")
    },
    {
      href: "/dashboard" as const,
      label: t("navDashboard")
    }
  ];

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
    </header>
  );
}
