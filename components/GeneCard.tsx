import type { GeneDraft } from "@/lib/types/domain";

export function GeneCard({ gene }: { gene: GeneDraft }) {
  return (
    <article className="rounded-2xl border border-line bg-mist p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
            {gene.category}
          </p>
          <h3 className="mt-1 text-base font-semibold">{gene.summary}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-steel">
          {gene.publishStatus}
        </span>
      </div>
      <p className="mt-3 break-all text-xs leading-5 text-steel">{gene.assetId}</p>
      {gene.payload.model_name ? (
        <p className="mt-2 text-xs leading-5 text-steel">
          Model: {gene.payload.model_name}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {gene.signalsMatch.map((signal) => (
          <span key={signal} className="rounded-full bg-white px-3 py-1 text-xs text-steel">
            {signal}
          </span>
        ))}
      </div>
    </article>
  );
}
