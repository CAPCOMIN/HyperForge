import type { CapsuleDraft } from "@/lib/types/domain";

export function CapsuleCard({ capsule }: { capsule: CapsuleDraft }) {
  return (
    <article className="rounded-2xl border border-line bg-mist p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{capsule.summary}</h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-steel">
          {capsule.publishStatus}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-steel">Gene: {capsule.geneAssetId}</p>
      {capsule.payload.model_name ? (
        <p className="mt-2 text-xs leading-5 text-steel">
          Model: {capsule.payload.model_name}
        </p>
      ) : null}
      <p className="mt-2 break-all text-xs leading-5 text-steel">{capsule.assetId}</p>
    </article>
  );
}
