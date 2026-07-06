import { createAPIFileRoute } from "@tanstack/start/api";
import { PLANS } from "~/lib/stripe";

/**
 * GET /api/plans
 * Returns the pricing plans for the landing page.
 * No authentication required.
 */
export const Route = createAPIFileRoute("/api/plans")({
  GET: async () => {
    const plans = Object.entries(PLANS).map(([id, plan]) => ({
      id,
      name: plan.name,
      description: plan.description,
      setupFee: plan.setupFee, // in cents
      monthlyPrice: plan.monthlyPrice, // in cents
      setupFeeFormatted: new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(plan.setupFee / 100),
      monthlyPriceFormatted: new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(plan.monthlyPrice / 100),
    }));

    return new Response(JSON.stringify({ plans }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});