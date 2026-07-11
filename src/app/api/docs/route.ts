/** GET /api/docs — OpenAPI 3.1 specification for all CIRKLE Brain AI APIs. */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const { generateOpenAPISpec } = await import("@/lib/openapi-docs");
  const spec = generateOpenAPISpec();

  // If ?ui=true, return a simple Swagger UI HTML page.
  if (searchParams.get("ui") === "true") {
    const html = `<!DOCTYPE html>
<html><head><title>CIRKLE Brain AI — API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
window.onload = () => {
  SwaggerUIBundle({ url: "/api/docs", dom_id: "#swagger-ui" });
};
</script>
</body></html>`;
    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  }

  return NextResponse.json(spec, { headers: { "Cache-Control": "public, s-maxage=300" } });
}
