import { createAPIFileRoute } from "@tanstack/start-api-routes";
import { validateSession } from "~/lib/auth";
import {
  saveKnowledgeFile,
  deleteKnowledgeFile,
  listKnowledgeFiles,
} from "~/lib/knowledge";

/**
 * POST /api/agent/knowledge — Upload a PDF/Word file to the knowledge base
 * DELETE /api/agent/knowledge — Delete a knowledge file (query param: fileId)
 * GET /api/agent/knowledge — List all knowledge files
 */
export const APIRoute = createAPIFileRoute("/api/agent/knowledge")({
  /**
   * GET — list knowledge files
   */
  GET: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = authHeader.slice(7);
      const user = validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const files = await listKnowledgeFiles(user.id);

      return new Response(
        JSON.stringify({ files }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  /**
   * POST — upload a file
   */
  POST: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = authHeader.slice(7);
      const user = validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      // Parse multipart form data
      const formData = await request.formData();
      const fileEntry = formData.get("file");

      if (!fileEntry || !(fileEntry instanceof File)) {
        return new Response(
          JSON.stringify({ error: "Missing file field in form data" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const buffer = Buffer.from(await fileEntry.arrayBuffer());
      const result = await saveKnowledgeFile(user.id, {
        name: fileEntry.name,
        buffer,
      });

      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  /**
   * DELETE — remove a file (query: ?fileId=xxx)
   */
  DELETE: async ({ request }) => {
    try {
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const token = authHeader.slice(7);
      const user = validateSession(token);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const url = new URL(request.url);
      const fileId = url.searchParams.get("fileId");

      if (!fileId) {
        return new Response(
          JSON.stringify({ error: "Missing fileId query parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const deleted = await deleteKnowledgeFile(user.id, fileId);

      return new Response(
        JSON.stringify({ success: deleted }),
        {
          status: deleted ? 200 : 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return new Response(
        JSON.stringify({ error: message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
});