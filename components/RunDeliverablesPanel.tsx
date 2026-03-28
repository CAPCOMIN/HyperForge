"use client";

import { useEffect, useMemo, useState } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useLocale } from "@/components/providers/locale-provider";
import type { RunDeliverableBundle, RunDeliverableItem } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

function statusTone(status: RunDeliverableBundle["status"]) {
  if (status === "ready") {
    return "bg-success/12 text-success";
  }

  if (status === "pending") {
    return "bg-accent/10 text-accent";
  }

  return "bg-warning/10 text-warning";
}

function kindTone(kind: RunDeliverableItem["kind"]) {
  if (kind === "code") {
    return "bg-ink text-white";
  }

  if (kind === "json") {
    return "bg-accent/10 text-accent";
  }

  return "bg-mist text-steel";
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function RunDeliverablesPanel({
  bundle
}: {
  bundle: RunDeliverableBundle;
}) {
  const { t, formatDateTime } = useLocale();
  const initialItem = useMemo(
    () =>
      bundle.items.find((item) => item.id === bundle.primaryDeliverableId) ??
      bundle.items[0] ??
      null,
    [bundle.items, bundle.primaryDeliverableId]
  );
  const [selectedId, setSelectedId] = useState(initialItem?.id ?? null);
  const [preview, setPreview] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedId(initialItem?.id ?? null);
  }, [initialItem?.id]);

  const selectedItem =
    bundle.items.find((item) => item.id === selectedId) ?? initialItem ?? null;

  useEffect(() => {
    if (!selectedItem || selectedItem.previewFormat === "none") {
      setPreview("");
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(selectedItem.previewUrl, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Preview fetch failed.");
        }

        return await response.text();
      })
      .then((content) => {
        if (!cancelled) {
          setPreview(content);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview("");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-accent/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(242,247,255,0.92))] p-5 shadow-[0_18px_50px_rgba(34,108,255,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
              {t("runDeliverables")}
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">
              {t("runDeliverablesTitle")}
            </h3>
            <p className="mt-3 text-sm leading-6 text-steel">
              {t("runDeliverablesBody")}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
              statusTone(bundle.status)
            )}
          >
            {bundle.status === "ready"
              ? t("runDeliverablesReady")
              : bundle.status === "pending"
                ? t("runDeliverablesPending")
                : t("runDeliverablesUnavailable")}
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-steel">
          {bundle.generatedAt ? (
            <div className="rounded-2xl bg-white/85 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.16em] text-steel/70">
                {t("runDeliverablesGeneratedAt")}
              </span>
              <div className="mt-2 font-medium text-ink">
                {formatDateTime(bundle.generatedAt)}
              </div>
            </div>
          ) : null}
          {bundle.outputDir ? (
            <div className="rounded-2xl bg-white/85 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.16em] text-steel/70">
                {t("runDeliverablesFolder")}
              </span>
              <div className="mt-2 break-all text-xs text-ink">{bundle.outputDir}</div>
            </div>
          ) : null}
        </div>
      </section>

      {bundle.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-mist p-5 text-sm text-steel">
          {t("runDeliverablesEmpty")}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {bundle.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full rounded-[22px] border p-4 text-left transition",
                  selectedItem?.id === item.id
                    ? "border-accent/30 bg-white shadow-[0_14px_38px_rgba(34,108,255,0.08)]"
                    : "border-line/70 bg-[#f9fbfd] hover:border-accent/20 hover:bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em]",
                          kindTone(item.kind)
                        )}
                      >
                        {item.kind}
                      </span>
                      {item.isPrimary ? (
                        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
                          {t("runDeliverablesPrimary")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-semibold tracking-tight text-ink">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-steel">{item.description}</p>
                  </div>
                  <div className="text-right text-xs text-steel/70">
                    <div>{formatBytes(item.byteSize)}</div>
                    <div className="mt-2">{item.filename}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {selectedItem ? (
            <section className="rounded-[24px] border border-line/70 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-accent">
                    {t("runDeliverablesPreview")}
                  </p>
                  <h4 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                    {selectedItem.title}
                  </h4>
                </div>
                <a
                  href={selectedItem.downloadUrl}
                  className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
                >
                  {t("runDeliverablesDownload")}
                </a>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-steel">
                <span className="rounded-full bg-mist px-2.5 py-1">{selectedItem.filename}</span>
                <span className="rounded-full bg-mist px-2.5 py-1">
                  {t("runDeliverablesSourceAgents")}: {selectedItem.sourceAgents.join(", ")}
                </span>
              </div>

              <div className="mt-5 rounded-[20px] border border-line/70 bg-[#fbfcfe] p-4">
                {loading ? (
                  <p className="text-sm text-steel">{t("runDeliverablesPreviewLoading")}</p>
                ) : selectedItem.previewFormat === "markdown" ? (
                  <MarkdownContent content={preview} />
                ) : selectedItem.previewFormat === "json" ? (
                  <MarkdownContent content={`\`\`\`json\n${preview}\n\`\`\``} />
                ) : selectedItem.previewFormat === "code" ? (
                  <MarkdownContent content={`\`\`\`ts\n${preview}\n\`\`\``} />
                ) : selectedItem.previewFormat === "text" ? (
                  <MarkdownContent content={preview} />
                ) : (
                  <p className="text-sm text-steel">
                    {t("runDeliverablesPreviewUnavailable")}
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
