/**
 * Webhook API endpoint for Evolution API (Baileys-based WhatsApp).
 * Exposes /api/whatsapp/webhook to receive real-time messages,
 * dynamically customize the AI agent based on db config, and trigger the AI agent.
 */

import { createAPIFileRoute } from "@tanstack/start/api";
import { EvolutionAPI } from "../../../lib/whatsapp";
import { VirtualEmployeeAgentFactory, AgentType } from "../../../lib/agent";
import { query } from "../../../lib/db";

// Keep in-memory message history per remote user (remoteJid) for context.
// In production, store this in Turso SQLite / Redis for persistence.
const chatHistories = new Map<string, any[]>();

export const APIRoute = createAPIFileRoute("/api/whatsapp/webhook")({
  POST: async ({ request }) => {
    try {
      const payload = await request.json() as any;
      console.log("[Webhook] Received event from Evolution API:", payload?.event);

      // 1. Filter out event types we don't care about (we only want incoming text messages)
      if (payload?.event !== "messages.upsert") {
        return new Response(JSON.stringify({ status: "ignored", event: payload?.event }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const messageData = payload?.data;
      const key = messageData?.key;
      
      // 2. Ignore messages sent by our own WhatsApp instance to prevent infinite loops!
      if (key?.fromMe) {
        return new Response(JSON.stringify({ status: "ignored_from_me" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const remoteJid = key?.remoteJid;
      const pushName = messageData?.pushName || "Cliente";
      const instanceName = payload?.instance || "default_tenant";
      
      // 3. Extract the message text
      let textMessage = "";
      if (messageData?.message?.conversation) {
        textMessage = messageData.message.conversation;
      } else if (messageData?.message?.extendedTextMessage?.text) {
        textMessage = messageData.message.extendedTextMessage.text;
      } else if (messageData?.messageType === "audioMessage") {
        textMessage = "[Messaggio Vocale Ricevuto]";
      }

      // If there is no text message content, terminate early
      if (!textMessage) {
        return new Response(JSON.stringify({ status: "no_text_content" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.log(`[Webhook] Message from ${pushName} (${remoteJid}) on instance "${instanceName}": "${textMessage}"`);

      // 4. Retrieve or initialize chat history
      const historyKey = `${instanceName}:${remoteJid}`;
      if (!chatHistories.has(historyKey)) {
        chatHistories.set(historyKey, []);
      }
      const history = chatHistories.get(historyKey) || [];

      // 5. Query user-specific configuration (tone of voice, agent description, agent type) from SQLite DB
      let agentType: AgentType = "executive_assistant";
      let toneOfVoice = "professionale, cortese e amichevole, esprimendo competenza e prontezza nell'aiutare";
      let roleDescription = "";

      try {
        const dbConfigs = query<any>(
          `SELECT tone_of_voice, role_description, agent_type FROM agent_config WHERE user_id = '${instanceName.replace(/'/g, "''")}'`
        );
        if (dbConfigs && dbConfigs.length > 0) {
          toneOfVoice = dbConfigs[0].tone_of_voice || toneOfVoice;
          roleDescription = dbConfigs[0].role_description || "";
          
          // Explicitly retrieve agent type if configured, otherwise auto-detect from description
          const dbAgentType = dbConfigs[0].agent_type;
          if (dbAgentType === "executive_assistant" || dbAgentType === "digital_marketer" || dbAgentType === "operations_analyst") {
            agentType = dbAgentType as AgentType;
          } else if (roleDescription) {
            agentType = VirtualEmployeeAgentFactory.detectTypeFromRole(roleDescription);
          }
          console.log(`[Webhook] Loaded custom database config for tenant ${instanceName}. Type: "${agentType}", Tone: "${toneOfVoice}", Role: "${roleDescription}"`);
        } else {
          console.log(`[Webhook] Using default configurations. No custom config found in DB for user_id: ${instanceName}`);
        }
      } catch (dbError) {
        console.error(`[Webhook] Could not load custom database configuration for tenant ${instanceName}. Using defaults.`, dbError);
      }

      // 6. Instantiate AI Agent & Evolution API clients via Factory
      const agent = VirtualEmployeeAgentFactory.create(agentType);
      const whatsappClient = new EvolutionAPI();

      // Send a typing indicator state proactively to WhatsApp to make it feel human
      try {
        await fetch(`${process.env.EVOLUTION_API_URL || "http://localhost:8080"}/chat/sendPresence/${instanceName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.EVOLUTION_API_TOKEN || "default_token",
          },
          body: JSON.stringify({
            number: remoteJid.split("@")[0],
            presence: "composing", // typing... indicator
            delay: 1500,
          }),
        });
      } catch (presenceError) {
        // Silently catch since presence indicator is a nice-to-have UI enhancer
      }

      // 7. Run the AI agent to get the response
      const agentResponse = await agent.run({
        message: textMessage,
        history,
        tenantId: instanceName,
        toneOfVoice,
        roleDescription,
      });

      console.log(`[Webhook] Agent Response for ${remoteJid}: "${agentResponse}"`);

      // 8. Send the response back via WhatsApp
      await whatsappClient.sendTextMessage(instanceName, remoteJid, agentResponse);

      // 9. Update Chat History with current turn to maintain conversation context
      history.push({ role: "user", content: textMessage });
      history.push({ role: "assistant", content: agentResponse });
      
      // Cap history to last 10 messages to keep LLM context memory-light and performant
      if (history.length > 20) {
        history.splice(0, 2);
      }
      chatHistories.set(historyKey, history);

      return new Response(JSON.stringify({ status: "success", replySent: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error: any) {
      console.error("[Webhook] Error processing incoming webhook:", error);
      return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
