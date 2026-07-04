import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "~/components/LegalPages";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });
