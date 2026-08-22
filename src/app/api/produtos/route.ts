export const runtime = 'nodejs';
import { NextResponse } from "next/server";
import { turso } from "../../../lib/db";

export async function GET() {
  try {
    await initDB();
    const rs = await db.execute("SELECT * FROM produtos ORDER BY id DESC");
    return NextResponse.json(rs.rows);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDB();
    const { nome, preco, qtd, imagem } = await req.json();
    const exist = await db.execute({ sql: "SELECT * FROM produtos WHERE nome =?", args: [nome] });
    if (exist.rows.length > 0) {
      const p: any = exist.rows[0];
      const novaQtd = Number(p.qtd) + Number(qtd);
      await db.execute({ sql: "UPDATE produtos SET qtd =?, preco =?, imagem =? WHERE id =?", args: [novaQtd, preco, imagem, p.id] });
      return NextResponse.json({ ok: true, qtd: novaQtd, somado: true });
    }
    await db.execute({ sql: "INSERT INTO produtos (nome, preco, qtd, imagem) VALUES (?,?,?,?)", args: [nome, preco, qtd, imagem] });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, qtd } = await req.json();
    await db.execute({ sql: "UPDATE produtos SET qtd =? WHERE id =?", args: [qtd, id] });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    await db.execute({ sql: "DELETE FROM produtos WHERE id =?", args: [id!] });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}