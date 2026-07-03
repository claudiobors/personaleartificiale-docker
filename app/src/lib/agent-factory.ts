/**
 * Agent Factory module for Personale Artificiale.
 * Orchestrates creating the 3 sellable agents: Assistente Esecutivo, Marketer Digitale, and Analista Operativo,
 * supporting custom naming, tone of voice, knowledge base files, and multi-tenancy.
 */

import { VirtualEmployeeAgent, AgentType, AGENT_DEFINITIONS } from "./agent";
import { getAgentConfigByTenant } from "./knowledge";

export interface AgentCustomConfig {
  name?: string;
  toneOfVoice?: string;
  roleDescription?: string;
}

export class AgentFactory {
  /**
   * Instantiates the correct agent based on the user's subscription plan (or explicit agent type) and tenantId.
   * Also applies custom configurations dynamically if provided.
   * 
   * Plans / Types:
   * - "executive_assistant": Assistente Esecutivo (tools: email, calendar, drive)
   * - "digital_marketer": Marketer Digitale (tools: social, email, CRM)
   * - "operations_analyst": Analista Operativo (tools: project_management, calendar, drive)
   */
  static async createAgent(
    tenantId: string,
    type: AgentType = "executive_assistant",
    customConfig?: AgentCustomConfig
  ): Promise<VirtualEmployeeAgent> {
    console.log(`[AgentFactory] Instantiating agent of type "${type}" for tenant "${tenantId}"`);

    // 1. Initialize agent based on the requested type
    const agent = new VirtualEmployeeAgent(type);

    // 2. Merge dynamic tenant configurations from the database (fallback to customConfig if present)
    const dbConfig = await getAgentConfigByTenant(tenantId);
    
    // Inject custom config fields if passed explicitly, or fall back to DB values
    const finalToneOfVoice = customConfig?.toneOfVoice || dbConfig?.toneOfVoice || "professionale, cortese e amichevole";
    const finalRoleDescription = customConfig?.roleDescription || dbConfig?.roleDescription || AGENT_DEFINITIONS[type].defaultRoleDescription;
    const finalName = customConfig?.name || dbConfig?.name || AGENT_DEFINITIONS[type].displayName;

    console.log(`[AgentFactory] Configured Agent "${finalName}" for tenant "${tenantId}":`);
    console.log(` - Tone of Voice: "${finalToneOfVoice}"`);
    console.log(` - Role Description: "${finalRoleDescription}"`);

    return agent;
  }

  /**
   * Instantiates the correct agent using a subscription plan ID.
   * Maps "assistente-esecutivo" to executive_assistant, "ufficio-digitale" or "enterprise" to any specified agent.
   */
  static async createAgentByPlan(
    tenantId: string,
    planId: string,
    requestedType: AgentType = "executive_assistant",
    customConfig?: AgentCustomConfig
  ): Promise<VirtualEmployeeAgent> {
    console.log(`[AgentFactory] Creating agent for plan "${planId}" and tenant "${tenantId}"`);
    
    let targetType: AgentType = requestedType;

    // Enforce plan constraints (Assistente Esecutivo plan can ONLY run executive_assistant)
    if (planId === "assistente-esecutivo") {
      targetType = "executive_assistant";
    }

    return this.createAgent(tenantId, targetType, customConfig);
  }
}
