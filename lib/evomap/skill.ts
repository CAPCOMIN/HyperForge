export interface SkillRuntimeAdapter {
  search?(query: string): Promise<Array<Record<string, unknown>>>;
  install?(skillId: string): Promise<Record<string, unknown>>;
}

export const noopSkillRuntime: SkillRuntimeAdapter = {};
