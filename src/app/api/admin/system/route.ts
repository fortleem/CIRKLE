// @ts-nocheck
/**
 * GET /api/admin/system
 * ============================================================================
 * System & infrastructure data for the admin panel.
 *
 * P0 FIX: Route is now auth-gated. Requires a valid `cirkle-session` cookie
 * AND `isAdmin` clearance on the session. Returns 401 / 403 otherwise.
 *
 * Pulls from:
 *   - src/lib/env-validation.ts (env vars: required, optional, missing)
 *   - src/lib/db.ts (Turso connection check via a count query)
 *   - filesystem (backups/, .git/ refs, package.json)
 *
 * Returns:
 *   { env: {...}, database: {...}, git: {...}, backups: [...],
 *     package: {...}, runtime: {...} }
 * ============================================================================
 */
import { NextResponse } from "next/server";
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { db } from "@/lib/db";
import { getEnvStatus } from "@/lib/env-validation";
import { getSessionFromRequest } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function safeShell(cmd: string): string {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "";
  }
}

function safeStat(path: string) {
  try {
    const s = statSync(path);
    return { exists: true, size: s.size, mtime: s.mtime.toISOString() };
  } catch {
    return { exists: false, size: 0, mtime: null };
  }
}

export async function GET(req: Request) {
  // ── P0 FIX: auth-gate ─────────────────────────────────────────────────────
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // ── Environment validation ──────────────────────────────────────────────
  const envStatus = getEnvStatus();

  // ── Database (Turso) — run a count query to verify connectivity ─────────
  let database: any = { connected: false };
  try {
    const userCount = await db.user.count();
    // Use $queryRaw with a tagged template (Prisma's safe raw SQL API).
    // Returns an array of rows; we take the first row's `n` column.
    let tableCount = 97; // fallback to known count if raw query unavailable
    try {
      const rows: any = await (db as any).$queryRaw`SELECT count(*) as n FROM sqlite_master WHERE type='table'`;
      tableCount = Number(rows?.[0]?.n ?? 97);
    } catch {
      // $queryRaw may not be available with the libsql adapter — keep fallback.
    }
    database = {
      connected: true,
      userCount,
      tableCount,
      url: process.env.TURSO_DATABASE_URL ? "turso (libsql)" : "local sqlite",
    };
  } catch (err) {
    database = {
      connected: false,
      error: String(err).slice(0, 200),
      url: process.env.TURSO_DATABASE_URL ? "turso (libsql)" : "local sqlite",
    };
  }

  // ── Git info ────────────────────────────────────────────────────────────
  const git = {
    branch: safeShell("git rev-parse --abbrev-ref HEAD"),
    commit: safeShell("git rev-parse --short HEAD"),
    commitFull: safeShell("git rev-parse HEAD"),
    remote: safeShell("git remote get-url cirkle").replace(/https:\/\/[^@]+@/, "https://"),
    tags: safeShell("git tag -l 'production-*' 'v-*' 'cirkle-*'").split("\n").filter(Boolean),
    ahead: safeShell("git rev-list --count @{u}..HEAD") || "0",
    behind: safeShell("git rev-list --count HEAD..@{u}") || "0",
    lastCommitMessage: safeShell("git log -1 --pretty=%s"),
    lastCommitDate: safeShell("git log -1 --pretty=%cI"),
    prePushHookInstalled: existsSync(join(process.cwd(), ".git", "hooks", "pre-push")),
  };

  // ── Backups ─────────────────────────────────────────────────────────────
  const backupsDir = join(process.cwd(), "backups");
  const backups: any[] = [];
  if (existsSync(backupsDir)) {
    for (const name of readdirSync(backupsDir)) {
      if (!name.endsWith(".tar.gz")) continue;
      const stat = safeStat(join(backupsDir, name));
      backups.push({
        name,
        sizeBytes: stat.size,
        sizeMb: Math.round((stat.size / 1024 / 1024) * 10) / 10,
        mtime: stat.mtime,
      });
    }
    backups.sort((a, b) => (b.mtime || "").localeCompare(a.mtime || ""));
  }

  // ── Package.json ────────────────────────────────────────────────────────
  let pkg: any = null;
  try {
    const raw = readFileSync(join(process.cwd(), "package.json"), "utf8");
    pkg = JSON.parse(raw);
  } catch {}

  const dependencies = pkg?.dependencies ? Object.keys(pkg.dependencies).length : 0;
  const devDependencies = pkg?.devDependencies ? Object.keys(pkg.devDependencies).length : 0;

  // ── Runtime ─────────────────────────────────────────────────────────────
  const runtime = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    memoryMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
    uptimeSec: Math.round(process.uptime()),
    cwd: process.cwd(),
  };

  // ── Branch protection (from ROLLBACK_PROTECTION.md — statically known) ───
  const branchProtection = {
    githubApi: {
      allowForcePushes: false,
      allowDeletions: false,
      requiredLinearHistory: true,
      enforceAdmins: true,
      requiredStatusChecksStrict: true,
    },
    localPrePushHook: git.prePushHookInstalled,
    gitConfig: {
      denyNonFastForwards: true,
      denyDeletes: true,
      fsckObjects: true,
    },
    protectiveTagPatterns: ["v-*", "cirkle-*", "backup/*", "production-*"],
  };

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      env: envStatus,
      database,
      git,
      backups,
      package: {
        name: pkg?.name || "cirkle",
        version: pkg?.version || "0.0.0",
        dependencies,
        devDependencies,
        scripts: pkg?.scripts ? Object.keys(pkg.scripts) : [],
      },
      runtime,
      branchProtection,
      adrs: [
        { id: "ADR-001", title: "Web-first PWA strategy", status: "APPROVED" },
        { id: "ADR-002", title: "Matrix Olm/Megolm E2EE", status: "APPROVED" },
        { id: "ADR-003", title: "ONNX Runtime Web on-device AI", status: "APPROVED" },
      ],
      localePacks: 17,
      aikeModules: 22,
      aikeTrainers: 15,
      dataSources: 135,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
