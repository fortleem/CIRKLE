/**
 * Family Vault — Blueprint §26.6.
 *
 * Encrypted, cloud-free family album. Each `VaultItem` is encrypted on the
 * client (AES-256-GCM via SubtleCrypto) with a key derived from the family
 * passphrase before upload — the server only ever stores ciphertext.
 *
 * Backs:
 *   • GET  /api/vault                  (list items by family)
 *   • POST /api/vault                  (upload encrypted item)
 *   • GET  /api/vault/family           (list families for a user)
 *   • POST /api/vault/family           (create a family)
 *
 * Storage: Prisma `FamilyVault` + `VaultItem` (SQLite). `members` on
 * `FamilyVault` is a JSON array of usernames.
 */
import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface VaultItem {
  id: string;
  familyId: string;
  type: "photo" | "video" | "document" | "note";
  title: string;
  encryptedData: string;
  uploadedBy: string;
  createdAt: string;
}

export interface FamilyVault {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
}

const VALID_TYPES = new Set(["photo", "video", "document", "note"]);

export interface CreateVaultItemInput {
  familyId: string;
  type: string;
  title: string;
  encryptedData: string;
  uploadedBy: string;
}

export interface CreateFamilyInput {
  name: string;
  members: string[];
  createdBy: string;
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

export async function createVaultItem(input: CreateVaultItemInput): Promise<VaultItem> {
  const familyId = input.familyId.trim();
  if (!familyId) throw new Error("familyId is required.");

  const type = input.type;
  if (!VALID_TYPES.has(type)) {
    throw new Error("type must be one of: photo, video, document, note.");
  }
  const title = input.title.trim();
  if (title.length < 1 || title.length > 120) {
    throw new Error("title must be 1–120 characters.");
  }
  const uploadedBy = normalizeUsername(input.uploadedBy);
  if (!uploadedBy) throw new Error("uploadedBy is required.");
  const encryptedData = input.encryptedData;
  if (!encryptedData || encryptedData.length < 1) {
    throw new Error("encryptedData is required.");
  }
  // Hard cap at 8 MB of ciphertext per item — protects the SQLite DB.
  if (encryptedData.length > 8 * 1024 * 1024) {
    throw new Error("encryptedData too large (max 8 MB).");
  }

  const family = await db.familyVault.findUnique({ where: { id: familyId } });
  if (!family) throw new Error("Family not found.");
  const members: string[] = (() => {
    try {
      const m = JSON.parse(family.members) as string[];
      return Array.isArray(m) ? m : [];
    } catch {
      return [];
    }
  })();
  if (!members.includes(uploadedBy)) {
    throw new Error("You are not a member of this family vault.");
  }

  const row = await db.vaultItem.create({
    data: {
      familyId,
      type,
      title,
      encryptedData,
      uploadedBy,
    },
  });
  logger.info("[vault] item uploaded", { id: row.id, familyId, type });
  return {
    id: row.id,
    familyId: row.familyId,
    type: row.type as VaultItem["type"],
    title: row.title,
    encryptedData: row.encryptedData,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listVaultItems(familyId: string): Promise<VaultItem[]> {
  const rows = await db.vaultItem.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id,
    familyId: r.familyId,
    type: r.type as VaultItem["type"],
    title: r.title,
    encryptedData: r.encryptedData,
    uploadedBy: r.uploadedBy,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createFamily(input: CreateFamilyInput): Promise<FamilyVault> {
  const name = input.name.trim();
  if (name.length < 1 || name.length > 80) {
    throw new Error("Family name must be 1–80 characters.");
  }
  const createdBy = normalizeUsername(input.createdBy);
  if (!createdBy) throw new Error("createdBy is required.");
  const members = Array.from(
    new Set([createdBy, ...input.members.map(normalizeUsername).filter(Boolean)]),
  );
  if (members.length > 50) {
    throw new Error("A family vault supports at most 50 members.");
  }

  const row = await db.familyVault.create({
    data: {
      name,
      members: JSON.stringify(members),
      createdBy,
    },
  });
  logger.info("[vault] family created", { id: row.id, name, members: members.length });
  return {
    id: row.id,
    name: row.name,
    members,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listFamilies(username: string): Promise<FamilyVault[]> {
  const user = normalizeUsername(username);
  if (!user) return [];
  const rows = await db.familyVault.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows
    .map((r) => {
      let members: string[] = [];
      try {
        const m = JSON.parse(r.members) as string[];
        if (Array.isArray(m)) members = m;
      } catch {
        members = [];
      }
      return {
        id: r.id,
        name: r.name,
        members,
        createdBy: r.createdBy,
        createdAt: r.createdAt.toISOString(),
      };
    })
    .filter((f) => f.members.includes(user));
}
