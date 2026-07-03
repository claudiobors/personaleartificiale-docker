/**
 * Knowledge Base module for Personale Artificiale.
 * Manages file uploads (PDF/Word/DOCX) and agent configuration.
 * Files are stored in /home/team/shared/uploads/{tenantId}/
 */
import { writeFile, unlink, readdir, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";

const UPLOADS_BASE = "/home/team/shared/uploads";

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".md"];

export interface KnowledgeFile {
  id: string;
  tenantId: string;
  originalName: string;
  fileName: string;
  ext: string;
  size: number;
  uploadedAt: string;
}

export interface AgentConfig {
  tenantId: string;
  name: string;
  toneOfVoice: string;
  roleDescription: string;
  businessDescription: string;
  products: string;
  target: string;
  competitors: string;
}

/**
 * Get the upload directory for a tenant, creating it if needed.
 */
async function getTenantDir(tenantId: string): Promise<string> {
  const dir = join(UPLOADS_BASE, tenantId);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
}

/**
 * Save an uploaded file to the knowledge base.
 * Returns the file metadata.
 */
export async function saveKnowledgeFile(
  tenantId: string,
  file: { name: string; buffer: Buffer },
): Promise<KnowledgeFile> {
  const ext = extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Formato file non supportato: ${ext}. Formati accettati: ${ALLOWED_EXTENSIONS.join(", ")}`,
    );
  }

  const tenantDir = await getTenantDir(tenantId);
  const timestamp = Date.now();
  const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = join(tenantDir, safeName);

  await writeFile(filePath, file.buffer);

  return {
    id: `file-${timestamp}`,
    tenantId,
    originalName: file.name,
    fileName: safeName,
    ext,
    size: file.buffer.length,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a knowledge file by its stored filename.
 */
export async function deleteKnowledgeFile(
  tenantId: string,
  fileId: string,
): Promise<boolean> {
  const tenantDir = await getTenantDir(tenantId);

  // fileId is stored as the filename in the uploads directory
  // or we can scan and match by id prefix
  const files = await listKnowledgeFiles(tenantId);
  const file = files.find((f) => f.id === fileId);

  if (!file) return false;

  const filePath = join(tenantDir, file.fileName);
  await unlink(filePath);
  return true;
}

/**
 * List all knowledge files for a tenant.
 */
export async function listKnowledgeFiles(
  tenantId: string,
): Promise<KnowledgeFile[]> {
  const tenantDir = await getTenantDir(tenantId);
  const entries = await readdir(tenantDir, { withFileTypes: true });
  const files: KnowledgeFile[] = [];

  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const parts = entry.name.split("-");
        const timestamp = parseInt(parts[0], 10) || Date.now();
        // Restore original name (remove timestamp prefix)
        const originalName = entry.name.replace(/^\d+-/, "");
        files.push({
          id: `file-${timestamp}`,
          tenantId,
          originalName,
          fileName: entry.name,
          ext,
          size: 0, // Would need stat for actual size
          uploadedAt: new Date(timestamp).toISOString(),
        });
      }
    }
  }

  return files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

/**
 * Save or update agent configuration in the database.
 */
export async function saveAgentConfig(config: AgentConfig): Promise<void> {
  const { execute } = await import("./db");

  // Escape single quotes for SQL
  const safe = (s: string) => s.replace(/'/g, "''");

  execute(`
    INSERT INTO agent_config (user_id, tone_of_voice, role_description, created_at, updated_at)
    VALUES ('${safe(config.tenantId)}', '${safe(config.toneOfVoice)}', '${safe(config.roleDescription)}', datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      tone_of_voice = '${safe(config.toneOfVoice)}',
      role_description = '${safe(config.roleDescription)}',
      updated_at = datetime('now')
  `);
}

/**
 * Retrieve agent configuration from the database.
 */
export async function getAgentConfigByTenant(
  tenantId: string,
): Promise<AgentConfig | null> {
  const { query } = await import("./db");

  const rows = query<{
    tone_of_voice: string;
    role_description: string;
  }>(
    `SELECT tone_of_voice, role_description FROM agent_config WHERE user_id = '${tenantId.replace(/'/g, "''")}'`,
  );

  if (rows.length === 0) return null;

  return {
    tenantId,
    name: "",
    toneOfVoice: rows[0].tone_of_voice,
    roleDescription: rows[0].role_description,
    businessDescription: "",
    products: "",
    target: "",
    competitors: "",
  };
}

/**
 * Get usage stats for an agent.
 */
export async function getAgentStats(tenantId: string): Promise<{
  totalMessages: number;
  totalTasksCompleted: number;
  filesInKnowledgeBase: number;
  activeSince: string;
}> {
  const files = await listKnowledgeFiles(tenantId);

  // Read from the database if available
  return {
    totalMessages: 0,
    totalTasksCompleted: 0,
    filesInKnowledgeBase: files.length,
    activeSince: new Date().toISOString(),
  };
}

/**
 * Get the total storage used by a tenant's uploads (in bytes).
 */
export async function getTenantStorageSize(tenantId: string): Promise<number> {
  const tenantDir = await getTenantDir(tenantId);
  const entries = await readdir(tenantDir, { withFileTypes: true });
  let totalSize = 0;

  for (const entry of entries) {
    if (entry.isFile()) {
      const { stat } = await import("node:fs/promises");
      const stats = await stat(join(tenantDir, entry.name));
      totalSize += stats.size;
    }
  }

  return totalSize;
}