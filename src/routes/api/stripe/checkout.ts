import { createAPIFileRoute } from "@tanstack/start/api";
import { createCheckoutSession, type PlanId } from "~/lib/stripe";
import { findOrCreateUser, createSession, ensureTables } from "~/lib/auth";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for a given plan.
 *
 * Body: { planId: "assistente-esecutivo" | "ufficio-digitale", email: string, name: string }
 * Returns: { url: string, sessionId: string, token: string }
 */
export const APIRoute = createAPIFileRoute("/api/stripe/checkout")({
  POST: async ({ request }) => {
    try {
      const body = (await request.json()) as {
        planId?: string;
        email?: string;
        name?: string;
      };

      if (!body.planId || !body.email || !body.name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: planId, email, name" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const planId = body.planId as PlanId;
      if (planId !== "assistente-esecutivo" && planId !== "ufficio-digitale") {
        return new Response(
          JSON.stringify({ error: "Invalid planId" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // Ensure the database tables exist
      ensureTables();

      // Find or create the user
      const user = await findOrCreateUser({
        email: body.email,
        name: body.name,
        planId,
      });

      // Create a session for immediate use after successful purchase
      const token = createSession(user.id);

      // Get the base URL for redirects (use the request's origin)
      const origin = new URL(request.url).origin;

      // Create the Stripe checkout session
      const session = await createCheckoutSession({
        planId,
        customerEmail: body.email,
        successUrl: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&token=${token}`,
        cancelUrl: `${origin}/?canceled=true`,
        metadata: {
          user_id: user.id,
        },
      });

      return new Response(
        JSON.stringify({
          url: session.url,
          sessionId: session.id,
          token,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error";
      console.error("[Stripe Checkout Error]", message);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
});