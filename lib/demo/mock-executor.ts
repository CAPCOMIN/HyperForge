export function runMockBuilder(task: string, contextSummary: string) {
  const files = ["app/(auth)/login/page.tsx", "lib/auth/session.ts", "tests/login.spec.ts"];
  const steps = [
    "Define the login user journey and session boundaries.",
    "Implement guarded form states and API contract placeholders.",
    "Prepare patch notes for follow-up real executor integration."
  ];

  return {
    files,
    steps,
    patchSummary: `Mock executor prepared a delivery plan for: ${task}. Context anchor: ${contextSummary}. Files touched are placeholders so the runtime can later swap to a real repo sandbox without changing orchestration contracts.`,
    codeSnippet: `export async function submitLogin(credentials) {\n  return { ok: true, next: "/dashboard" };\n}`
  };
}
