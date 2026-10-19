import { NextResponse } from "next/server";
import { fetchPlanNames } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await fetchPlanNames();
    return NextResponse.json({ items });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Falha ao buscar planos", items: [] },
      { status: 500 }
    );
  }
}
