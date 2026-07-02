import { createAPIFileRoute } from "@tanstack/start/api";
import { validateSession, saveToneOfVoice, getAgentConfig } from "~/lib/auth";

/**
 * GET /api/config/tone-of-voice — retrieve the current tone of voice
 * POST /api/config/tone-of-voice — update the tone of voice
 *
 * Requires Authorization: Bearer <token> header.
 */
export const APIRoute = createAPIFileRoute("/api/config/tone-of-voice")({
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

      const config = getAgentConfig(user.id);

      return new Response(
        JSON.stringify({
          toneOfVoice: config?.toneOfVoice ?? "Professionale, cortese e amichevole",
          roleDescription:
            config?.roleDescription ??
            "Assistente Digitale per l'Ufficio Virtuale",
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

  POST: async ({ request }) => {
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
        toneOfVoice?: string;
      };

      if (!body.toneOfVoice?.trim()) {
        return new Response(
          JSON.stringify({ error: "Missing toneOfVoice field" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      saveToneOfVoice(user.id, body.toneOfVoice.trim());

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