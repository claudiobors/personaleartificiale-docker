import { createFileRoute } from "@tanstack/react-router";
import { CalculatorPage } from "~/components/CalculatorPage";

export const Route = createFileRoute("/calcolatore")({
  component: CalculatorPage,
});
