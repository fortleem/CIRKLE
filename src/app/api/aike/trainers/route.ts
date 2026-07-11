// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { globalDomainLearningEngine, ALL_TRAINERS } from "@/lib/autonomous-intelligence";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    if (domain) {
      const trainer = globalDomainLearningEngine.getTrainer(domain);
      if (!trainer) {
        return NextResponse.json({ error: `Unknown domain: ${domain}` }, { status: 404 });
      }
      const knowledge = await trainer.getKnowledge();
      return NextResponse.json({ domain, knowledge });
    }

    const trainers = Object.keys(ALL_TRAINERS);
    const allKnowledge = await Promise.all(
      trainers.map(async (d) => {
        const trainer = globalDomainLearningEngine.getTrainer(d);
        const knowledge = trainer ? await trainer.getKnowledge() : null;
        return { domain: d, knowledge };
      }),
    );
    return NextResponse.json({ trainers: allKnowledge, count: allKnowledge.length });
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
    const { domain, events } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "Missing required field: domain" },
        { status: 400 },
      );
    }

    if (events && Array.isArray(events)) {
      globalDomainLearningEngine.queueEvents(domain, events);
      return NextResponse.json({
        ok: true,
        message: `Queued ${events.length} events for ${domain} domain training`,
      });
    }

    await globalDomainLearningEngine.trainDomain(domain);
    return NextResponse.json({
      ok: true,
      message: `Domain ${domain} trained`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String((error as Error)?.message || error) },
      { status: 500 },
    );
  }
}
