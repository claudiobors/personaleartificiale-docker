import { createAPIFileRoute } from "@tanstack/start/api";
import { validateSession } from "~/lib/auth";

/**
 * GET /api/agent/status
 * Returns the current status of the AI agent for the authenticated user.
 *
 * Requires Authorization: Bearer <token> header.
 */
export const Route = createAPIFileRoute("/api/agent/status")({
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
      const user = await validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const isActive = user.status === "active";

      return new Response(
        JSON.stringify({
          agentId: `agent-${user.id}`,
          status: isActive ? "online" : "offline",
          planId: user.planId,
          isSubscribed: isActive,
          lastHeartbeat: new Date().toISOString(),
          capabilities:
            user.planId === "ufficio-digitale"
              ? [
                  "email_triage",
                  "calendar_management",
                  "file_archiving",
                  "trello_integration",
                  "crm_updates",
                ]
              : [
                  "email_triage",
                  "calendar_management",
                  "file_archiving",
                ],
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