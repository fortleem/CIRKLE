/** GET /api/cie/graph — knowledge graph queries (stats, traversal, impact). */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { globalCIEEngine } = await import("@/lib/cie");
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "stats";

  if (action === "stats") {
    return NextResponse.json(globalCIEEngine.knowledgeGraph.getStats());
  }

  if (action === "nodes") {
    const type = searchParams.get("type");
    const nodes = type
      ? globalCIEEngine.knowledgeGraph.getNodesByType(type as never)
      : Array.from(globalCIEEngine.knowledgeGraph.getGraph().nodes.values());
    return NextResponse.json({
      count: nodes.length,
      nodes: nodes.map((n) => ({ nodeId: n.nodeId, type: n.type, label: n.label, entityId: n.entityId })),
    });
  }

  if (action === "traverse") {
    const fromNodeId = searchParams.get("from");
    const edgeType = searchParams.get("edgeType") as never;
    const maxDepth = parseInt(searchParams.get("maxDepth") || "10", 10);
    if (!fromNodeId) return NextResponse.json({ error: "from parameter required" }, { status: 400 });
    const reachable = globalCIEEngine.knowledgeGraph.traverse(fromNodeId, edgeType, maxDepth);
    return NextResponse.json({ fromNodeId, edgeType, reachable });
  }

  if (action === "impact") {
    const nodeId = searchParams.get("nodeId");
    if (!nodeId) return NextResponse.json({ error: "nodeId parameter required" }, { status: 400 });
    const impacted = globalCIEEngine.knowledgeGraph.getImpactedNodes(nodeId);
    return NextResponse.json({ nodeId, impactedNodes: impacted });
  }

  if (action === "country-capabilities") {
    const countryCode = searchParams.get("country");
    if (!countryCode) return NextResponse.json({ error: "country parameter required" }, { status: 400 });
    const capabilities = globalCIEEngine.knowledgeGraph.getCapabilitiesInCountry(countryCode);
    return NextResponse.json({ countryCode, capabilities });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
