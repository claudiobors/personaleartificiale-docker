import { createFileRoute } from "@tanstack/react-router";
import { CookiePage } from "~/components/LegalPages";

export const Route = createFileRoute("/cookie-policy")({
  component: CookiePage,
});
