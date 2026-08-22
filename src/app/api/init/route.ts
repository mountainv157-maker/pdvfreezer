export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { turso } from "../../../lib/db";

export async function GET() {
  try {
    await initDB();
    return NextResponse.json({ ok: true, msg: "Banco criado" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}