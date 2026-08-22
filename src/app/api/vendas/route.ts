export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { db, initDB } from "../../../lib/db";

export async function GET() {
  try {
    await initDB();

    const rs = await db.execute(
      "SELECT * FROM vendas ORDER BY id DESC"
    );

    return NextResponse.json(rs.rows);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDB();

    const { itens, total, pagamento, descricao } = await req.json();

    for (const item of itens) {
      await db.execute({
        sql: "UPDATE produtos SET qtd = qtd - ? WHERE id = ?",
        args: [item.cartQtd, item.id],
      });
    }

    await db.execute({
      sql: "INSERT INTO vendas (itens, total, pagamento, descricao) VALUES (?, ?, ?, ?)",
      args: [
        JSON.stringify(itens),
        total,
        pagamento,
        descricao || "",
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID da venda não informado" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "DELETE FROM vendas WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}