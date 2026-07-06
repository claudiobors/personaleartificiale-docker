import { createAPIFileRoute } from "@tanstack/start/api";
import { validateSession } from "~/lib/auth";
import { getSubscription } from "~/lib/stripe";

/**
 * GET /api/subscription/status
 * Returns the current user's subscription status.
 * Requires Authorization: Bearer <token> header.
 */
export const Route = createAPIFileRoute("/api/subscription/status")({
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
      const user = await validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      let stripeSubscription = null;
      if (user.subscriptionId) {
        try {
          stripeSubscription = await getSubscription(user.subscriptionId);
        } catch {
          // Subscription may no longer exist in Stripe
        }
      }

      const planLabel =
        user.planId === "assistente-esecutivo"
          ? "Assistente Esecutivo"
          : user.planId === "ufficio-digitale"
            ? "L'Ufficio Digitale"
            : user.planId;

      return new Response(
        JSON.stringify({
          status: user.status,
          planId: user.planId,
          planName: planLabel,
          subscriptionId: user.subscriptionId,
          stripeStatus: stripeSubscription?.status ?? null,
          currentPeriodEnd: stripeSubscription?.current_period_end
            ? new Date(
                (stripeSubscription.current_period_end as number) * 1000,
              ).toISOString()
            : null,
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