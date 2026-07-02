import { createAPIFileRoute } from "@tanstack/start/api";

/**
 * GET /api/health
 * Simple health check endpoint for monitoring.
 */
export const APIRoute = createAPIFileRoute("/api/health")({
  GET: async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "Personale Artificiale API",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },
});