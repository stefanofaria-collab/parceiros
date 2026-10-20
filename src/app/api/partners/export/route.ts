import { NextRequest, NextResponse } from "next/server";
import { getPartnersExport } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const items = await getPartnersExport(filters);
    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao exportar parceiros", items: [] },
      { status: 500 }
    );
  }
}
