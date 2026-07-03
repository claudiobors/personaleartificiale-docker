import { createAPIFileRoute } from "@tanstack/start-api-routes";
import { validateSession } from "~/lib/auth";
import { getAgentStats } from "~/lib/knowledge";

/**
 * GET /api/agent/stats — Agent usage statistics
 *
 * Requires Authorization: Bearer <token> header.
 */
export const APIRoute = createAPIFileRoute("/api/agent/stats")({
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

      const stats = await getAgentStats(user.id);

      return new Response(
        JSON.stringify({
          stats: {
            ...stats,
            tenantId: user.id,
            planId: user.planId,
            status: user.status,
            subscriptionActive: user.status === "active",
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