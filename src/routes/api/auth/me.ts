import { createAPIFileRoute } from "@tanstack/start/api";
import { validateSession } from "~/lib/auth";

/**
 * GET /api/auth/me
 * Returns the current user's info if the token is valid.
 * Requires Authorization: Bearer <token> header.
 */
export const APIRoute = createAPIFileRoute("/api/auth/me")({
  GET: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing or invalid authorization header" }),
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

      return new Response(
        JSON.stringify({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            planId: user.planId,
            status: user.status,
            createdAt: user.createdAt,
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