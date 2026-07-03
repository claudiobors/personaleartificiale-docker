import { createAPIFileRoute } from "@tanstack/start-api-routes";
import {
  saveAgentConfig,
  getAgentConfigByTenant,
} from "~/lib/knowledge";
import { validateSession } from "~/lib/auth";

/**
 * PUT /api/agent/config — Save agent configuration (name, tone, description, etc.)
 * GET /api/agent/config — Retrieve current agent configuration
 *
 * Requires Authorization: Bearer <token> header.
 */
export const APIRoute = createAPIFileRoute("/api/agent/config")({
  /**
   * GET /api/agent/config
   */
  GET: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = authHeader.slice(7);
      const user = validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const config = await getAgentConfigByTenant(user.id);

      return new Response(
        JSON.stringify({
          config: config ?? {
            tenantId: user.id,
            name: "Assistente",
            toneOfVoice: "Professionale, cortese e amichevole",
            roleDescription: "Assistente Digitale per l'Ufficio Virtuale",
            businessDescription: "",
            products: "",
            target: "",
            competitors: "",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  /**
   * PUT /api/agent/config
   */
  PUT: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = authHeader.slice(7);
      const user = validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const body = (await request.json()) as {
        name?: string;
        toneOfVoice?: string;
        roleDescription?: string;
        businessDescription?: string;
        products?: string;
        target?: string;
        competitors?: string;
      };

      await saveAgentConfig({
        tenantId: user.id,
        name: body.name || "Assistente",
        toneOfVoice: body.toneOfVoice || "Professionale, cortese e amichevole",
        roleDescription: body.roleDescription || "Assistente Digitale per l'Ufficio Virtuale",
        businessDescription: body.businessDescription || "",
        products: body.products || "",
        target: body.target || "",
        competitors: body.competitors || "",
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
});