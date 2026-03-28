"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  defaultLocale,
  messages,
  type AppLocale,
  type MessageKey
} from "@/lib/i18n/messages";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: MessageKey) => string;
  formatDateTime: (value: string | null | undefined) => string;
  formatRelativeDuration: (startedAt: string, finishedAt?: string | null) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    const stored = window.localStorage.getItem("hyperforge.locale");
    if (stored === "zh-CN" || stored === "en") {
      setLocaleState(stored);
      return;
    }

    const browserLocale = navigator.language.toLowerCase();
    setLocaleState(browserLocale.startsWith("zh") ? "zh-CN" : "en");
  }, []);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    window.localStorage.setItem("hyperforge.locale", nextLocale);
  }, []);

  const t = useCallback(
    (key: MessageKey) => messages[locale][key] ?? messages[defaultLocale][key],
    [locale]
  );

  const formatDateTime = useCallback(
    (value: string | null | undefined) => {
      if (!value) {
        return "—";
      }

      return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(value));
    },
    [locale]
  );

  const formatRelativeDuration = useCallback(
    (startedAt: string, finishedAt?: string | null) => {
      const start = new Date(startedAt).getTime();
      const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
      const diffMs = Math.max(end - start, 0);
      const totalSeconds = Math.round(diffMs / 1000);

      if (totalSeconds < 60) {
        return `${totalSeconds}${t("durationSeconds")}`;
      }

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes}${t("durationMinutes")} ${seconds}${t("durationSeconds")}`;
    },
    [t]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatDateTime,
      formatRelativeDuration
    }),
    [formatDateTime, formatRelativeDuration, locale, setLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }

  return context;
}
