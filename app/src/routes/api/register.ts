import { createAPIFileRoute } from "@tanstack/start/api";
import { ensureTables, findOrCreateUser, createSession } from "~/lib/auth";

/**
 * POST /api/auth/register
 * Creates a user account and returns a session token.
 *
 * Body: { email: string, name: string, planId: "assistente-esecutivo" | "ufficio-digitale" }
 * Returns: { token: string, user: { id, email, name, planId } }
 */
export const APIRoute = createAPIFileRoute("/api/auth/register")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as {
        email?: string;
        name?: string;
        planId?: string;
      };

      if (!body.email || !body.name || !body.planId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: email, name, planId" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Validate planId
      if (
        body.planId !== "assistente-esecutivo" &&
        body.planId !== "ufficio-digitale"
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid planId" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      await ensureTables();

      const user = await findOrCreateUser({
        email: body.email,
        name: body.name,
        planId: body.planId,
      });

      const token = await createSession(user.id);

      return new Response(
        JSON.stringify({
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            planId: user.planId,
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
});