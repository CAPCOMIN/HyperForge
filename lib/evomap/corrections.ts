export interface CorrectionAdapter {
  stage?(assetId: string): Promise<Record<string, unknown>>;
  apply?(assetId: string): Promise<Record<string, unknown>>;
  validate?(assetId: string): Promise<Record<string, unknown>>;
}

export const noopCorrections: CorrectionAdapter = {};
