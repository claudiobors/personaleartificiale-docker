import { createFileRoute } from "@tanstack/react-router";
import { AppExperience } from "../app/AppExperience";

export const Route = createFileRoute("/dashboard")({
  component: AppExperience,
});
