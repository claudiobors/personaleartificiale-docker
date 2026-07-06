import { createAPIFileRoute } from "@tanstack/start/api";
import { constructWebhookEvent, getSessionDetails } from "~/lib/stripe";
import { updateUserSubscription, updateSubscriptionStatus } from "~/lib/auth";

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription lifecycle.
 *
 * Events handled:
 * - checkout.session.completed → activate user subscription
 * - customer.subscription.updated → sync subscription status
 * - customer.subscription.deleted → mark as cancelled
 */
export const Route = createAPIFileRoute("/api/stripe/webhook")({
  POST: async ({ request }) => {
    try {
      const rawBody = await request.text();
      const signature =
        request.headers.get("stripe-signature") || "";

      // Verify webhook signature and construct event
      const event = constructWebhookEvent(rawBody, signature);

      console.log(`[Stripe Webhook] Received event: ${event.type}`);

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as {
            id: string;
            subscription?: string;
            customer?: string;
            metadata?: Record<string, string>;
          };

          const userId = session.metadata?.user_id;
          const subscriptionId = session.subscription;
          const customerId = session.customer;

          if (userId && subscriptionId && customerId) {
            updateUserSubscription(
              userId,
              subscriptionId as string,
              customerId as string,
              session.id,
            );
            console.log(
              `[Stripe Webhook] User ${userId} activated with subscription ${subscriptionId as string}`,
            );
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as {
            id: string;
            status: string;
          };

          const newStatus = mapStripeStatus(subscription.status);
          updateSubscriptionStatus(subscription.id, newStatus);
          console.log(
            `[Stripe Webhook] Subscription ${subscription.id} status → ${newStatus}`,
          );
          break;
        }

        case "customer.subscription.deleted": {
          const deletedSub = event.data.object as { id: string };
          updateSubscriptionStatus(deletedSub.id, "cancelled");
          console.log(
            `[Stripe Webhook] Subscription ${deletedSub.id} deleted (cancelled)`,
          );
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      return new Response(
        JSON.stringify({ received: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Webhook Error";
      console.error("[Stripe Webhook Error]", message);
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  },
});

/**
 * Map Stripe subscription status to our internal status.
 */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "incomplete":
      return "pending";
    case "canceled":
    case "unpaid":
      return "cancelled";
    default:
      return stripeStatus;
  }
}