import { createFileRoute } from "@tanstack/react-router";
import { CalculatorPage } from "~/components/CalculatorPage";

export const Route = createFileRoute("/ads")({
  component: () => <CalculatorPage campaign />,
});
