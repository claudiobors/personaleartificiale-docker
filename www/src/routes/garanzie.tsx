import { createFileRoute } from "@tanstack/react-router";
import { GuaranteesPage } from "~/components/LegalPages";

export const Route = createFileRoute("/garanzie")({ component: GuaranteesPage });
