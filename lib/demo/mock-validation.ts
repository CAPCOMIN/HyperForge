export function runMockValidation(task: string, builderSummary: string) {
  return {
    checks: [
      "Happy path login with valid credentials succeeds.",
      "Invalid credentials show bounded error copy.",
      "Session expiration redirects to login and preserves intent."
    ],
    outcome: `Mock validation confirms the proposed changes for "${task}" are consistent with the builder plan. Validation target: ${builderSummary}.`,
    score: 0.91
  };
}
