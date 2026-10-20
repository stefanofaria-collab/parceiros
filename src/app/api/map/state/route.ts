import { NextRequest, NextResponse } from "next/server";
import { getMapStateDetail } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const uf = req.nextUrl.searchParams.get("uf") || "";
    const filters = parseFilters(req.nextUrl.searchParams);
    const data = await getMapStateDetail(filters, uf);
    if (!data) {
      return NextResponse.json(
        { error: "UF inválida" },
        { status: 400 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar detalhe do estado" },
      { status: 500 }
    );
  }
}
