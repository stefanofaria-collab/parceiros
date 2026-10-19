import { NextRequest, NextResponse } from "next/server";
import { getPartnerClients } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = Number(params.id);
    if (!Number.isFinite(partnerId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const filters = parseFilters(req.nextUrl.searchParams);
    const data = await getPartnerClients(partnerId, filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao carregar clientes do parceiro" },
      { status: 500 }
    );
  }
}
