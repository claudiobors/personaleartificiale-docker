import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "~/components/LegalPages";

export const Route = createFileRoute("/termini-servizio")({
  component: TermsPage,
});
