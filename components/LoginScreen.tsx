"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

export function LoginScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username,
        password,
        next: nextPath
      })
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      next?: string;
    };

    if (!response.ok) {
      setError(
        data.error === "invalid_credentials"
          ? t("loginInvalidCredentials")
          : t("loginGenericError")
      );
      return;
    }

    startTransition(() => {
      router.replace((data.next ?? nextPath) as never);
      router.refresh();
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-132px)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_460px]">
      <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(236,244,255,0.92))] p-8 shadow-[0_24px_90px_rgba(15,23,42,0.10)] sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,94,239,0.14),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(15,157,88,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_28%)]" />
        <div className="relative z-10 flex h-full flex-col justify-between gap-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {t("loginHeroBadge")}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-5xl">
              {t("loginHeading")}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-steel">
              {t("loginSubheading")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: t("loginFeatureSecurity"),
                body: t("loginFeatureSecurityBody")
              },
              {
                title: t("loginFeatureCoordination"),
                body: t("loginFeatureCoordinationBody")
              },
              {
                title: t("loginFeatureDelivery"),
                body: t("loginFeatureDeliveryBody")
              }
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/80 bg-white/80 p-5 backdrop-blur-xl"
              >
                <p className="text-sm font-semibold tracking-tight text-ink">
                  {item.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-steel">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,251,0.96))] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
        <div className="rounded-[28px] border border-line/70 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {t("loginAccountBadge")}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                {t("loginPanelTitle")}
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-7 text-steel">
                {t("loginPanelBody")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-steel/72">
              <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-line/70 bg-mist px-3 py-2 text-center whitespace-nowrap">
                {t("loginMetaProtected")}
              </span>
              <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-line/70 bg-mist px-3 py-2 text-center whitespace-nowrap">
                {t("loginMetaRealtime")}
              </span>
              <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-line/70 bg-mist px-3 py-2 text-center whitespace-nowrap">
                {t("loginMetaDeliverables")}
              </span>
            </div>
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="username">
              {t("loginUsername")}
            </label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-[22px] border border-line bg-white px-4 py-3.5 text-sm text-ink outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              placeholder={t("loginUsernamePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink" htmlFor="password">
              {t("loginPassword")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-[22px] border border-line bg-white px-4 py-3.5 text-sm text-ink outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10"
              placeholder={t("loginPasswordPlaceholder")}
            />
          </div>

          <div
            className={cn(
              "rounded-[22px] border px-4 py-3 text-sm transition",
              error
                ? "border-warning/25 bg-warning/8 text-warning"
                : "border-line/70 bg-mist/70 text-steel"
            )}
          >
            {error ?? t("loginHint")}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center rounded-[22px] bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-ink/92 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("loginSubmitting") : t("loginSubmit")}
          </button>
        </form>
      </section>
    </div>
  );
}
