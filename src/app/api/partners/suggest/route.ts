import { NextRequest, NextResponse } from "next/server";
import { fetchPartnerNames } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || undefined;
    const items = await fetchPartnerNames(q);
    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao buscar parceiros", items: [] },
      { status: 500 }
    );
  }
}
