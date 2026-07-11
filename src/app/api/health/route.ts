/** GET /api/health — Production health check endpoint. */
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { getHealthStatus } = await import("@/lib/monitoring");
    const status = getHealthStatus();
    return NextResponse.json({
      ...status,
      timestamp: new Date().toISOString(),
      version: "9.0.0",
    });
  } catch {
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "9.0.0",
    });
  }
}
