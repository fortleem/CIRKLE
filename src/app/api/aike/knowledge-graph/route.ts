// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalKnowledgeGraph } from "@/lib/autonomous-intelligence";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get("nodeId");
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (nodeId) {
      const node = globalKnowledgeGraph.getNode(nodeId);
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
      const neighbors = globalKnowledgeGraph.queryNeighbors(nodeId, 1, limit);
      return NextResponse.json({ node, neighbors });
    }

    if (query) {
      // Search by name — iterate over nodes and filter
      const q = query.toLowerCase();
      const results: any[] = [];
      for (const node of globalKnowledgeGraph.nodes.values()) {
        if (node.name.toLowerCase().includes(q)) {
          results.push(node);
          if (results.length >= limit) break;
        }
      }
      return NextResponse.json({ results, count: results.length });
    }

    // Return graph stats
    const stats = {
      nodes: globalKnowledgeGraph.nodes.size,
      edges: globalKnowledgeGraph.edges.size,
    };
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, node, edge, fromNodeId, toNodeId, maxHops } = body;

    if (action === "addNode" && node) {
      const nodeId = globalKnowledgeGraph.addNode(node);
      return NextResponse.json({ ok: true, nodeId });
    }

    if (action === "addEdge" && edge) {
      const edgeId = globalKnowledgeGraph.addEdge(edge);
      return NextResponse.json({ ok: true, edgeId });
    }

    if (action === "findPath" && fromNodeId && toNodeId) {
      const path = globalKnowledgeGraph.findPath(fromNodeId, toNodeId, maxHops || 5);
      return NextResponse.json({ path, found: path && path.length > 0 });
    }

    if (action === "findSimilar" && fromNodeId) {
      const similar = globalKnowledgeGraph.findSimilar(fromNodeId, { topK: limit || 10 });
      return NextResponse.json({ similar, count: similar.length });
    }

    return NextResponse.json(
      { error: "Invalid action. Use: addNode, addEdge, findPath, findSimilar" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
