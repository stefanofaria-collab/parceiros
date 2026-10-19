import { NextRequest, NextResponse } from "next/server";
import { getPartnersTable } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const filters = parseFilters(req.nextUrl.searchParams);
    const data = await getPartnersTable(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar parceiros", items: [], total: 0 },
      { status: 500 }
    );
  }
}
