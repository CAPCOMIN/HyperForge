"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

type AuthMode = "login" | "register";

interface VerificationChallenge {
  code: string;
  expiresInSeconds: number;
}

const initialChallenge: VerificationChallenge = {
  code: "",
  expiresInSeconds: 300
};

export function LoginScreen({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [challenge, setChallenge] = useState<VerificationChallenge>(initialChallenge);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshingCode, setIsRefreshingCode] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function refreshVerificationCode() {
    setIsRefreshingCode(true);

    try {
      const response = await fetch("/api/auth/verification-code", {
        cache: "no-store"
      });
      const data = (await response.json().catch(() => null)) as VerificationChallenge | null;

      if (!response.ok || !data?.code) {
        throw new Error("verification_failed");
      }

      setChallenge(data);
    } catch {
      setError(t("loginGenericError"));
    } finally {
      setIsRefreshingCode(false);
    }
  }

  useEffect(() => {
    if (mode === "register" && !challenge.code) {
      void refreshVerificationCode();
    }
  }, [challenge.code, mode]);

  const metaCards = useMemo(
    () => [
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
    ],
    [t]
  );

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
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

  function mapRegisterError(code?: string) {
    switch (code) {
      case "invite_invalid":
        return t("loginInviteInvalid");
      case "invite_unavailable":
        return t("loginInviteUnavailable");
      case "invite_expired":
        return t("loginInviteExpired");
      case "invite_exhausted":
        return t("loginInviteExhausted");
      case "username_taken":
        return t("loginUsernameTaken");
      case "verification_invalid":
        return t("loginVerificationMismatch");
      default:
        return t("loginRegisterGenericError");
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError(t("loginPasswordMismatch"));
      return;
    }

    if (!challenge.code || verificationCode.trim().toUpperCase() !== challenge.code) {
      setError(t("loginVerificationMismatch"));
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        verificationCode: verificationCode.trim().toUpperCase(),
        inviteCode,
        username,
        displayName,
        password
      })
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      next?: string;
    };

    if (!response.ok) {
      setError(mapRegisterError(data.error));
      if (data.error === "verification_invalid") {
        void refreshVerificationCode();
      }
      return;
    }

    startTransition(() => {
      router.replace((data.next ?? "/") as never);
      router.refresh();
    });
  }

  return (
    <div className="grid min-h-[calc(100vh-132px)] gap-5 lg:grid-cols-[minmax(0,1.1fr)_500px]">
      <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(236,244,255,0.92))] p-8 shadow-[0_24px_90px_rgba(15,23,42,0.10)] transition-colors duration-300 sm:p-10 dark:border-slate-800/70 dark:bg-[linear-gradient(145deg,rgba(12,19,33,0.96),rgba(15,23,42,0.92))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,94,239,0.14),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(15,157,88,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.06),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.18),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(74,222,128,0.11),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.28),transparent_30%)]" />
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
            {metaCards.map((item) => (
              <article
                key={item.title}
                className="rounded-[28px] border border-white/80 bg-white/80 p-5 backdrop-blur-xl transition-colors duration-300 dark:border-slate-700/70 dark:bg-slate-900/82"
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

      <section className="rounded-[36px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,247,251,0.96))] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors duration-300 sm:p-8 dark:border-slate-800/70 dark:bg-[linear-gradient(180deg,rgba(10,18,30,0.96),rgba(12,19,33,0.96))]">
        <div className="rounded-[28px] border border-line/70 bg-white/90 p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)] transition-colors duration-300 dark:bg-slate-900/84">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                  {t("loginAccountBadge")}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
                  {t("loginPanelTitle")}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-7 text-steel">
                  {mode === "login" ? t("loginPanelBody") : t("loginRegisterHint")}
                </p>
              </div>
              <div className="inline-flex rounded-full border border-line/70 bg-mist p-1 dark:bg-slate-950/70">
                {([
                  ["login", t("loginTabSignIn")],
                  ["register", t("loginTabRegister")]
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMode(value);
                      setError(null);
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      mode === value
                        ? "bg-white text-ink shadow-sm dark:bg-slate-800"
                        : "text-steel hover:text-ink"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-steel/72">
              <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-line/70 bg-mist px-3 py-2 text-center whitespace-nowrap dark:bg-slate-950/70">
                {t("loginMetaProtected")}
              </span>
              <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-line/70 bg-mist px-3 py-2 text-center whitespace-nowrap dark:bg-slate-950/70">
                {t("loginMetaRealtime")}
              </span>
              <span className="inline-flex min-w-0 items-center justify-center rounded-full border border-line/70 bg-mist px-3 py-2 text-center whitespace-nowrap dark:bg-slate-950/70">
                {t("loginMetaDeliverables")}
              </span>
            </div>
          </div>
        </div>

        {mode === "login" ? (
          <form className="mt-6 space-y-5" onSubmit={handleLoginSubmit}>
            <AuthInput
              id="username"
              label={t("loginUsername")}
              autoComplete="username"
              value={username}
              onChange={setUsername}
              placeholder={t("loginUsernamePlaceholder")}
            />

            <AuthInput
              id="password"
              type="password"
              label={t("loginPassword")}
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              placeholder={t("loginPasswordPlaceholder")}
            />

            <FeedbackCard message={error ?? t("loginHint")} tone={error ? "error" : "neutral"} />

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center rounded-[22px] bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-ink/92 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t("loginSubmitting") : t("loginSubmit")}
            </button>
          </form>
        ) : (
          <form className="mt-6 space-y-5" onSubmit={handleRegisterSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <AuthInput
                id="displayName"
                label={t("loginDisplayName")}
                autoComplete="name"
                value={displayName}
                onChange={setDisplayName}
                placeholder={t("loginDisplayNamePlaceholder")}
              />
              <AuthInput
                id="register-username"
                label={t("loginUsername")}
                autoComplete="username"
                value={username}
                onChange={setUsername}
                placeholder={t("loginUsernamePlaceholder")}
              />
              <AuthInput
                id="register-password"
                type="password"
                label={t("loginPassword")}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
                placeholder={t("loginPasswordPlaceholder")}
              />
              <AuthInput
                id="passwordConfirm"
                type="password"
                label={t("loginPasswordConfirm")}
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                placeholder={t("loginPasswordConfirmPlaceholder")}
              />
              <AuthInput
                id="inviteCode"
                label={t("loginInviteCode")}
                autoComplete="off"
                value={inviteCode}
                onChange={(next) => setInviteCode(next.toUpperCase())}
                placeholder={t("loginInviteCodePlaceholder")}
              />
              <AuthInput
                id="verificationCode"
                label={t("loginVerificationCode")}
                autoComplete="off"
                value={verificationCode}
                onChange={(next) => setVerificationCode(next.toUpperCase())}
                placeholder={t("loginVerificationPlaceholder")}
              />
            </div>

            <div className="rounded-[24px] border border-line/70 bg-mist/70 p-4 dark:bg-slate-950/72">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel/75">
                    {t("loginVerificationPrompt")}
                  </p>
                  <p className="mt-2 font-mono text-2xl font-semibold tracking-[0.34em] text-ink">
                    {challenge.code || "·····"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void refreshVerificationCode()}
                  disabled={isRefreshingCode}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-steel transition hover:border-accent/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900/88"
                >
                  {isRefreshingCode
                    ? `${t("loginVerificationRefresh")}...`
                    : t("loginVerificationRefresh")}
                </button>
              </div>
            </div>

            <FeedbackCard
              message={error ?? t("loginRegisterHint")}
              tone={error ? "error" : "neutral"}
            />

            <button
              type="submit"
              disabled={isPending || isRefreshingCode}
              className="inline-flex w-full items-center justify-center rounded-[22px] bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:bg-ink/92 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t("loginRegisterSubmitting") : t("loginRegisterSubmit")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function AuthInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-ink" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-[22px] border border-line bg-white px-4 py-3.5 text-sm text-ink outline-none transition focus:border-accent/40 focus:ring-4 focus:ring-accent/10 dark:bg-slate-900/88"
        placeholder={placeholder}
      />
    </div>
  );
}

function FeedbackCard({
  message,
  tone
}: {
  message: string;
  tone: "neutral" | "error";
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-4 py-3 text-sm transition",
        tone === "error"
          ? "border-warning/25 bg-warning/8 text-warning"
          : "border-line/70 bg-mist/70 text-steel dark:bg-slate-950/72"
      )}
    >
      {message}
    </div>
  );
}
