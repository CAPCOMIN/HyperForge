import type { AgentRole } from "@/lib/types/domain";
import type { HyperAgent } from "@/lib/agents/base-agent";
import { AnalystAgent } from "@/lib/agents/analyst-agent";
import { BuilderAgent } from "@/lib/agents/builder-agent";
import { MasterAgent } from "@/lib/agents/master-agent";
import { ValidatorAgent } from "@/lib/agents/validator-agent";

export function createAgentRegistry() {
  const agents = new Map<AgentRole, HyperAgent>();
  agents.set("master", new MasterAgent());
  agents.set("analyst", new AnalystAgent());
  agents.set("builder", new BuilderAgent());
  agents.set("validator", new ValidatorAgent());

  return {
    get(role: AgentRole) {
      const agent = agents.get(role);

      if (!agent) {
        throw new Error(`Unknown agent role: ${role}`);
      }

      return agent;
    },
    list() {
      return Array.from(agents.values());
    }
  };
}
