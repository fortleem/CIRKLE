// @ts-nocheck
import { NextResponse } from "next/server";
import { getSupportedLanguages, isOfflineCapable } from "@/lib/translation-service";

/**
 * GET /api/translation/languages
 * Returns the curated list of supported languages plus the on-device
 * capability probe. The detection heuristic in `translation-service.ts`
 * works on any text — this list is just for UI selectors.
 *
 * Response shape:
 *   {
 *     languages: SupportedLanguage[],
 *     onDeviceCapable: boolean,
 *     defaultTarget: "ar"
 *   }
 */
export async function GET() {
  return NextResponse.json({
    languages: getSupportedLanguages(),
    onDeviceCapable: isOfflineCapable(),
    defaultTarget: "ar",
  });
}
