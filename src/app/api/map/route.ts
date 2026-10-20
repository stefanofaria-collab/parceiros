import { NextRequest, NextResponse } from "next/server";
import { getMapData } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const data = await getMapData(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar mapa", states: [], max: 0, total: 0 },
      { status: 500 }
    );
  }
}
