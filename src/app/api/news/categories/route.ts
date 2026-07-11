// @ts-nocheck
import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({ categories: ["breaking","local","sports","tech","business","health","entertainment"] });
}
