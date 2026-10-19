import { NextRequest, NextResponse } from "next/server";
import { getExpirationsData } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const data = await getExpirationsData(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar vencimentos" },
      { status: 500 }
    );
  }
}
