import { NextResponse } from "next/server";
import { warmupCache } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await warmupCache();
  return NextResponse.json(result);
}
