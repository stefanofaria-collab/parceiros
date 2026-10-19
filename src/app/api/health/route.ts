import { NextResponse } from "next/server";
import { checkConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await checkConnection();
  return NextResponse.json({ ok, mysql: ok ? "conectado" : "indisponível" });
}
