"use client";

import { Fragment, useMemo, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils/cn";

type Segment =
  | {
      type: "code";
      language: string;
      content: string;
    }
  | {
      type: "text";
      content: string;
    };

function splitMarkdown(content: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /```([\w-]+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.slice(lastIndex, match.index)
      });
    }

    segments.push({
      type: "code",
      language: match[1] ?? "",
      content: match[2]?.trimEnd() ?? ""
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.slice(lastIndex)
    });
  }

  return segments.filter((segment) => segment.content.trim().length > 0);
}

function renderInline(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md bg-slate-900/6 px-1.5 py-0.5 text-[0.92em] text-ink"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function renderTextBlocks(content: string) {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trimEnd() ?? "";

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const text = line.replace(/^#{1,3}\s+/, "");
      const Tag = (level === 1 ? "h1" : level === 2 ? "h2" : "h3") as
        | "h1"
        | "h2"
        | "h3";
      blocks.push(
        <Tag
          key={`heading-${index}`}
          className={cn(
            "font-semibold tracking-tight text-ink",
            level === 1 && "text-2xl",
            level === 2 && "text-xl",
            level === 3 && "text-base"
          )}
        >
          {renderInline(text)}
        </Tag>
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index]?.trim() ?? "")) {
        items.push((lines[index] ?? "").trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="space-y-2 pl-5 text-sm leading-7 text-steel">
          {items.map((item) => (
            <li key={item} className="list-disc">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index]?.trim() ?? "")) {
        items.push((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="space-y-2 pl-5 text-sm leading-7 text-steel">
          {items.map((item) => (
            <li key={item} className="list-decimal">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !/^#{1,3}\s+/.test(lines[index] ?? "") &&
      !/^[-*]\s+/.test(lines[index]?.trim() ?? "") &&
      !/^\d+\.\s+/.test(lines[index]?.trim() ?? "")
    ) {
      paragraph.push((lines[index] ?? "").trim());
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="text-sm leading-7 text-steel">
        {renderInline(paragraph.join(" "))}
      </p>
    );
  }

  return blocks;
}

function CopyCodeButton({ value }: { value: string }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/20"
    >
      {copied ? t("markdownCopiedCode") : t("markdownCopyCode")}
    </button>
  );
}

export function MarkdownContent({
  content,
  className
}: {
  content: string;
  className?: string;
}) {
  const segments = useMemo(() => splitMarkdown(content), [content]);

  return (
    <div className={cn("space-y-4", className)}>
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <div
            key={`${segment.language}-${index}`}
            className="overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-950"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.16em] text-white/60">
                {segment.language || "code"}
              </span>
              <CopyCodeButton value={segment.content} />
            </div>
            <pre className="overflow-x-auto px-4 py-4 text-sm leading-7 text-slate-100">
              <code>{segment.content}</code>
            </pre>
          </div>
        ) : (
          <div key={`text-${index}`} className="space-y-3">
            {renderTextBlocks(segment.content)}
          </div>
        )
      )}
    </div>
  );
}
